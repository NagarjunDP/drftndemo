import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { verifyPaymentSchema } from '@/lib/validations';
import { auth } from '@clerk/nextjs/server';
import { razorpay } from '@/lib/razorpay';

import { sendRefundEmail, sendOrderSuccessEmail, sendDepositConfirmationEmail } from '@/lib/email';

const MAKE_WHATSAPP_WEBHOOK = process.env.MAKE_WEBHOOK_URL || '';


export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  let reqBody: any = null;

  try {
    // 0. Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be signed in to verify payment.' },
        { status: 401 }
      );
    }
    const body = await request.json();
    reqBody = body;

    // 1. Zod input validation
    const validationResult = verifyPaymentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid payment verification details' }, { status: 400 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validationResult.data;
    const orderId = body.orderId;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID reference' }, { status: 400 });
    }

    // Validate orderId as a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID format' }, { status: 400 });
    }

    // 2. Fetch order from Neon DB
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 3. Prevent double processing
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        orderNumber: order.order_number,
        message: 'Order already processed',
      });
    }

    // 4. Verify Razorpay Signature
    const isMockOrder = razorpay_order_id.startsWith('order_mock_');
    const secret = process.env.RAZORPAY_KEY_SECRET;
    let paymentAmountVerified = true;

    if (!isMockOrder) {
      if (!secret) {
        console.error('RAZORPAY_KEY_SECRET is missing in environment variables');
        return NextResponse.json({ error: 'Gateway configuration error' }, { status: 500 });
      }

      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(text)
        .digest('hex');

      let isValid = false;
      try {
        isValid = crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'utf-8'),
          Buffer.from(razorpay_signature, 'utf-8')
        );
      } catch (err) {
        isValid = false;
      }

      if (!isValid) {
        console.warn(`[FRAUD ALERT] Mismatch signature! IP: ${ip}, Order: ${orderId}, Time: ${new Date().toISOString()}`);
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
      }

      // Fetch payment from Razorpay API directly to prevent amount tampering
      try {
        const { razorpay } = await import('@/lib/razorpay');
        if (razorpay) {
          const rzPayment = await razorpay.payments.fetch(razorpay_payment_id);
          // compare in paise
          const expectedAmount = order.payment_type === 'cod_with_deposit' ? 20000 : order.total;
          if (rzPayment.amount !== expectedAmount) {
            console.error(`[FRAUD ALERT] Razorpay payment amount ${rzPayment.amount} does not match expected total ${expectedAmount}! IP: ${ip}, Order: ${order.order_number}`);
            paymentAmountVerified = false;
          }
        }
      } catch (err) {
        console.error('Failed to fetch Razorpay payment entity:', err);
        return NextResponse.json({ error: 'Failed to verify payment amount with gateway' }, { status: 400 });
      }
    } else {
      console.log(`Bypassing signature validation for Mock Order: ${razorpay_order_id}`);
    }

    if (!paymentAmountVerified) {
      // Release stock back and flag order as payment_mismatch
      await db.transaction(async (tx: any) => {
        const [oRecord] = await tx
          .select()
          .from(schema.orders)
          .where(eq(schema.orders.id, orderId))
          .for('update');
        
        if (oRecord && oRecord.order_status !== 'expired' && oRecord.order_status !== 'payment_mismatch') {
          // 1. Put back stock
          for (const item of oRecord.items) {
            const [pRecord] = await tx
              .select({ stock_quantity: schema.products.stock_quantity })
              .from(schema.products)
              .where(eq(schema.products.id, item.id))
              .for('update');
            if (pRecord) {
              const currentStock = { ...pRecord.stock_quantity };
              if (currentStock[item.size] !== undefined) {
                currentStock[item.size] = (currentStock[item.size] || 0) + item.quantity;
                await tx
                  .update(schema.products)
                  .set({ stock_quantity: currentStock })
                  .where(eq(schema.products.id, item.id));
              }
            }
          }
          // 2. Revert discount usage count
          if (oRecord.discount_code) {
            await tx
              .update(schema.discountCodes)
              .set({ used_count: sql`GREATEST(0, ${schema.discountCodes.used_count} - 1)` })
              .where(eq(schema.discountCodes.code, oRecord.discount_code));
          }
        }

        // Flag order as payment_mismatch
        await tx
          .update(schema.orders)
          .set({
            order_status: 'payment_mismatch',
            payment_status: 'pending',
            payment_id: razorpay_payment_id,
            updated_at: new Date(),
          })
          .where(eq(schema.orders.id, orderId));
      });

      return NextResponse.json({ 
        error: 'Payment amount mismatch detected. Order flagged for manual review.', 
        code: 'PAYMENT_MISMATCH' 
      }, { status: 400 });
    }

    // 5. Update order state inside a secure SQL transaction
    const confirmedOrder = await db.transaction(async (tx: any) => {
      // Re-verify order payment status in transaction
      const [oRecord] = await tx
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, orderId));
      
      if (!oRecord || oRecord.payment_status === 'paid') {
        return oRecord;
      }

      // If the order has already expired, we put the stock back when it expired, so we must deduct it again now.
      // Otherwise, if it was still pending_payment, it is already deducted, so we do not touch the stock.
      if (oRecord.order_status === 'expired') {
        const items = oRecord.items;
        for (const item of items) {
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
            throw new Error(`OUT_OF_STOCK_REFUND:${pRecord.name}`);
          }

          currentStock[item.size] = available - item.quantity;
          await tx
            .update(schema.products)
            .set({ stock_quantity: currentStock })
            .where(eq(schema.products.id, item.id));
        }
      }

      // Update Order Status to paid and confirmed (state machine)
      const updates: any = {
        payment_status: 'paid',
        payment_id: razorpay_payment_id,
        order_status: 'confirmed',
        updated_at: new Date(),
      };
      if (oRecord.payment_type === 'cod_with_deposit') {
        updates.deposit_status = 'paid';
      }

      const [updatedOrder] = await tx
        .update(schema.orders)
        .set(updates)
        .where(eq(schema.orders.id, orderId))
        .returning();

      return updatedOrder;
    });

    if (!confirmedOrder) {
      return NextResponse.json({ error: 'Order processing failed' }, { status: 500 });
    }

    // 6. Fire Make.com WhatsApp Webhook (Fire-and-forget)
    if (MAKE_WHATSAPP_WEBHOOK && MAKE_WHATSAPP_WEBHOOK.startsWith('http')) {
      const itemsList = confirmedOrder.items
        .map((i: any) => `${i.name} (${i.size}) x${i.quantity}`)
        .join(', ');

      fetch(MAKE_WHATSAPP_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order_confirmed',
          order_number: confirmedOrder.order_number,
          total: confirmedOrder.total,
          customer_name: confirmedOrder.customer_name,
          customer_phone: confirmedOrder.customer_phone,
          items: itemsList,
        }),
      }).catch((err) => console.error('Make.com WhatsApp Webhook execution failed:', err));
    }

    // 7. Send Order Success Email or COD Deposit Confirmation Email (Fire-and-forget)
    if (confirmedOrder.payment_type === 'cod_with_deposit') {
      sendDepositConfirmationEmail({
        orderNumber: confirmedOrder.order_number,
        customerName: confirmedOrder.customer_name,
        customerEmail: confirmedOrder.customer_email,
        items: confirmedOrder.items as any[],
        totalPaise: confirmedOrder.total,
        shippingChargePaise: confirmedOrder.shipping_charge,
        discountAmountPaise: confirmedOrder.discount_amount || 0,
        fulfillmentType: confirmedOrder.fulfillment_type,
        pickupCode: confirmedOrder.pickup_code,
        shippingAddress: confirmedOrder.shipping_address,
      }).catch((err) => console.error('Failed to send COD deposit confirmation email:', err));
    } else {
      sendOrderSuccessEmail({
        orderNumber: confirmedOrder.order_number,
        customerName: confirmedOrder.customer_name,
        customerEmail: confirmedOrder.customer_email,
        items: confirmedOrder.items as any[],
        totalPaise: confirmedOrder.total,
        shippingChargePaise: confirmedOrder.shipping_charge,
        discountAmountPaise: confirmedOrder.discount_amount || 0,
        fulfillmentType: confirmedOrder.fulfillment_type,
        pickupCode: confirmedOrder.pickup_code,
        shippingAddress: confirmedOrder.shipping_address,
      }).catch((err) => console.error('Failed to send order success email:', err));
    }

    return NextResponse.json({
      success: true,
      orderNumber: confirmedOrder.order_number,
      orderId: confirmedOrder.id, // Ensure orderId is returned so client can redirect properly
    });

  } catch (error: any) {
    console.error('Server error during payment verification:', error);

    if (error.message && error.message.startsWith('OUT_OF_STOCK_REFUND:')) {
      const productName = error.message.split('OUT_OF_STOCK_REFUND:')[1];
      const orderId = reqBody?.orderId;
      const razorpay_payment_id = reqBody?.razorpay_payment_id;

      try {
        const [order] = await db
          .select()
          .from(schema.orders)
          .where(eq(schema.orders.id, orderId))
          .limit(1);

        if (order && order.payment_status !== 'refunded') {
          const refundAmount = order.payment_type === 'cod_with_deposit' ? 20000 : order.total;
          
          if (razorpay) {
            console.log(`[AUTO-REFUND] Triggering refund for order ${order.order_number}, amount: ${refundAmount}`);
            await razorpay.payments.refund(razorpay_payment_id, {
              amount: refundAmount,
              notes: {
                reason: `Stock sold out before payment completed (late payment for ${productName})`,
                order_id: order.id,
                order_number: order.order_number
              }
            });
          }

          await db
            .update(schema.orders)
            .set({
              order_status: 'failed',
              payment_status: 'refunded',
              payment_id: razorpay_payment_id,
              updated_at: new Date()
            })
            .where(eq(schema.orders.id, orderId));

          // Fire-and-forget refund notification email to the customer
          sendRefundEmail({
            orderNumber: order.order_number,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            productName,
            refundAmountPaise: refundAmount,
          });
        }
      } catch (refundErr) {
        console.error('Failed to auto-refund after stock out:', refundErr);
      }

      return NextResponse.json({
        error: `Checkout time limit exceeded. The item "${productName}" has sold out. A full refund has been automatically initiated to your original payment method.`,
        code: 'OUT_OF_STOCK_REFUNDED'
      }, { status: 400 });
    }

    try {
      const { captureException, setTag } = await import('@sentry/nextjs');
      setTag("order_id", reqBody?.orderId || 'unknown');
      setTag("payment_id", reqBody?.razorpay_payment_id || 'unknown');
      captureException(error);
    } catch (sentryErr) {
      console.error('Sentry reporting failed:', sentryErr);
    }
    return NextResponse.json({ error: 'An unexpected verification error occurred' }, { status: 500 });
  }
}
