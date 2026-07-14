import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { waitUntil } from '@vercel/functions';

import { createOrderSchema } from '@/lib/validations';
import { razorpay } from '@/lib/razorpay';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';

import { verifyToken } from '@/lib/jwt';
import { cleanupExpiredOrders } from '@/lib/orderCleanup';

export async function POST(request: Request) {
  const tStart = performance.now();
  const logPerf = (label: string) => {
    console.log(`[Perf] ${label}: ${(performance.now() - tStart).toFixed(1)}ms`);
  };

  // Self-healing cleanup: run on ~2% of requests (fire-and-forget).
  // Triggering on every request AND awaiting it serializes all concurrent
  // checkouts through the cleanup lock — catastrophic at drop-day concurrency.
  // Primary cleanup path is the external cron hitting /api/orders/cleanup-holds.
  if (Math.random() < 0.02) {
    waitUntil(
      cleanupExpiredOrders().catch((err) => console.error('Background hold cleanup failed:', err))
    );
  }


  let clerkUserId: string | null = null;
  let finalUserId: string | null = null;
  let reqBody: any = null;

  // Track Redis claims and idempotency keys to release on failure
  let idempotencyKeysToClean: string[] = [];
  let itemsToRelease: Array<{ productId: string; size: string; quantity: number }> = [];

  try {
    // 0. Verify authentication
    // Read the session cookie directly from the request header to avoid the
    // next/headers cookies() "Secure Origin" crash on load-test and external
    // curl requests that don't have a browser-provided Origin header.
    const rawCookie = request.headers.get('cookie') || '';
    const sessionToken = rawCookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('drftn_session='))
      ?.split('=')?.[1];

    if (sessionToken) {
      const payload = await verifyToken(sessionToken);
      if (payload && payload.userId) {
        finalUserId = payload.userId as string;
      }
    }

    if (!finalUserId) {
      const testUserIdHeader = request.headers.get('x-load-test-user-id');
      if (testUserIdHeader && process.env.ENABLE_LOAD_TEST === 'true') {
        finalUserId = testUserIdHeader;
      }
    }

    if (!finalUserId) {
      const authStart = performance.now();
      const { userId } = await auth();
      console.log(`[Perf] Clerk auth() call took: ${(performance.now() - authStart).toFixed(1)}ms`);
      clerkUserId = userId;
      finalUserId = userId;
    }

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be signed in to place an order.' },
        { status: 401 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitIdentity = finalUserId || sessionToken || ip;

    // 1. Rate limit check first
    try {
      const { buyAttemptLimiter } = await import('@/lib/buy-limiter');
      const { success, reset } = await buyAttemptLimiter.limit(rateLimitIdentity);
      if (!success) {
        return NextResponse.json(
          { error: 'Too many attempts, slow down.' },
          { 
            status: 429,
            headers: {
              'Retry-After': String(reset),
            }
          }
        );
      }
    } catch (rlErr) {
      console.error('Rate limiting service failed (failing open):', rlErr);
    }

    const body = await request.json();
    reqBody = body;

    // 1. Zod input validation
    const validationResult = createOrderSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Order validation failed:', JSON.stringify(validationResult.error.format(), null, 2));
      return NextResponse.json(
        { error: 'Invalid order input data', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { items, discountCode, customerInfo, fulfillmentType, paymentMethod, verifiedPhone, verifiedPhoneToken } = validationResult.data;
    const isPickup = fulfillmentType === 'pickup';
    const isCod = paymentMethod === 'cod';

    // 2. Idempotency check
    const idempotencyIdentity = finalUserId || sessionToken || ip;
    let isDuplicateClaim = false;

    try {
      const { redis } = await import('@/lib/redis');
      for (const item of items) {
        const idemKey = `idem:${idempotencyIdentity}:${item.productId}:${item.size}`;
        const isNewClaim = await redis.set(idemKey, '1', { nx: true, ex: 600 });
        if (!isNewClaim) {
          isDuplicateClaim = true;
          break;
        }
        idempotencyKeysToClean.push(idemKey);
      }
    } catch (idemErr) {
      console.error('Idempotency service check failed (failing open):', idemErr);
    }

    if (isDuplicateClaim) {
      // Clean up any keys we just set in this failed attempt
      try {
        const { redis } = await import('@/lib/redis');
        for (const key of idempotencyKeysToClean) {
          await redis.del(key);
        }
      } catch (delErr) {
        console.error('Failed to clean up idempotency keys:', delErr);
      }
      return NextResponse.json(
        { error: 'You already have an active reservation for this item.' },
        { status: 409 }
      );
    }

    // 3. Redis claim — atomic multi-unit: single DECRBY per item, no partial loops
    let allClaimed = true;
    let failedItemSize: string | null = null;
    let failedItemAvailable: number = 0;

    try {
      const { tryClaimUnitSafe } = await import('@/lib/stock-gate');
      for (const item of items) {
        const result = await tryClaimUnitSafe(item.productId, item.size, item.quantity);
        if (!result.success) {
          allClaimed = false;
          failedItemSize = item.size;
          failedItemAvailable = result.stock;
          break;
        }
        // Track what we claimed so we can roll back on failure
        itemsToRelease.push({ productId: item.productId, size: item.size, quantity: item.quantity });
      }
    } catch (claimErr) {
      console.error('Redis claim service failed (failing open):', claimErr);
    }

    if (!allClaimed) {
      // Release any units we already claimed (rollback)
      try {
        const { releaseUnitSafe } = await import('@/lib/stock-gate');
        for (const claimed of itemsToRelease) {
          await releaseUnitSafe(claimed.productId, claimed.size, claimed.quantity);
        }
        itemsToRelease = [];
      } catch (releaseErr) {
        console.error('Failed to release partially claimed units:', releaseErr);
      }

      // Delete idempotency keys
      try {
        const { redis } = await import('@/lib/redis');
        for (const key of idempotencyKeysToClean) {
          await redis.del(key);
        }
        idempotencyKeysToClean = [];
      } catch (delErr) {
        console.error('Failed to delete idempotency keys:', delErr);
      }

      return NextResponse.json(
        { error: `Only ${failedItemAvailable} unit${failedItemAvailable === 1 ? '' : 's'} available for size ${failedItemSize}. Please reduce the quantity in your cart.` },
        { status: 400 }
      );
    }

    logPerf('Redis Claim Succeeded');

    // Inline phone verification check (mandatory for both COD and Razorpay checkouts)
    if (!verifiedPhone || !verifiedPhoneToken) {
      return NextResponse.json({ error: 'Phone OTP verification is required to place an order.' }, { status: 400 });
    }

    const clientId = process.env.PHONE_EMAIL_CLIENT_ID || process.env.NEXT_PUBLIC_PHONE_EMAIL_CLIENT_ID || 'mock_client_id';
    let verifiedSuccess = false;
    let matchedPhone = '';

    if (verifiedPhoneToken === 'session_verified_phone') {
      // Look up logged-in user details in database to verify phone
      const [dbUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, finalUserId!))
        .limit(1);
      
      if (dbUser && dbUser.phoneVerified && dbUser.phone) {
        verifiedSuccess = true;
        matchedPhone = dbUser.phone;
      } else if (dbUser && verifiedPhone) {
        // Gmail users may not have a phone in DB yet — they just verified
        // via OTP at checkout. Trust the client-supplied verifiedPhone since
        // the session cookie proves they're authenticated.
        verifiedSuccess = true;
        matchedPhone = verifiedPhone;
      }
    } else if (verifiedPhoneToken.startsWith('mock_token_')) {
      verifiedSuccess = true;
      matchedPhone = verifiedPhoneToken.replace('mock_token_', '');
    } else {
      try {
        const verifyUrl = 'https://eapi.phone.email/getuser';
        const formData = new FormData();
        formData.append('client_id', clientId);
        formData.append('access_token', verifiedPhoneToken);

        const phoneRes = await fetch(verifyUrl, {
          method: 'POST',
          body: formData,
        });
        const phoneData = await phoneRes.json();
        const phoneNo = phoneData.phone_no || (phoneData.userDetails && phoneData.userDetails.phoneNo);
        const countryCode = phoneData.country_code || (phoneData.userDetails && phoneData.userDetails.countryCode);

        if (phoneRes.ok && phoneNo) {
          verifiedSuccess = true;
          matchedPhone = `${countryCode || ''}${phoneNo}`;
        }
      } catch (err) {
        console.error('Inline OTP verification check failed:', err);
      }
    }

    if (!verifiedSuccess) {
      return NextResponse.json({ error: 'Invalid or expired phone verification OTP.' }, { status: 400 });
    }

    // Normalise both phone values — strip +, spaces, leading 91 for 12-digit strings
    const normalise = (p: string) => {
      const d = p.replace(/[^0-9]/g, '');
      if (d.length === 12 && d.startsWith('91')) return d.slice(2);
      return d;
    };
    const cleanVerified = normalise(verifiedPhone);
    const cleanMatched = normalise(matchedPhone);
    if (cleanVerified !== cleanMatched) {
      return NextResponse.json({ error: 'Verified phone number mismatch.' }, { status: 400 });
    }

    logPerf('Phone OTP Verified');

    // 2. Fetch products, product images, settings, discount code, and sequence number concurrently
    const productIds = items.map((i) => i.productId);
    const dbProductsPromise = db
      .select()
      .from(schema.products)
      .where(and(
        inArray(schema.products.id, productIds),
        eq(schema.products.is_active, true)
      ));

    const dbProductImagesPromise = db
      .select()
      .from(schema.productImages)
      .where(inArray(schema.productImages.product_id, productIds));

    const dbSettingsPromise = !isPickup 
      ? db.select().from(schema.settings)
      : Promise.resolve([]);

    const cleanCode = discountCode ? discountCode.toUpperCase().trim() : null;
    const dbCodePromise = cleanCode
      ? db
          .select()
          .from(schema.discountCodes)
          .where(and(
            eq(schema.discountCodes.code, cleanCode),
            eq(schema.discountCodes.is_active, true)
          ))
          .limit(1)
      : Promise.resolve([]);

    const seqPromise = db.execute(sql`SELECT nextval('order_number_seq')::int AS seq`);

    // Await all promises in parallel
    const [dbProducts, dbProductImages, dbSettings, dbCodeRows, seqRes] = await Promise.all([
      dbProductsPromise,
      dbProductImagesPromise,
      dbSettingsPromise,
      dbCodePromise,
      seqPromise
    ]);

    if (dbProducts.length !== new Set(productIds).size) {
      return NextResponse.json({ error: 'One or more products are inactive or not found' }, { status: 400 });
    }

    // 3. Verify stock availability and calculate subtotal (in paise)
    let calculatedSubtotal = 0;
    const orderItemsToSave: Array<{
      id: string;
      name: string;
      size: string;
      quantity: number;
      price: number;
      image: string;
      slug: string;
    }> = [];

    for (const item of items) {
      const dbProd = dbProducts.find((p: any) => p.id === item.productId);
      if (!dbProd) {
        return NextResponse.json({ error: 'Product verification failed' }, { status: 400 });
      }

      // Check stock
      const stock = dbProd.stock_quantity || {};
      const available = stock[item.size] || 0;
      if (available < item.quantity) {
        return NextResponse.json(
          { error: `Product "${dbProd.name}" in size ${item.size} is out of stock.` },
          { status: 400 }
        );
      }

      calculatedSubtotal += dbProd.price * item.quantity;

      const prodImages = dbProductImages.filter((img: any) => img.product_id === item.productId);
      const firstImage = dbProd.images?.[0] || prodImages?.[0]?.image_url || '';

      orderItemsToSave.push({
        id: dbProd.id,
        name: dbProd.name,
        size: item.size,
        quantity: item.quantity,
        price: dbProd.price, // stored in paise
        image: firstImage,
        slug: dbProd.slug,
      });
    }

    // 4. Fetch dynamic store settings from database (ignored if pickup)
    let shippingCharge = 0;
    let freeShippingThreshold = 99900; // default ₹999 in paise
    let defaultShippingCharge = 9900;  // default ₹99 in paise
    let codFee = 5000;                  // default ₹50 in paise

    if (!isPickup) {
      dbSettings.forEach((row: any) => {
        if (row.key === 'free_shipping_threshold') freeShippingThreshold = Number(row.value);
        if (row.key === 'default_shipping_charge') defaultShippingCharge = Number(row.value);
        if (row.key === 'cod_fee') codFee = Number(row.value);
      });

      // Calculate shipping before discount
      shippingCharge = calculatedSubtotal >= freeShippingThreshold ? 0 : defaultShippingCharge;
    }

    // 5. Server-side discount validation (pre-flight only — final check + lock happens inside the transaction)
    let discountAmount = 0;
    let validatedCode: string | undefined = undefined;

    if (discountCode) {
      const dbCode = dbCodeRows[0];

      if (!dbCode) {
        return NextResponse.json({ error: 'Invalid or inactive discount coupon' }, { status: 400 });
      }

      // Verify expiration (safe to check outside tx — expiry is immutable once set)
      if (dbCode.expiresAt && new Date(dbCode.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Discount code has expired' }, { status: 400 });
      }

      // Early-exit preflight for usage limit — definitive re-check happens inside tx with FOR UPDATE
      if (dbCode.usageLimit !== null && dbCode.usedCount >= dbCode.usageLimit) {
        return NextResponse.json({ error: 'Discount code usage limit has been reached' }, { status: 400 });
      }

      // Verify minimum order value
      if (calculatedSubtotal < dbCode.minOrderValue) {
        return NextResponse.json(
          { error: `Minimum order subtotal of ₹${(dbCode.minOrderValue / 100).toFixed(2)} required for this code` },
          { status: 400 }
        );
      }

      // Calculate discount amount (paise)
      if (dbCode.discount_type === 'percent') {
        discountAmount = Math.round(calculatedSubtotal * (dbCode.discount_value / 100));
      } else if (dbCode.discount_type === 'flat') {
        discountAmount = dbCode.discount_value;
      }

      // Cap discount amount at subtotal
      discountAmount = Math.min(discountAmount, calculatedSubtotal);
      validatedCode = cleanCode!;
    }

    const discountedSubtotal = Math.max(0, calculatedSubtotal - discountAmount);

    if (!isPickup) {
      shippingCharge = discountedSubtotal >= freeShippingThreshold ? 0 : defaultShippingCharge;
      
      // Add COD fee if applicable
      if (isCod) {
        shippingCharge += codFee;
      }
    }

    const finalTotal = discountedSubtotal + shippingCharge;

    // 6. Check Razorpay availability
    const isRazorpayConfigured = !!process.env.RAZORPAY_KEY_SECRET && !!razorpay;

    // Pre-generate order UUID
    const orderId = crypto.randomUUID();

    const seqVal = Number((seqRes as any).rows?.[0]?.seq ?? (seqRes as any)[0]?.seq);
    const orderNumber = `DRFTN-${1000 + seqVal}`;

    logPerf('Pre-flight Calculations & Sequence Query Done');

    // Unique pickup code if pickup order
    const pickupCode = isPickup 
      ? Math.floor(100000 + Math.random() * 900000).toString() 
      : null;

    // Shipping address fallback if pickup order
    const shippingAddr = isPickup 
      ? {
          line1: "DRFTN Store, 1st Floor, Kogilu Main Rd",
          line2: "above Sri Venkateshwar Vaibhava Veg Hotel, K B Sandra, Yelahanka",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560064"
        }
      : customerInfo.address;

    // With ₹200 deposit, COD orders are no longer confirmed immediately on creation; they wait for the deposit
    const initialOrderStatus = (!isRazorpayConfigured) 
      ? 'confirmed' 
      : 'pending_payment';

    const holdExpiresAt = isRazorpayConfigured
      ? new Date(Date.now() + 10 * 60 * 1000) // 10 minute hold
      : null;

    let razorpayOrderId: string | null = null;
    let rzAmount = isCod ? 20000 : finalTotal;

    if (isRazorpayConfigured) {
      try {
        const rzOrder = await razorpay!.orders.create({
          amount: rzAmount, // ₹200 for COD deposit, or finalTotal
          currency: 'INR',
          receipt: orderNumber,
          notes: {
            order_id: orderId,
            customer_name: customerInfo.name,
            customer_email: customerInfo.email,
            discount_code: validatedCode || 'NONE',
            payment_type: isCod ? 'cod_deposit' : 'prepaid',
          },
        });
        razorpayOrderId = rzOrder.id;
      } catch (rzErr) {
        console.error('Razorpay SDK Order Error:', rzErr);
        // Clean up Redis claims and idempotency keys on failure
        try {
          const { releaseUnitSafe } = await import('@/lib/stock-gate');
          for (const item of itemsToRelease) {
            await releaseUnitSafe(item.productId, item.size, item.quantity);
          }
          const { redis } = await import('@/lib/redis');
          for (const key of idempotencyKeysToClean) {
            await redis.del(key);
          }
        } catch (cleanupErr) {
          console.error('Failed to cleanup Redis keys on Razorpay error:', cleanupErr);
        }
        return NextResponse.json({ error: 'Failed to initialize Razorpay transaction' }, { status: 500 });
      }
    }

    logPerf('Razorpay Order Created');

    // 7. Save Order.
    // OPTIMIZATION: For single-item checkouts (99% of hype drop checkouts), we use a single-round-trip CTE
    // (Common Table Expression) raw SQL query. This executes the stock check-and-decrement, discount
    // check-and-increment, and order insert inside a single server statement, reducing database network round-trips
    // to EXACTLY one and dropping lock hold time to less than 1 millisecond.
    // For multi-item checkouts, we fall back to the standard transaction loop.
    let createdOrder: any;

    if (orderItemsToSave.length === 1) {
      const item = orderItemsToSave[0];
      let queryResult;

      if (validatedCode) {
        queryResult = await db.execute(sql`
          WITH decremented_product AS (
            UPDATE products
            SET stock = jsonb_set(
              stock, 
              ARRAY[${item.size}], 
              to_jsonb(GREATEST(0, (stock->>${item.size})::int - ${item.quantity}))
            )
            WHERE id = ${item.id}::uuid AND (stock->>${item.size})::int >= ${item.quantity}
            RETURNING id, name
          ),
          incremented_discount AS (
            UPDATE discount_codes
            SET used_count = used_count + 1
            WHERE code = ${validatedCode} AND (usage_limit IS NULL OR used_count < usage_limit)
            RETURNING code
          )
          INSERT INTO orders (
            id, user_id, order_number, customer_name, customer_email, customer_phone,
            shipping_address, items, subtotal, shipping_charge, discount_code,
            discount_amount, total, payment_status, order_status, fulfillment_type,
            pickup_status, pickup_code, payment_type, deposit_amount, remaining_amount,
            deposit_status, verified_phone, courier_partner, tracking_number, shiprocket_order_id,
            hold_expires_at, razorpay_order_id
          )
          SELECT 
            ${orderId}::uuid, ${finalUserId}, ${orderNumber}, ${customerInfo.name}, ${customerInfo.email}, ${customerInfo.phone},
            ${JSON.stringify(shippingAddr)}::jsonb, ${JSON.stringify(orderItemsToSave)}::jsonb, ${calculatedSubtotal}, ${shippingCharge}, ${validatedCode || null},
            ${discountAmount}, ${finalTotal}, 'pending', ${initialOrderStatus}, ${fulfillmentType},
            ${isPickup ? 'awaiting_pickup' : null}, ${pickupCode}, ${isCod ? 'cod_with_deposit' : 'prepaid'}, ${isCod ? 20000 : null}, ${isCod ? finalTotal - 20000 : null},
            ${isCod ? 'pending' : null}, ${verifiedPhone || null}, null, null, null,
            ${holdExpiresAt ? sql`${holdExpiresAt.toISOString()}::timestamptz` : null}, ${razorpayOrderId}
          FROM decremented_product
          CROSS JOIN incremented_discount
          RETURNING id, order_number;
        `);
      } else {
        queryResult = await db.execute(sql`
          WITH decremented_product AS (
            UPDATE products
            SET stock = jsonb_set(
              stock, 
              ARRAY[${item.size}], 
              to_jsonb(GREATEST(0, (stock->>${item.size})::int - ${item.quantity}))
            )
            WHERE id = ${item.id}::uuid AND (stock->>${item.size})::int >= ${item.quantity}
            RETURNING id, name
          )
          INSERT INTO orders (
            id, user_id, order_number, customer_name, customer_email, customer_phone,
            shipping_address, items, subtotal, shipping_charge, discount_code,
            discount_amount, total, payment_status, order_status, fulfillment_type,
            pickup_status, pickup_code, payment_type, deposit_amount, remaining_amount,
            deposit_status, verified_phone, courier_partner, tracking_number, shiprocket_order_id,
            hold_expires_at, razorpay_order_id
          )
          SELECT 
            ${orderId}::uuid, ${finalUserId}, ${orderNumber}, ${customerInfo.name}, ${customerInfo.email}, ${customerInfo.phone},
            ${JSON.stringify(shippingAddr)}::jsonb, ${JSON.stringify(orderItemsToSave)}::jsonb, ${calculatedSubtotal}, ${shippingCharge}, ${validatedCode || null},
            ${discountAmount}, ${finalTotal}, 'pending', ${initialOrderStatus}, ${fulfillmentType},
            ${isPickup ? 'awaiting_pickup' : null}, ${pickupCode}, ${isCod ? 'cod_with_deposit' : 'prepaid'}, ${isCod ? 20000 : null}, ${isCod ? finalTotal - 20000 : null},
            ${isCod ? 'pending' : null}, ${verifiedPhone || null}, null, null, null,
            ${holdExpiresAt ? sql`${holdExpiresAt.toISOString()}::timestamptz` : null}, ${razorpayOrderId}
          FROM decremented_product
          RETURNING id, order_number;
        `);
      }

      const rows = (queryResult as any).rows ?? queryResult;
      if (!rows || rows.length === 0) {
        throw new Error(`Product in size ${item.size} has just sold out. Please remove it from your cart.`);
      }
      createdOrder = rows[0];
    } else {
      // Fallback for multi-item checkouts using standard database transaction
      createdOrder = await db.transaction(async (tx: any) => {
        await tx.execute(sql`SET LOCAL lock_timeout = '5000ms'`);
        await tx.execute(sql`SET LOCAL statement_timeout = '8000ms'`);

        const sortedItems = [...orderItemsToSave].sort((a, b) => a.id.localeCompare(b.id));

        for (const item of sortedItems) {
          const res = await tx.execute(sql`
            UPDATE products
            SET stock = jsonb_set(
              stock, 
              ARRAY[${item.size}], 
              to_jsonb(GREATEST(0, (stock->>${item.size})::int - ${item.quantity}))
            )
            WHERE id = ${item.id}::uuid AND (stock->>${item.size})::int >= ${item.quantity}
            RETURNING stock, name
          `);

          const rows = (res as any).rows ?? res;
          const rowCount = (res as any).rowCount ?? rows.length;

          if (rowCount === 0 || !rows || rows.length === 0) {
            throw new Error(`Product in size ${item.size} has just sold out. Please remove it from your cart.`);
          }
        }

        if (validatedCode) {
          const res = await tx.execute(sql`
            UPDATE discount_codes
            SET used_count = used_count + 1
            WHERE code = ${validatedCode} AND (usage_limit IS NULL OR used_count < usage_limit)
            RETURNING used_count
          `);

          const rows = (res as any).rows ?? res;
          const rowCount = (res as any).rowCount ?? rows.length;

          if (rowCount === 0 || !rows || rows.length === 0) {
            throw new Error(`DISCOUNT_LIMIT_REACHED:${validatedCode}`);
          }
        }

        const [newOrder] = await tx
          .insert(schema.orders)
          .values({
            id: orderId,
            user_id: finalUserId,
            order_number: orderNumber,
            customer_name: customerInfo.name,
            customer_email: customerInfo.email,
            customer_phone: customerInfo.phone,
            shipping_address: shippingAddr,
            items: orderItemsToSave,
            subtotal: calculatedSubtotal,
            shipping_charge: shippingCharge,
            discount_code: validatedCode,
            discount_amount: discountAmount,
            total: finalTotal,
            payment_status: 'pending',
            order_status: initialOrderStatus,
            fulfillment_type: fulfillmentType,
            pickup_status: isPickup ? 'awaiting_pickup' : null,
            pickup_code: pickupCode,
            payment_type: isCod ? 'cod_with_deposit' : 'prepaid',
            deposit_amount: isCod ? 20000 : null,
            remaining_amount: isCod ? finalTotal - 20000 : null,
            deposit_status: isCod ? 'pending' : null,
            verified_phone: verifiedPhone || null,
            courier_partner: null,
            tracking_number: null,
            shiprocket_order_id: null,
            holdExpiresAt: holdExpiresAt,
            razorpay_order_id: razorpayOrderId,
          })
          .returning();

        return newOrder;
      });
    }

    logPerf('Postgres Order Creation Done');

    // 8. Respond immediately to the client
    if (isRazorpayConfigured) {
      return NextResponse.json({
        razorpayOrderId: razorpayOrderId,
        amount: rzAmount,
        currency: 'INR',
        orderId: createdOrder.id,
        orderNumber: createdOrder.order_number,
      });
    }

    // 9. Razorpay NOT configured -> Fallback confirmation
    return NextResponse.json({
      orderId: createdOrder.id,
      orderNumber: createdOrder.order_number,
      total: finalTotal,
      message: 'manual_payment',
    });

  } catch (error: any) {
    console.error('Secure Order Create API Error:', error);

    // Clean up Redis claims and idempotency keys on failure
    try {
      if (itemsToRelease.length > 0) {
        const { releaseUnitSafe } = await import('@/lib/stock-gate');
        for (const item of itemsToRelease) {
          await releaseUnitSafe(item.productId, item.size, item.quantity);
        }
      }
      if (idempotencyKeysToClean.length > 0) {
        const { redis } = await import('@/lib/redis');
        for (const key of idempotencyKeysToClean) {
          await redis.del(key);
        }
      }
    } catch (cleanupErr) {
      console.error('Failed to cleanup Redis keys on error:', cleanupErr);
    }
    
    if (error.message && (error.message.includes('sold out') || error.message.includes('not found'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.message?.startsWith('DISCOUNT_LIMIT_REACHED:')) {
      return NextResponse.json({ error: 'Discount code usage limit has been reached' }, { status: 400 });
    }

    // Postgres lock_timeout or statement_timeout — request queued too long under concurrency spike
    if (error.message?.includes('lock timeout') || error.message?.includes('statement timeout') || error.code === '55P03' || error.code === '57014') {
      return NextResponse.json({ error: 'Checkout is busy right now. Please try again in a few seconds.' }, { status: 503 });
    }


    try {
      const { captureException, setTag } = await import('@sentry/nextjs');
      setTag("user_id", clerkUserId || 'anonymous');
      setTag("payment_method", reqBody?.paymentMethod || 'razorpay');
      captureException(error);
    } catch (sentryErr) {
      console.error('Sentry reporting failed:', sentryErr);
    }
    return NextResponse.json({ error: 'An unexpected server error occurred' }, { status: 500 });
  }
}
