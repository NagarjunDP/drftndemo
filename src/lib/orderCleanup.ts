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

    if (expiredOrders.length === 0) return { count: 0 };

    console.log(`Found ${expiredOrders.length} expired pending payment orders. Releasing stock...`);

    for (const order of expiredOrders) {
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

          console.log(`Order ${order.order_number} has expired. Stock released.`);
        }
      });
    }

    return { count: expiredOrders.length };
  } catch (error) {
    console.error('Error cleaning up expired orders:', error);
    throw error;
  }
}
