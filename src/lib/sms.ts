/**
 * Fast2SMS Integration — DRFTN E-Commerce
 * =========================================
 * Used exclusively for:
 *   1. Order confirmation SMS (sent after payment.captured webhook)
 *   2. Delivery status SMS (shipped / out-for-delivery / delivered)
 *
 * API Key: store as FAST2SMS_API_KEY in .env.local (never commit)
 * DLT: Set FAST2SMS_SENDER_ID and FAST2SMS_TEMPLATE_ID per message type.
 *
 * Fast2SMS routes:
 *   - "q"   → Quick/transactional — works without DLT for testing but WILL be
 *             blocked on real carrier networks; do NOT ship to production.
 *   - "dlt" → DLT-registered templates only. Required for production delivery.
 *
 * ⚠️  Before go-live: register sender ID and message templates on the
 *     TRAI DLT portal (https://www.trai.gov.in/dlt-registration) and update
 *     FAST2SMS_ROUTE=dlt in .env.local.
 */

const FAST2SMS_BASE_URL = 'https://www.fast2sms.com/dev/bulkV2';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Core send function. All public helpers call this.
 * phone: 10-digit Indian mobile number (no +91 prefix), or with +91
 */
async function sendSMS({
  phone,
  message,
  templateId,
  variables,
}: {
  phone: string;
  message?: string;
  templateId?: string;
  variables?: string[];
}): Promise<SMSResult> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.warn('[Fast2SMS] FAST2SMS_API_KEY not set — skipping SMS.');
    return { success: false, error: 'FAST2SMS_API_KEY not configured' };
  }

  // Normalize phone: strip +91, spaces, dashes → 10-digit
  const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    console.warn(`[Fast2SMS] Invalid phone number: ${phone}`);
    return { success: false, error: 'Invalid phone number' };
  }

  const route = process.env.FAST2SMS_ROUTE || 'q';
  const senderId = process.env.FAST2SMS_SENDER_ID || 'DRFTNC';

  // Build query params
  const params = new URLSearchParams({
    authorization: apiKey,
    sender_id: senderId,
    route,
    numbers: cleanPhone,
  });

  if (route === 'dlt' && templateId && variables?.length) {
    // DLT route: use registered template + variables
    params.set('message', templateId);
    params.set('variables_values', variables.join('|'));
  } else {
    // Quick/test route: plain message body
    params.set('message', message || '');
  }

  try {
    const res = await fetch(`${FAST2SMS_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'cache-control': 'no-cache',
      },
    });

    const data = await res.json();

    if (data.return === true || data.return === 'true') {
      console.log(`[Fast2SMS] SMS sent to ${cleanPhone}. RequestId: ${data.request_id}`);
      return { success: true, messageId: data.request_id };
    } else {
      console.error('[Fast2SMS] Send failed:', data);
      return { success: false, error: data.message || 'Unknown Fast2SMS error' };
    }
  } catch (err: any) {
    console.error('[Fast2SMS] Network error:', err);
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 1. Order Confirmation SMS
//    Triggered: after payment.captured webhook OR COD order confirmed
//    DLT Template example:
//      "Your DRFTN order {#var#} is confirmed! Total: Rs.{#var#}. Track: https://drftn.in/track"
// ---------------------------------------------------------------------------
export async function sendOrderConfirmationSMS({
  phone,
  orderNumber,
  totalPaise,
}: {
  phone: string;
  orderNumber: string;
  totalPaise: number;
}): Promise<SMSResult> {
  const totalRupees = (totalPaise / 100).toFixed(0);
  const message = `Your DRFTN order ${orderNumber} is confirmed! Total: Rs.${totalRupees}. Track: https://drftn.in/track`;

  return sendSMS({
    phone,
    message,
    templateId: process.env.FAST2SMS_ORDER_CONFIRM_TEMPLATE_ID,
    variables: [orderNumber, totalRupees],
  });
}

// ---------------------------------------------------------------------------
// 2. Order Shipped SMS
//    Triggered: when admin assigns AWB in /api/admin/orders/[orderId]/shipment
//    DLT Template example:
//      "DRFTN order {#var#} shipped via {#var#} (AWB: {#var#}). Track: https://drftn.in/track"
// ---------------------------------------------------------------------------
export async function sendOrderShippedSMS({
  phone,
  orderNumber,
  courierPartner,
  trackingNumber,
}: {
  phone: string;
  orderNumber: string;
  courierPartner: string;
  trackingNumber: string;
}): Promise<SMSResult> {
  const message = `DRFTN order ${orderNumber} is shipped via ${courierPartner} (AWB: ${trackingNumber}). Track: https://drftn.in/track`;

  return sendSMS({
    phone,
    message,
    templateId: process.env.FAST2SMS_ORDER_SHIPPED_TEMPLATE_ID,
    variables: [orderNumber, courierPartner, trackingNumber],
  });
}

// ---------------------------------------------------------------------------
// 3. Out for Delivery SMS
//    Triggered: Borzo status=active OR Shiprocket "out for delivery" webhook
//    DLT Template example:
//      "DRFTN order {#var#} is out for delivery today! Please keep your phone handy."
// ---------------------------------------------------------------------------
export async function sendOutForDeliverySMS({
  phone,
  orderNumber,
}: {
  phone: string;
  orderNumber: string;
}): Promise<SMSResult> {
  const message = `Your DRFTN order ${orderNumber} is out for delivery today! Please keep your phone handy.`;

  return sendSMS({
    phone,
    message,
    templateId: process.env.FAST2SMS_OUT_FOR_DELIVERY_TEMPLATE_ID,
    variables: [orderNumber],
  });
}

// ---------------------------------------------------------------------------
// 4. Delivered SMS
//    Triggered: Borzo status=completed OR Shiprocket "delivered" webhook
//    DLT Template example:
//      "DRFTN order {#var#} delivered! Thanks for shopping with us."
// ---------------------------------------------------------------------------
export async function sendDeliveredSMS({
  phone,
  orderNumber,
}: {
  phone: string;
  orderNumber: string;
}): Promise<SMSResult> {
  const message = `Your DRFTN order ${orderNumber} has been delivered! We hope you love it. Shop again: https://drftn.in`;

  return sendSMS({
    phone,
    message,
    templateId: process.env.FAST2SMS_DELIVERED_TEMPLATE_ID,
    variables: [orderNumber],
  });
}
