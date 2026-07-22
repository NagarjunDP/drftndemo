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
    // BORZO_CALLBACK_SECRET: set this to the secret you configure in Borzo
    // Dashboard → Webhooks once you go live. Leave empty in sandbox.
    const secretKey = process.env.BORZO_CALLBACK_SECRET;
    const signature = request.headers.get('x-dv-signature') || '';

    if (secretKey) {
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(rawBody)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
      const sigBuf = Buffer.from(signature, 'utf-8');

      const signaturesMatch =
        expectedBuf.length === sigBuf.length &&
        crypto.timingSafeEqual(expectedBuf, sigBuf);

      if (!signaturesMatch) {
        console.warn('[Borzo Webhook] ❌ HMAC signature mismatch — rejecting request.');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      // Hard block in production: never allow unsigned Borzo events in prod
      console.error('[Borzo Webhook] 🚨 BORZO_CALLBACK_SECRET not set in production — refusing all requests!');
      return NextResponse.json(
        { error: 'Webhook secret not configured on server. Contact the DRFTN dev team.' },
        { status: 500 }
      );
    } else {
      console.warn(
        '[Borzo Webhook] ⚠️  BORZO_CALLBACK_SECRET not set — ' +
        'signature verification SKIPPED. DO NOT go live like this.'
      );
    }

    const payload = JSON.parse(rawBody);
    console.log('[Borzo Webhook Received]', JSON.stringify(payload, null, 2));

    // Borzo typical fields: payload.delivery.client_order_number or payload.order.matter
    const orderNumber = payload.order_number || payload.order?.matter?.replace('Streetwear Order ', '') || '';
    const trackingNumber = payload.tracking_number || payload.order?.id || '';
    const status = payload.status || payload.order?.status || 'active';

    if (!orderNumber && !trackingNumber) {
      return NextResponse.json({ error: 'Missing order_number or tracking_number' }, { status: 400 });
    }

    // Find the corresponding order in Postgres to get the absolute orderId
    let order: any = null;
    if (orderNumber) {
      const [found] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.order_number, orderNumber))
        .limit(1);
      order = found;
    }

    if (!order && trackingNumber) {
      const [found] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.tracking_number, trackingNumber))
        .limit(1);
      order = found;
    }

    if (!order) {
      console.warn(`[Borzo Webhook] Order not found for orderNumber: ${orderNumber}, tracking: ${trackingNumber}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Map Borzo status string to user facing status label
    let statusLabel = 'In Transit';
    if (status === 'draft') statusLabel = 'Shipment Drafted';
    if (status === 'new') statusLabel = 'Courier Assigned';
    if (status === 'active') statusLabel = 'Out for Delivery';
    if (status === 'delayed') statusLabel = 'Delayed';
    if (status === 'completed') {
      statusLabel = 'Delivered';
      // Also update Postgres order status
      await db
        .update(schema.orders)
        .set({ order_status: 'delivered', updated_at: new Date() })
        .where(eq(schema.orders.id, order.id));
    }
    if (status === 'canceled') {
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
      courier_provider: 'borzo',
      tracking_number: trackingNumber || order.tracking_number || '',
      status: status,
      status_label: statusLabel,
      updated_at: new Date().toISOString(),
    });

    // Fan out status email alerts to customers
    try {
      if (status === 'new') {
        sendDeliveryStatusEmail({
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          status: 'shipped',
          items: order.items,
          totalPaise: order.total,
          courierPartner: 'Borzo Express',
          trackingNumber: trackingNumber || order.tracking_number,
        }).catch((err) => console.error('Failed to send shipped status email:', err));
        // SMS: Borzo courier assigned / shipped
        if (order.customer_phone) {
          sendOrderShippedSMS({
            phone: order.customer_phone,
            orderNumber: order.order_number,
            courierPartner: 'Borzo Express',
            trackingNumber: trackingNumber || order.tracking_number || '',
          }).catch((err) => console.error('[Fast2SMS] Borzo shipped SMS failed:', err));
        }
      } else if (status === 'active') {
        sendDeliveryStatusEmail({
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          status: 'out_for_delivery',
          items: order.items,
          totalPaise: order.total,
          courierPartner: 'Borzo Express',
          trackingNumber: trackingNumber || order.tracking_number,
        }).catch((err) => console.error('Failed to send out-for-delivery status email:', err));
        // SMS: Borzo active = out for delivery
        if (order.customer_phone) {
          sendOutForDeliverySMS({
            phone: order.customer_phone,
            orderNumber: order.order_number,
          }).catch((err) => console.error('[Fast2SMS] Borzo OFD SMS failed:', err));
        }
      } else if (status === 'completed') {
        sendDeliverySuccessEmail({
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          items: order.items,
          totalPaise: order.total,
          courierPartner: 'Borzo Express',
          trackingNumber: trackingNumber || order.tracking_number,
        }).catch((err) => console.error('Failed to send delivery success email:', err));
        // SMS: Borzo completed = delivered
        if (order.customer_phone) {
          sendDeliveredSMS({
            phone: order.customer_phone,
            orderNumber: order.order_number,
          }).catch((err) => console.error('[Fast2SMS] Borzo delivered SMS failed:', err));
        }
      } else if (status === 'canceled') {
        sendDeliveryStatusEmail({
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          status: 'cancelled',
          items: order.items,
          totalPaise: order.total,
          courierPartner: 'Borzo Express',
          trackingNumber: trackingNumber || order.tracking_number,
        }).catch((err) => console.error('Failed to send cancelled status email:', err));
      }
    } catch (emailFanoutErr) {
      console.error('Failed to dispatch status email fanout:', emailFanoutErr);
    }

    console.log(`[Borzo Webhook] Updated tracking for order ${order.order_number} to ${statusLabel}`);
    return NextResponse.json({ success: true, processed: true });

  } catch (error: any) {
    console.error('Borzo Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
