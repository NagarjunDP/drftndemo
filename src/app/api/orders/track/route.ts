import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    const phone = searchParams.get('phone'); // Can be full number or last 4 digits

    if (!orderNumber || !phone) {
      return NextResponse.json({ error: 'Both orderNumber and phone are required for tracking verification' }, { status: 400 });
    }

    const cleanOrderNumber = orderNumber.trim().toUpperCase();
    const cleanPhone = phone.trim();

    // 1. Fetch order from Neon DB
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.order_number, cleanOrderNumber))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { error: 'No matching order found. Please check details or message us on WhatsApp.' },
        { status: 404 }
      );
    }

    // 2. Validate phone match (must match full phone or last 4 digits)
    const phoneMatches = 
      order.customer_phone === cleanPhone || 
      order.customer_phone.endsWith(cleanPhone) ||
      cleanPhone.length >= 4 && order.customer_phone.endsWith(cleanPhone.slice(-4));

    if (!phoneMatches) {
      return NextResponse.json(
        { error: 'Authentication failed: Phone number mismatch for this order number.' },
        { status: 403 }
      );
    }

    // Collect all product IDs from the order items
    const productIds = (order.items as any[] || []).map((i: any) => i.id || i.productId);

    // Fetch product images as a fallback
    const fallbackImages = productIds.length > 0
      ? await db
          .select()
          .from(schema.productImages)
          .where(inArray(schema.productImages.product_id, productIds))
      : [];

    const imageMap = new Map<string, string>();
    fallbackImages.forEach((img: any) => {
      if (!imageMap.has(img.product_id)) {
        imageMap.set(img.product_id, img.image_url);
      }
    });

    // 3. Keep safe fields for client response, including totals and prices
    const sanitizedItems = (order.items as any[]).map((item: any) => ({
      name: item.name,
      size: item.size,
      quantity: item.quantity,
      image: item.image || imageMap.get(item.id || item.productId) || 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80',
      price: item.price,
    }));

    // Estimate delivery duration based on PIN code locally
    const pincode = order.shipping_address?.pincode || '';
    const isLocalCity = pincode.startsWith('560');
    const isLocalRegion = pincode.startsWith('5');
    const estDaysText = isLocalCity ? '1-2 business days' : isLocalRegion ? '2-3 business days' : '4-6 business days';

    return NextResponse.json({
      order_number: order.order_number,
      order_status: order.order_status,
      created_at: order.created_at.toISOString(),
      items: sanitizedItems,
      total: order.total,
      subtotal: order.subtotal,
      shipping_charge: order.shipping_charge,
      discount_amount: order.discount_amount || 0,
      tracking_number: order.tracking_number || null,
      courier_partner: order.courier_partner || null,
      estimated_delivery_text: estDaysText,
    });

  } catch (error) {
    console.error('Track order API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during tracking lookup' }, { status: 500 });
  }
}
