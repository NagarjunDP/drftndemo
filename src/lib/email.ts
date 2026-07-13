import { Resend } from 'resend';
import * as React from 'react';
import { OrderConfirmationEmail } from '@/components/OrderConfirmationEmail';
import { RefundConfirmationEmail } from '@/components/RefundConfirmationEmail';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_for_build');

// The verified "from" address must match a domain you've added in Resend.
// e.g. RESEND_FROM_EMAIL="DRFTN <orders@drftnclothing.in>"
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'DRFTN <onboarding@resend.dev>';
const REPLY_TO_EMAIL = 'drftnclothing2@gmail.com';
const ADMIN_CC_EMAIL = 'drftnclothing@gmail.com';

/**
 * Sends a refund notification email to the customer using a React component.
 */
export async function sendRefundEmail({
  orderNumber,
  customerName,
  customerEmail,
  productName,
  refundAmountPaise,
}: {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null | undefined;
  productName: string;
  refundAmountPaise: number;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping refund email.');
    return;
  }

  if (!customerEmail) {
    console.warn(`[Email] No customer email on order ${orderNumber} — skipping refund email.`);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [customerEmail],
      cc: [ADMIN_CC_EMAIL],
      replyTo: REPLY_TO_EMAIL,
      subject: `Refund Issued – Order ${orderNumber} | DRFTN`,
      react: React.createElement(RefundConfirmationEmail, {
        orderNumber,
        customerName,
        productName,
        refundAmountPaise,
      }),
    });

    if (error) {
      console.error(`[Email] Resend error for refund email on order ${orderNumber}:`, error);
    } else {
      console.log(`[Email] Refund email sent successfully for order ${orderNumber} to ${customerEmail}`);
    }
  } catch (err) {
    console.error(`[Email] Failed to send refund email for order ${orderNumber}:`, err);
  }
}

/**
 * Sends an order confirmation email to the customer using a React component.
 */
export async function sendOrderSuccessEmail({
  orderNumber,
  customerName,
  customerEmail,
  items,
  totalPaise,
  shippingChargePaise,
  discountAmountPaise,
  fulfillmentType,
  pickupCode,
  shippingAddress,
}: {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null | undefined;
  items: Array<{ name: string; size: string; quantity: number; price: number }>;
  totalPaise: number;
  shippingChargePaise: number;
  discountAmountPaise: number;
  fulfillmentType: string;
  pickupCode: string | null;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping order success email.');
    return;
  }

  if (!customerEmail) {
    console.warn(`[Email] No customer email on order ${orderNumber} — skipping order success email.`);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [customerEmail],
      cc: [ADMIN_CC_EMAIL],
      replyTo: REPLY_TO_EMAIL,
      subject: `Order Confirmed – Order ${orderNumber} | DRFTN`,
      react: React.createElement(OrderConfirmationEmail, {
        orderNumber,
        customerName,
        items,
        totalPaise,
        shippingChargePaise,
        discountAmountPaise,
        fulfillmentType,
        pickupCode,
        shippingAddress,
      }),
    });

    if (error) {
      console.error(`[Email] Resend error for success email on order ${orderNumber}:`, error);
    } else {
      console.log(`[Email] Order success email sent successfully for order ${orderNumber} to ${customerEmail}`);
    }
  } catch (err) {
    console.error(`[Email] Failed to send order success email for order ${orderNumber}:`, err);
  }
}
