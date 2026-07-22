import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { firestoreService } from '@/lib/firestore';
import { sendDeliveryStatusEmail, sendDeliverySuccessEmail } from '@/lib/email';
import { sendOrderShippedSMS, sendOutForDeliverySMS, sendDeliveredSMS } from '@/lib/sms';

export async function POST(request: Request) {
  try {
    // ── STEP 0: Read raw body first (required for HMAC verification) ──────────
    const rawBody = await request.text();

    // ── STEP 1: Signature verification ────────────────────────────────────────
    // SHIPROCKET_WEBHOOK_SECRET: get this from Shiprocket Dashboard → Settings →
    // API → Webhook Secret once you go live. Leave empty in sandbox.
    const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    const signature = request.headers.get('x-shiprocket-hmac-sha256') || '';

    if (secret) {
      const crypto = await import('crypto');
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      const expectedBuf = Buffer.from(expected, 'utf-8');
      const sigBuf = Buffer.from(signature, 'utf-8');

      const signaturesMatch =
        expectedBuf.length === sigBuf.length &&
        crypto.timingSafeEqual(expectedBuf, sigBuf);

      if (!signaturesMatch) {
        console.warn('[Shiprocket Webhook] ❌ HMAC signature mismatch — rejecting request.');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    } else {
      console.warn(
        '[Shiprocket Webhook] ⚠️  SHIPROCKET_WEBHOOK_SECRET not set — ' +
        'signature verification SKIPPED. DO NOT go live like this.'
      );
    }

    const payload = JSON.parse(rawBody);
    console.log('[Shiprocket Webhook Received]', JSON.stringify(payload, null, 2));

    const orderNumber = payload.channel_order_id || payload.order_id || '';
    const awb = payload.awb || payload.awb_code || '';
    const status = payload.status || payload.current_status || '';

    if (!orderNumber && !awb) {
      return NextResponse.json({ error: 'Missing order number or awb reference' }, { status: 400 });
    }

    // Find corresponding order in Postgres
    let order: any = null;
    if (orderNumber) {
      const [found] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.order_number, orderNumber))
        .limit(1);
      order = found;
    }

    if (!order && awb) {
      const [found] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.tracking_number, awb))
        .limit(1);
      order = found;
    }

    if (!order) {
      console.warn(`[Shiprocket Webhook] Order not found for orderNumber: ${orderNumber}, awb: ${awb}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Map Shiprocket status string to user facing status label
    let statusLabel = status || 'In Transit';
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus.includes('assigned')) statusLabel = 'AWB Assigned';
    if (normalizedStatus.includes('pickup scheduled')) statusLabel = 'Pickup Scheduled';
    if (normalizedStatus.includes('out for delivery')) statusLabel = 'Out for Delivery';
    if (normalizedStatus.includes('delivered')) {
      statusLabel = 'Delivered';
      // Also update Postgres order status
      await db
        .update(schema.orders)
        .set({ order_status: 'delivered', updated_at: new Date() })
        .where(eq(schema.orders.id, order.id));
    }
    if (normalizedStatus.includes('cancelled') || normalizedStatus.includes('canceled')) {
      statusLabel = 'Cancelled';
      await db
        .update(schema.orders)
        .set({ order_status: 'cancelled', updated_at: new Date() })
        .where(eq(schema.orders.id, order.id));
    }

    // Update Firestore order_tracking document in-place
    await firestoreService.setDoc('order_tracking', order.id, {
      order_id: order.id,
      order_number: order.order_number,
      courier_provider: 'shiprocket',
      tracking_number: awb || order.tracking_number || '',
      status: status,
      status_label: statusLabel,
      updated_at: new Date().toISOString(),
    });

    // Fan out status email alerts to customers
    try {
      if (normalizedStatus.includes('delivered')) {
        sendDeliverySuccessEmail({
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          items: order.items,
          totalPaise: order.total,
          courierPartner: order.courier_partner || 'Shiprocket Partner',
          trackingNumber: awb || order.tracking_number,
        }).catch((err) => console.error('Failed to send Shiprocket delivered email:', err));
        // SMS: delivered
        if (order.customer_phone) {
          sendDeliveredSMS({
            phone: order.customer_phone,
            orderNumber: order.order_number,
          }).catch((err) => console.error('[Fast2SMS] Delivered SMS failed:', err));
        }
      } else if (normalizedStatus.includes('cancelled') || normalizedStatus.includes('canceled')) {
        sendDeliveryStatusEmail({
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          status: 'cancelled',
          items: order.items,
          totalPaise: order.total,
          courierPartner: order.courier_partner || 'Shiprocket Partner',
          trackingNumber: awb || order.tracking_number,
        }).catch((err) => console.error('Failed to send Shiprocket cancelled email:', err));
      } else if (normalizedStatus.includes('out for delivery')) {
        sendDeliveryStatusEmail({
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          status: 'out_for_delivery',
          items: order.items,
          totalPaise: order.total,
          courierPartner: order.courier_partner || 'Shiprocket Partner',
          trackingNumber: awb || order.tracking_number,
        }).catch((err) => console.error('Failed to send Shiprocket out-for-delivery email:', err));
        // SMS: out for delivery
        if (order.customer_phone) {
          sendOutForDeliverySMS({
            phone: order.customer_phone,
            orderNumber: order.order_number,
          }).catch((err) => console.error('[Fast2SMS] OFD SMS failed:', err));
        }
      } else if (
        normalizedStatus.includes('shipped') ||
        normalizedStatus.includes('in transit') ||
        normalizedStatus.includes('pickup scheduled') ||
        normalizedStatus.includes('assigned') ||
        normalizedStatus.includes('picked up')
      ) {
        sendDeliveryStatusEmail({
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          status: 'shipped',
          items: order.items,
          totalPaise: order.total,
          courierPartner: order.courier_partner || 'Shiprocket Partner',
          trackingNumber: awb || order.tracking_number,
        }).catch((err) => console.error('Failed to send Shiprocket shipped email:', err));
        // SMS: shipped
        if (order.customer_phone) {
          sendOrderShippedSMS({
            phone: order.customer_phone,
            orderNumber: order.order_number,
            courierPartner: order.courier_partner || 'Shiprocket Partner',
            trackingNumber: awb || order.tracking_number || '',
          }).catch((err) => console.error('[Fast2SMS] Shipped SMS failed:', err));
        }
      }
    } catch (emailFanoutErr) {
      console.error('Failed to dispatch Shiprocket status email fanout:', emailFanoutErr);
    }

    console.log(`[Shiprocket Webhook] Updated tracking for order ${order.order_number} to ${statusLabel}`);
    return NextResponse.json({ success: true, processed: true });

  } catch (error: any) {
    console.error('Shiprocket Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
