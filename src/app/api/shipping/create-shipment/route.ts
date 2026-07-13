import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nimbuspost } from '@/lib/nimbuspost';

const MAKE_WHATSAPP_WEBHOOK = process.env.MAKE_WHATSAPP_WEBHOOK_URL || '';

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Fetch order details from database
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      console.error(`Shipping query error for order: ${orderId}`, orderErr);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify order is paid before allowing shipment creation
    if (order.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Cannot create shipment for unpaid orders' }, { status: 400 });
    }

    const shippingAddr = (order.shipping_address || {}) as any;

    // 2. Prepare NimbusPost payload
    const shipmentPayload = {
      order_number: order.order_number,
      weight: 0.5, // 0.5kg default for clothing apparel
      length: 25,  // standard packet length in cm
      width: 20,   // standard width in cm
      height: 5,   // standard height in cm
      pickup_address: '1st Floor, Kogilu Main Rd, above Sri Venkateshwar Vaibhava Veg Hotel, K B Sandra, Maruthi Nagar, Yelahanka, Bengaluru, Karnataka 560064',
      delivery_address: {
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email,
        line1: shippingAddr.line1,
        line2: shippingAddr.line2 || '',
        city: shippingAddr.city,
        state: shippingAddr.state,
        pincode: shippingAddr.pincode
      },
      payment_mode: 'prepaid' as const, // Already paid via Razorpay
      order_amount: Number(order.total)
    };

    // 3. Register shipment with NimbusPost API
    const npResponse = await nimbuspost.createShipment(shipmentPayload);

    if (!npResponse || !npResponse.status) {
      return NextResponse.json(
        { error: npResponse?.message || 'NimbusPost shipment registration failed' },
        { status: 500 }
      );
    }

    const awb = npResponse.data.awb;
    const courierName = npResponse.data.courier_name || 'Nimbus Courier Partner';

    // 4. Update order with tracking information and transition status to 'shipped'
    const { data: updatedOrder, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        tracking_number: awb,
        courier_partner: courierName,
        order_status: 'shipped'
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) {
      console.error(`Failed to update tracking details for order: ${orderId}`, updateErr);
      return NextResponse.json({ error: 'Failed to save tracking details to database' }, { status: 500 });
    }

    // 5. Send tracking WhatsApp update to customer (fire and forget)
    if (MAKE_WHATSAPP_WEBHOOK && MAKE_WHATSAPP_WEBHOOK.startsWith('http')) {
      fetch(MAKE_WHATSAPP_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order_shipped',
          order_number: updatedOrder.order_number,
          customer_name: updatedOrder.customer_name,
          customer_phone: updatedOrder.customer_phone,
          tracking_number: awb,
          courier_partner: courierName,
          tracking_url: `https://www.drftnclothing.in/track?orderNumber=${updatedOrder.order_number}&phone=${updatedOrder.customer_phone}`
        })
      }).catch(err => console.error('Make.com shipping notification failed:', err));
    }

    return NextResponse.json({
      success: true,
      awb,
      courier_partner: courierName,
      status: 'shipped'
    });

  } catch (error) {
    console.error('Create shipment api exception:', error);
    return NextResponse.json({ error: 'An unexpected shipment server error occurred' }, { status: 500 });
  }
}
