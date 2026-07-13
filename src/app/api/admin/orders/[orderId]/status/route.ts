import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { adminUpdateStatusSchema } from '@/lib/validations';

const MAKE_WHATSAPP_WEBHOOK = process.env.MAKE_WEBHOOK_URL || '';

const STATUS_HIERARCHY: Record<string, number> = {
  pending_payment: 1,
  placed: 2,
  payment_verifying: 2,
  confirmed: 3,
  preparing: 4,
  ready_for_pickup: 5,
  shipped: 5,
  delivered: 6,
  collected: 6,
  cancelled: 7,
};

export async function PATCH(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;

  try {
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const body = await request.json();

    // 1. Zod validate input
    const validationResult = adminUpdateStatusSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid target status value' }, { status: 400 });
    }

    const newStatus = validationResult.data.status;

    // 2. Query Neon DB order
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentStatus = order.order_status;

    // 3. Status workflow validation
    if (currentStatus === 'delivered' || currentStatus === 'collected' || currentStatus === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot transition order status out of final state: '${currentStatus}'` },
        { status: 400 }
      );
    }

    if (newStatus !== 'cancelled') {
      const currentVal = STATUS_HIERARCHY[currentStatus] || 0;
      const newVal = STATUS_HIERARCHY[newStatus] || 0;

      if (newVal < currentVal) {
        return NextResponse.json(
          { error: `Backward transitions are prohibited: '${currentStatus}' to '${newStatus}'` },
          { status: 400 }
        );
      }
    }

    // 3b. Verify that only pickup orders can be marked as collected
    if (newStatus === 'collected') {
      if (order.fulfillment_type !== 'pickup') {
        return NextResponse.json({ error: 'Cannot mark a delivery order as collected.' }, { status: 400 });
      }
    }

    // 4. Perform database update in transaction
    const updatedOrder = await db.transaction(async (tx: any) => {
      // Release stock if cancelling
      if (newStatus === 'cancelled') {
        const items = order.items as any[];
        for (const item of items) {
          const [pRecord] = await tx
            .select({ stock_quantity: schema.products.stock_quantity })
            .from(schema.products)
            .where(eq(schema.products.id, item.id));

          if (pRecord) {
            const currentStock = { ...pRecord.stock_quantity };
            if (currentStock[item.size] !== undefined) {
              currentStock[item.size] = currentStock[item.size] + item.quantity;
              await tx
                .update(schema.products)
                .set({ stock_quantity: currentStock })
                .where(eq(schema.products.id, item.id));
            }
          }
        }
      }

      const updates: any = {
        order_status: newStatus,
        updated_at: new Date(),
      };

      if (order.fulfillment_type === 'pickup') {
        if (newStatus === 'ready_for_pickup') {
          updates.pickup_status = 'ready_for_pickup';
        } else if (newStatus === 'collected') {
          updates.pickup_status = 'collected';
        }
      }

      const [updated] = await tx
        .update(schema.orders)
        .set(updates)
        .where(eq(schema.orders.id, orderId))
        .returning();

      return updated;
    });

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
    }

    // 4b. Send push notification to user if order is ready for pickup
    if (newStatus === 'ready_for_pickup' && order.user_id) {
      try {
        const { pushSubscriptions } = await import('@/db/schema');
        const { isNull, and } = await import('drizzle-orm');
        const { sendPushNotification } = await import('@/lib/push');

        const subs = await db
          .select()
          .from(pushSubscriptions)
          .where(
            and(
              eq(pushSubscriptions.product_id, null as any), // general sub OR find via user sub
              isNull(pushSubscriptions.notified_at)
            )
          );

        if (subs.length > 0) {
          const payload = {
            title: 'Order Ready for Pickup! 📦',
            body: `Your order ${updatedOrder.order_number} is ready to collect. Pickup Code: ${updatedOrder.pickup_code}.`,
            url: `/account/orders/${orderId}`,
          };
          // Broadcast to matching endpoints (simplified filter here or direct match if subscriptions stored endpoint)
          await Promise.allSettled(
            subs.map((sub: any) => sendPushNotification(sub, payload))
          );
        }
      } catch (pushErr) {
        console.error('Failed to trigger pickup push notification:', pushErr);
      }
    }

    // 4c. Send collected or delivered success emails to customer
    if (newStatus === 'collected') {
      import('@/lib/email').then(({ sendPickupSuccessEmail }) => {
        sendPickupSuccessEmail({
          orderNumber: updatedOrder.order_number,
          customerName: updatedOrder.customer_name,
          customerEmail: updatedOrder.customer_email,
          items: updatedOrder.items as any[],
          totalPaise: updatedOrder.total_amount_paise,
        }).catch(err => console.error('[Status Email] Failed to send pickup success email:', err));
      });
    } else if (newStatus === 'delivered') {
      import('@/lib/email').then(({ sendDeliverySuccessEmail }) => {
        sendDeliverySuccessEmail({
          orderNumber: updatedOrder.order_number,
          customerName: updatedOrder.customer_name,
          customerEmail: updatedOrder.customer_email,
          items: updatedOrder.items as any[],
          totalPaise: updatedOrder.total_amount_paise,
          courierPartner: updatedOrder.courier_partner,
          trackingNumber: updatedOrder.tracking_number,
        }).catch(err => console.error('[Status Email] Failed to send delivery success email:', err));
      });
    }

    // 5. Fire WhatsApp update webhook (Fire-and-forget)
    if (MAKE_WHATSAPP_WEBHOOK && MAKE_WHATSAPP_WEBHOOK.startsWith('http')) {
      fetch(MAKE_WHATSAPP_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order_status_updated',
          order_number: updatedOrder.order_number,
          new_status: newStatus,
          customer_name: updatedOrder.customer_name,
          customer_phone: updatedOrder.customer_phone,
          tracking_number: updatedOrder.tracking_number || null,
          courier_partner: updatedOrder.courier_partner || null,
        }),
      }).catch((err) => console.error('Make.com status webhook webhook execution failed:', err));
    }

    return NextResponse.json({
      success: true,
      orderId,
      oldStatus: currentStatus,
      newStatus: updatedOrder.order_status,
    });

  } catch (error) {
    console.error(`Admin status update exception for order ${orderId}:`, error);
    return NextResponse.json({ error: 'Internal server error occurred' }, { status: 500 });
  }
}
