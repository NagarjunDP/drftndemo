import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single order lookup (used by getOrderById on client-side)
    if (id) {
      const [r] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, id))
        .limit(1);

      if (!r) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const order = {
        id: r.id,
        order_number: r.order_number,
        customer_name: r.customer_name,
        customer_email: r.customer_email,
        customer_phone: r.customer_phone,
        shipping_address: r.shipping_address,
        items: r.items,
        subtotal: r.subtotal,
        shipping_charge: r.shipping_charge,
        discount_code: r.discount_code,
        discount_amount: r.discount_amount,
        total: r.total,
        payment_status: r.payment_status === 'refunded' ? 'failed' : r.payment_status,
        payment_id: r.payment_id || undefined,
        order_status: r.order_status,
        fulfillment_type: r.fulfillment_type || 'delivery',
        pickup_status: r.pickup_status || null,
        pickup_code: r.pickup_code || null,
        tracking_number: r.tracking_number || undefined,
        courier_partner: r.courier_partner || undefined,
        payment_type: r.payment_type || 'prepaid',
        deposit_amount: r.deposit_amount || null,
        remaining_amount: r.remaining_amount || null,
        deposit_status: r.deposit_status || null,
        verified_phone: r.verified_phone || null,
        razorpay_order_id: r.razorpay_order_id || undefined,
        created_at: r.created_at?.toISOString(),
      };

      return NextResponse.json({ order });
    }

    // All orders list
    const list = await db
      .select()
      .from(schema.orders)
      .orderBy(desc(schema.orders.created_at));
    
    return NextResponse.json({ orders: list });
  } catch (error) {
    console.error('Admin orders GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Order ID parameter is required' }, { status: 400 });
    }

    const body = await request.json();

    const [updatedOrder] = await db
      .update(schema.orders)
      .set({
        ...body,
        updated_at: new Date(),
      })
      .where(eq(schema.orders.id, id))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Admin orders PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
