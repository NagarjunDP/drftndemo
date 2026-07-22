import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function confirmAndWriteOrder(checkout: any, razorpayPaymentId: string) {
  return await db.transaction(async (tx: any) => {
    // 1. Double check that this order has not already been created in Neon
    const [existing] = await tx
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, checkout.id))
      .limit(1);
    
    if (existing) return existing;

    // 2. Atomically decrement stock of each product in Postgres.
    //    Uses a single UPDATE with a WHERE clause that requires sufficient stock.
    //    If 0 rows are affected, stock was insufficient → throw to abort the tx.
    for (const item of checkout.items) {
      // Validate size is a safe identifier (alphanumeric) before interpolating
      // into the JSONB path literal — prevents any injection via crafted size strings.
      if (!/^[A-Z0-9]{1,10}$/.test(item.size)) {
        throw new Error(`Invalid size value: ${item.size}`);
      }

      const result = await tx.execute(
        sql`
          UPDATE products
          SET stock = jsonb_set(
            stock,
            ${sql.raw(`'{${item.size}}'`)},
            to_jsonb(
              GREATEST(0, (COALESCE(stock->>'${sql.raw(item.size)}', '0'))::int - ${item.quantity})
            )
          )
          WHERE id = ${item.id}
            AND (COALESCE(stock->>'${sql.raw(item.size)}', '0'))::int >= ${item.quantity}
          RETURNING id
        `
      );

      // Drizzle returns rows array; 0 rows = WHERE clause failed = out of stock
      const rows = (result as any).rows ?? result ?? [];
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(
          `OUT_OF_STOCK: insufficient stock for product ${item.id} size ${item.size}`
        );
      }
    }

    // 3. Increment discount coupon count in Postgres if exists
    if (checkout.discount_code) {
      await tx
        .update(schema.discountCodes)
        .set({ used_count: sql`${schema.discountCodes.used_count} + 1` })
        .where(eq(schema.discountCodes.code, checkout.discount_code));
    }

    // 4. Insert order row into Neon orders table (with unique constraint collision retry)
    let newOrder: any = null;
    let orderNumberToUse = checkout.order_number;
    let retries = 5;

    while (retries > 0) {
      try {
        const [inserted] = await tx
          .insert(schema.orders)
          .values({
            id: checkout.id,
            user_id: checkout.user_id,
            order_number: orderNumberToUse,
            customer_name: checkout.customer_name,
            customer_email: checkout.customer_email,
            customer_phone: checkout.customer_phone,
            shipping_address: checkout.shipping_address,
            items: checkout.items,
            subtotal: checkout.subtotal,
            shipping_charge: checkout.shipping_charge,
            discount_code: checkout.discount_code,
            discount_amount: checkout.discount_amount,
            total: checkout.total,
            payment_status: 'paid',
            payment_id: razorpayPaymentId,
            order_status: 'confirmed',
            fulfillment_type: checkout.fulfillment_type,
            pickup_status: checkout.pickup_status,
            pickup_code: checkout.pickup_code,
            payment_type: checkout.payment_type,
            deposit_amount: checkout.deposit_amount,
            remaining_amount: checkout.remaining_amount,
            deposit_status: checkout.payment_type === 'cod_with_deposit' ? 'paid' : null,
            verified_phone: checkout.verified_phone,
            courier_partner: null,
            tracking_number: null,
            shiprocket_order_id: null,
            courier_provider: checkout.courier_provider,
            zone: checkout.zone,
            invoice_number: null,
            holdExpiresAt: null,
            razorpay_order_id: checkout.razorpay_order_id,
            created_at: new Date(checkout.created_at || Date.now()),
            updated_at: new Date(),
          })
          .returning();

        newOrder = inserted;
        break;
      } catch (err: any) {
        const isUniqueViolation =
          err?.code === '23505' ||
          err?.message?.includes('orders_order_number_unique') ||
          err?.message?.includes('unique constraint');

        if (isUniqueViolation && retries > 1) {
          retries--;
          const crypto = await import('crypto');
          const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
          const bytes = crypto.randomBytes(6);
          let randomStr = '';
          for (let i = 0; i < 6; i++) {
            randomStr += chars[bytes[i] % chars.length];
          }
          orderNumberToUse = `DRFTN-${randomStr}`;
          console.warn(`[confirmAndWriteOrder] Unique constraint hit on ${checkout.order_number}. Retrying with new order number ${orderNumberToUse}...`);
        } else {
          throw err;
        }
      }
    }

    return newOrder;
  });
}
