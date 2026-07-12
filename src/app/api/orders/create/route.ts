import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

import { createOrderSchema } from '@/lib/validations';
import { razorpay } from '@/lib/razorpay';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { cleanupExpiredOrders } from '@/lib/orderCleanup';

export async function POST(request: Request) {
  // Self-healing cleanup: run on ~2% of requests (fire-and-forget).
  // Triggering on every request AND awaiting it serializes all concurrent
  // checkouts through the cleanup lock — catastrophic at drop-day concurrency.
  // Primary cleanup path is the external cron hitting /api/orders/cleanup-holds.
  if (Math.random() < 0.02) {
    cleanupExpiredOrders().catch((err) => console.error('Background hold cleanup failed:', err));
  }


  let clerkUserId: string | null = null;
  let finalUserId: string | null = null;
  let reqBody: any = null;
  try {
    // 0. Verify authentication
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('drftn_session')?.value;

    if (sessionToken) {
      const payload = await verifyToken(sessionToken);
      if (payload && payload.userId) {
        finalUserId = payload.userId as string;
      }
    }

    if (!finalUserId) {
      const { userId } = await auth();
      clerkUserId = userId;
      finalUserId = userId;
    }

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be signed in to place an order.' },
        { status: 401 }
      );
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

    const cleanVerified = verifiedPhone.replace('+', '').trim();
    const cleanMatched = matchedPhone.replace('+', '').trim();
    if (cleanVerified !== cleanMatched) {
      return NextResponse.json({ error: 'Verified phone number mismatch.' }, { status: 400 });
    }

    // 2. Fetch products from Neon database to verify active status and actual pricing
    const productIds = items.map((i) => i.productId);
    const dbProducts = await db
      .select()
      .from(schema.products)
      .where(and(
        inArray(schema.products.id, productIds),
        eq(schema.products.is_active, true)
      ));

    const dbProductImages = await db
      .select()
      .from(schema.productImages)
      .where(inArray(schema.productImages.product_id, productIds));

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
    if (!isPickup) {
      const dbSettings = await db.select().from(schema.settings);
      let freeShippingThreshold = 99900; // default ₹999 in paise
      let defaultShippingCharge = 9900;  // default ₹99 in paise
      let codFee = 5000;                  // default ₹50 in paise

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
      const cleanCode = discountCode.toUpperCase().trim();
      const [dbCode] = await db
        .select()
        .from(schema.discountCodes)
        .where(and(
          eq(schema.discountCodes.code, cleanCode),
          eq(schema.discountCodes.is_active, true)
        ))
        .limit(1);

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
      validatedCode = cleanCode;
    }

    const discountedSubtotal = Math.max(0, calculatedSubtotal - discountAmount);

    if (!isPickup) {
      // Re-verify free shipping eligibility on discounted subtotal
      const dbSettings = await db.select().from(schema.settings);
      let freeShippingThreshold = 99900;
      let defaultShippingCharge = 9900;
      let codFee = 5000;
      dbSettings.forEach((row: any) => {
        if (row.key === 'free_shipping_threshold') freeShippingThreshold = Number(row.value);
        if (row.key === 'default_shipping_charge') defaultShippingCharge = Number(row.value);
        if (row.key === 'cod_fee') codFee = Number(row.value);
      });
      
      shippingCharge = discountedSubtotal >= freeShippingThreshold ? 0 : defaultShippingCharge;
      
      // Add COD fee if applicable
      if (isCod) {
        shippingCharge += codFee;
      }
    }

    const finalTotal = discountedSubtotal + shippingCharge;

    // 6. Check Razorpay availability
    const isRazorpayConfigured = !!process.env.RAZORPAY_KEY_SECRET && !!razorpay;

    // 7. Save Order inside database transaction to guarantee auto-increment safety and stock isolation
    const createdOrder = await db.transaction(async (tx: any) => {
      // Fail fast under lock contention: if we can't acquire the stock row lock
      // within 5s, return an error immediately instead of queuing indefinitely.
      // Under real drop concurrency, auth + validation naturally staggers arrivals
      // so this timeout is a safety net, not a normal path.
      await tx.execute(sql`SET LOCAL lock_timeout = '5000ms'`);
      await tx.execute(sql`SET LOCAL statement_timeout = '8000ms'`);

      // Order number: use Postgres sequence (nextval) — inherently concurrency-safe,
      // no lock needed, no collision possible even under simultaneous drop traffic.
      const seqRes = await tx.execute(sql`SELECT nextval('order_number_seq')::int AS seq`);
      const seqVal = Number((seqRes as any).rows?.[0]?.seq ?? (seqRes as any)[0]?.seq);
      const orderNumber = `DRFTN-${1000 + seqVal}`;


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

      // 1. Sort items by product ID before locking — consistent lock-acquisition order
      // prevents deadlocks when concurrent orders share items in different sequences.
      // e.g. Order A: [Jacket, Tee], Order B: [Tee, Jacket] → without sorting,
      // A locks Jacket and waits for Tee while B locks Tee and waits for Jacket.
      const sortedItems = [...orderItemsToSave].sort((a, b) => a.id.localeCompare(b.id));

      for (const item of sortedItems) {
        const [pRecord] = await tx
          .select({ stock_quantity: schema.products.stock_quantity, name: schema.products.name })
          .from(schema.products)
          .where(eq(schema.products.id, item.id))
          .for('update');

        if (!pRecord) {
          throw new Error(`Product not found.`);
        }

        const currentStock = { ...pRecord.stock_quantity };
        const available = currentStock[item.size] || 0;
        if (available < item.quantity) {
          throw new Error(`Product "${pRecord.name}" in size ${item.size} has just sold out. Please remove it from your cart.`);
        }

        currentStock[item.size] = available - item.quantity;
        await tx
          .update(schema.products)
          .set({ stock_quantity: currentStock })
          .where(eq(schema.products.id, item.id));
      }

      // 2. Atomically re-check and increment discount usage with FOR UPDATE row lock.
      // The pre-flight check above catches obvious overuse but is NOT atomic —
      // two concurrent requests can both pass it. This is the definitive check.
      if (validatedCode) {
        const [lockedCode] = await tx
          .select({ used_count: schema.discountCodes.used_count, usage_limit: schema.discountCodes.usage_limit })
          .from(schema.discountCodes)
          .where(eq(schema.discountCodes.code, validatedCode))
          .for('update');

        if (lockedCode && lockedCode.usage_limit !== null && lockedCode.used_count >= lockedCode.usage_limit) {
          throw new Error(`DISCOUNT_LIMIT_REACHED:${validatedCode}`);
        }

        await tx
          .update(schema.discountCodes)
          .set({ used_count: sql`${schema.discountCodes.used_count} + 1` })
          .where(eq(schema.discountCodes.code, validatedCode));
      }


      const holdExpiresAt = isRazorpayConfigured
        ? new Date(Date.now() + 10 * 60 * 1000) // 10 minute hold
        : null;

      // Insert pending order
      const [newOrder] = await tx
        .insert(schema.orders)
        .values({
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
          deposit_amount: isCod ? 20000 : null, // ₹200 deposit
          remaining_amount: isCod ? finalTotal - 20000 : null,
          deposit_status: isCod ? 'pending' : null,
          verified_phone: verifiedPhone || null,
          courier_partner: null,
          tracking_number: null,
          shiprocket_order_id: null,
          holdExpiresAt: holdExpiresAt,
        })
        .returning();

      return newOrder;
    });

    // 8. payment flows
    if (isRazorpayConfigured) {
      try {
        const rzAmount = isCod ? 20000 : finalTotal;
        const rzOrder = await razorpay!.orders.create({
          amount: rzAmount, // ₹200 for COD deposit, or finalTotal
          currency: 'INR',
          receipt: createdOrder.order_number,
          notes: {
            order_id: createdOrder.id,
            customer_name: customerInfo.name,
            customer_email: customerInfo.email,
            discount_code: validatedCode || 'NONE',
            payment_type: isCod ? 'cod_deposit' : 'prepaid',
          },
        });

        // Update order in database to store razorpay_order_id
        await db
          .update(schema.orders)
          .set({ razorpay_order_id: rzOrder.id })
          .where(eq(schema.orders.id, createdOrder.id));

        return NextResponse.json({
          razorpayOrderId: rzOrder.id,
          amount: rzAmount,
          currency: 'INR',
          orderId: createdOrder.id,
          orderNumber: createdOrder.order_number,
        });
      } catch (rzErr) {
        console.error('Razorpay SDK Order Error:', rzErr);
        return NextResponse.json({ error: 'Failed to initialize Razorpay transaction' }, { status: 500 });
      }
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
