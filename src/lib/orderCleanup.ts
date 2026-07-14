import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, lt, and, sql } from 'drizzle-orm';

export async function cleanupExpiredOrders() {
  const now = new Date();
  
  try {
    // Find all orders that are still pending_payment and past their hold_expires_at
    const expiredOrders = await db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.order_status, 'pending_payment'),
          lt(schema.orders.holdExpiresAt, now)
        )
      );

    if (expiredOrders.length > 0) {
      console.log(`Found ${expiredOrders.length} expired pending payment orders. Releasing stock...`);

      for (const order of expiredOrders) {
        let isExpired = false;
        await db.transaction(async (tx: any) => {
          // Re-verify order status inside transaction
          const [oRecord] = await tx
            .select()
            .from(schema.orders)
            .where(eq(schema.orders.id, order.id))
            .for('update');

          if (oRecord && oRecord.order_status === 'pending_payment') {
            // 1. Release stocks back
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

            // 2. Decrement discount code usage count if a code was used
            if (oRecord.discount_code) {
              await tx
                .update(schema.discountCodes)
                .set({ used_count: sql`GREATEST(0, ${schema.discountCodes.used_count} - 1)` })
                .where(eq(schema.discountCodes.code, oRecord.discount_code));
            }

            // 3. Mark order as expired
            await tx
              .update(schema.orders)
              .set({
                order_status: 'expired',
                updated_at: new Date()
              })
              .where(eq(schema.orders.id, order.id));

            console.log(`Order ${order.order_number} has expired. Stock released in Postgres.`);
            isExpired = true;
          }
        });

        // Release stock in Redis if it was actually expired in Postgres
        if (isExpired) {
          try {
            const { releaseUnitSafe } = await import('@/lib/stock-gate');
            for (const item of order.items) {
              await releaseUnitSafe(item.id, item.size, item.quantity ?? 1);
            }
          } catch (redisErr) {
            console.error('Failed to release stock gate in cleanupExpiredOrders:', redisErr);
          }
        }
      }
    }

    // 3b. Send Payment Pending Reminders for prepaid orders with <= 5 mins remaining (50% of the 10m TTL)
    let remindersSentCount = 0;
    try {
      const activePendingPrepaid = await db
        .select()
        .from(schema.orders)
        .where(
          and(
            eq(schema.orders.order_status, 'pending_payment'),
            eq(schema.orders.payment_type, 'prepaid'),
            eq(schema.orders.reminderSent, false)
          )
        );

      const reminderThresholdMs = 5 * 60 * 1000; // 5 minutes remaining (50% elapsed)
      const { sendPaymentPendingReminderEmail } = await import('@/lib/email');

      for (const order of activePendingPrepaid) {
        if (order.holdExpiresAt) {
          const msRemaining = order.holdExpiresAt.getTime() - now.getTime();
          
          if (msRemaining > 0 && msRemaining <= reminderThresholdMs) {
            // Mark as sent in DB immediately to prevent concurrent duplicate triggers
            await db
              .update(schema.orders)
              .set({ reminderSent: true, updated_at: new Date() })
              .where(eq(schema.orders.id, order.id));

            remindersSentCount++;

            const minutesRemaining = Math.max(1, Math.ceil(msRemaining / 60000));
            sendPaymentPendingReminderEmail({
              orderNumber: order.order_number,
              customerName: order.customer_name,
              customerEmail: order.customer_email,
              items: order.items as any[],
              totalPaise: order.total,
              minutesRemaining
            }).catch((err) => console.error(`Failed to send reminder email for order ${order.order_number}:`, err));
          }
        }
      }
      if (remindersSentCount > 0) {
        console.log(`Sent ${remindersSentCount} payment-pending reminders.`);
      }
    } catch (reminderErr) {
      console.error('Failed to process payment reminders:', reminderErr);
    }

    // 4. Reconciliation Safety Net (Heals drift between Redis and Postgres)
    try {
      const { redis } = await import('@/lib/redis');
      const allProducts = await db.select().from(schema.products);
      for (const product of allProducts) {
        const stock = product.stock_quantity || {};
        for (const [size, qty] of Object.entries(stock)) {
          const realAvailable = qty;
          const redisKey = `stock:${product.id}:${size}`;
          const redisValue = await redis.get(redisKey);
          if (redisValue === null || Number(redisValue) !== realAvailable) {
            await redis.set(redisKey, realAvailable);
            console.warn(`[Drift Reconciliation] Syncing stock gate for product ${product.name} (${product.id}) size ${size}. Postgres: ${realAvailable}, Redis: ${redisValue}`);
          }
        }
      }
    } catch (reconErr) {
      console.error('Reconciliation safety net error:', reconErr);
    }

    return { count: expiredOrders.length, remindersSent: remindersSentCount };
  } catch (error) {
    console.error('Error cleaning up expired orders:', error);
    throw error;
  }
}
