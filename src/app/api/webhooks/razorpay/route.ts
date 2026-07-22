import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { razorpay } from '@/lib/razorpay';
import { sendRefundEmail, sendOrderSuccessEmail, sendDepositConfirmationEmail } from '@/lib/email';
import { firestoreService } from '@/lib/firestore';
import { confirmAndWriteOrder } from '@/lib/order-db-helper';
import { sendOrderConfirmationSMS } from '@/lib/sms';

const MAKE_WHATSAPP_WEBHOOK = process.env.MAKE_WEBHOOK_URL || '';

export async function POST(request: Request) {
  let checkout: any = null;
  let order: any = null;
  let payment: any = null;

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Signature verification parameters missing' }, { status: 400 });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    const sigBuf = Buffer.from(signature, 'utf-8');

    if (expectedBuf.length !== sigBuf.length) {
      console.warn('[Razorpay Webhook] Invalid webhook signature length!');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const isValid = crypto.timingSafeEqual(expectedBuf, sigBuf);

    if (!isValid) {
      console.warn('[Razorpay Webhook] Invalid webhook signature detected!');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    payment = payload.payload.payment.entity;
    const razorpayOrderId = payment.order_id;

    if (!razorpayOrderId) {
      return NextResponse.json({ success: true, message: 'No order ID in payment entity' });
    }

    // 1. Try to find the corresponding order in Postgres Neon
    const [foundOrder] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.razorpay_order_id, razorpayOrderId))
      .limit(1);
    order = foundOrder;

    // 2. If not found in Neon, check Firestore pending checkouts
    if (!order) {
      const checkouts = await firestoreService.queryDocs('pending_checkouts', {
        where: [{ field: 'razorpay_order_id', op: '==', value: razorpayOrderId }]
      });
      if (checkouts.length > 0) {
        checkout = checkouts[0];
      }
    }

    if (!order && !checkout) {
      console.warn(`[Razorpay Webhook] Order or Checkout not found for Razorpay Order ID: ${razorpayOrderId}`);
      return NextResponse.json({ error: 'Order/Checkout not found' }, { status: 404 });
    }

    // Handle Captured Payment
    if (event === 'payment.captured') {
      if (order && order.payment_status === 'paid') {
        return NextResponse.json({ success: true, message: 'Order already completed (idempotency check passed)' });
      }

      if (checkout && checkout.status === 'paid') {
        return NextResponse.json({ success: true, message: 'Checkout already completed (idempotency check passed)' });
      }

      // Verify payment amount matches expected amount
      const amountReceived = payment.amount;
      const expectedAmount = (order || checkout).payment_type === 'cod_with_deposit' ? 20000 : (order || checkout).total;
      
      if (amountReceived !== expectedAmount) {
        console.error(`[FRAUD ALERT] Webhook payment amount ${amountReceived} does not match expected total ${expectedAmount}! Order: ${(order || checkout).order_number}`);
        
        if (order) {
          await db
            .update(schema.orders)
            .set({
              order_status: 'payment_mismatch',
              payment_status: 'pending',
              payment_id: payment.id,
              updated_at: new Date(),
            })
            .where(eq(schema.orders.id, order.id));
        } else {
          await firestoreService.updateDoc('pending_checkouts', checkout.id, {
            status: 'payment_mismatch',
            payment_id: payment.id,
            updated_at: new Date().toISOString(),
          });
        }

        return NextResponse.json({ success: true, message: 'Payment mismatch handled.' });
      }

      let orderResult: any;

      if (order) {
        // Order exists in Neon, just update it to paid
        const [updatedOrder] = await db
          .update(schema.orders)
          .set({
            payment_status: 'paid',
            payment_id: payment.id,
            order_status: 'confirmed',
            deposit_status: order.payment_type === 'cod_with_deposit' ? 'paid' : null,
            updated_at: new Date(),
          })
          .where(eq(schema.orders.id, order.id))
          .returning();
        orderResult = updatedOrder;
      } else {
        // Write checkout details to Neon for the first time
        orderResult = await confirmAndWriteOrder(checkout, payment.id);

        // Update Firestore status
        await firestoreService.updateDoc('pending_checkouts', checkout.id, {
          status: 'paid',
          payment_id: payment.id,
          updated_at: new Date().toISOString(),
        });
      }

      // Fire Make.com WhatsApp Webhook (Fire-and-forget)
      const orderRef = orderResult || order || checkout;
      if (MAKE_WHATSAPP_WEBHOOK && MAKE_WHATSAPP_WEBHOOK.startsWith('http')) {
        const itemsList = orderRef.items
          .map((i: any) => `${i.name} (${i.size}) x${i.quantity}`)
          .join(', ');

        fetch(MAKE_WHATSAPP_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'order_confirmed',
            order_number: orderRef.order_number,
            total: orderRef.total,
            customer_name: orderRef.customer_name,
            customer_phone: orderRef.customer_phone,
            items: itemsList,
          }),
        }).catch((err) => console.error('Make.com webhook failed:', err));
      }

      // Fire success email notification
      if (orderResult) {
        if (orderResult.payment_type === 'cod_with_deposit') {
          sendDepositConfirmationEmail({
            orderNumber: orderResult.order_number,
            customerName: orderResult.customer_name,
            customerEmail: orderResult.customer_email,
            items: orderResult.items as any[],
            totalPaise: orderResult.total,
            shippingChargePaise: orderResult.shipping_charge,
            discountAmountPaise: orderResult.discount_amount || 0,
            fulfillmentType: orderResult.fulfillment_type,
            pickupCode: orderResult.pickup_code,
            shippingAddress: orderResult.shipping_address,
          }).catch((err) => console.error('Failed to send webhook COD deposit confirmation email:', err));
        } else {
          sendOrderSuccessEmail({
            orderNumber: orderResult.order_number,
            customerName: orderResult.customer_name,
            customerEmail: orderResult.customer_email,
            items: orderResult.items as any[],
            totalPaise: orderResult.total,
            shippingChargePaise: orderResult.shipping_charge,
            discountAmountPaise: orderResult.discount_amount || 0,
            fulfillmentType: orderResult.fulfillment_type,
            pickupCode: orderResult.pickup_code,
            shippingAddress: orderResult.shipping_address,
          }).catch((err) => console.error('Failed to send webhook order success email:', err));
        }
      }

      // Fire Fast2SMS order confirmation (fire-and-forget)
      const smsPhone = orderResult?.customer_phone || orderRef.customer_phone;
      if (smsPhone) {
        sendOrderConfirmationSMS({
          phone: smsPhone,
          orderNumber: orderRef.order_number,
          totalPaise: orderRef.total,
        }).catch((err) => console.error('[Fast2SMS] Order confirmation SMS failed:', err));
      }

      console.log(`[Razorpay Webhook] Order ${orderRef.order_number} successfully marked as PAID.`);
      return NextResponse.json({ success: true, processed: true });
    }

    // Handle Failed Payment
    if (event === 'payment.failed') {
      if (order && order.payment_status === 'pending') {
        await db
          .update(schema.orders)
          .set({
            payment_status: 'failed',
            updated_at: new Date(),
          })
          .where(eq(schema.orders.id, order.id));
      } else if (checkout && checkout.status === 'pending') {
        await firestoreService.updateDoc('pending_checkouts', checkout.id, {
          status: 'failed',
          updated_at: new Date().toISOString(),
        });
      }
      console.log(`[Razorpay Webhook] Order/Checkout ${(order || checkout).order_number} marked as FAILED.`);
      return NextResponse.json({ success: true, processed: true });
    }

    return NextResponse.json({ success: true, message: 'Unhandled event type' });

  } catch (error: any) {
    console.error('Razorpay Webhook Error:', error);

    const orderRef = order || checkout;
    if (error.message && error.message.startsWith('OUT_OF_STOCK_REFUND:')) {
      const productName = error.message.split('OUT_OF_STOCK_REFUND:')[1];
      try {
        if (orderRef && orderRef.payment_status !== 'refunded') {
          const refundAmount = orderRef.payment_type === 'cod_with_deposit' ? 20000 : orderRef.total;
          
          if (razorpay) {
            console.log(`[Webhook AUTO-REFUND] Triggering refund for order ${orderRef.order_number}, amount: ${refundAmount}`);
            await razorpay.payments.refund(payment.id, {
              amount: refundAmount,
              notes: {
                reason: `Stock sold out before webhook verification completed (late payment for ${productName})`,
                order_id: orderRef.id,
                order_number: orderRef.order_number
              }
            });
          }
          
          if (order) {
            await db
              .update(schema.orders)
              .set({
                order_status: 'failed',
                payment_status: 'refunded',
                payment_id: payment.id,
                updated_at: new Date()
              })
              .where(eq(schema.orders.id, order.id));
          } else {
            await firestoreService.updateDoc('pending_checkouts', checkout.id, {
              status: 'failed',
              payment_status: 'refunded',
              payment_id: payment.id,
              updated_at: new Date().toISOString(),
            });
          }

          sendRefundEmail({
            orderNumber: orderRef.order_number,
            customerName: orderRef.customer_name,
            customerEmail: orderRef.customer_email,
            productName,
            refundAmountPaise: refundAmount,
          });
        }
      } catch (refundErr) {
        console.error('Webhook auto-refund processing failed:', refundErr);
      }
      return NextResponse.json({ success: true, processed: true, message: 'Stock out refund completed.' });
    }

    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
