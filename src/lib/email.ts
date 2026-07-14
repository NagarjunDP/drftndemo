import { Resend } from 'resend';
import * as React from 'react';
import { OrderConfirmationEmail } from '@/components/OrderConfirmationEmail';
import { RefundConfirmationEmail } from '@/components/RefundConfirmationEmail';
import { PickupSuccessEmail } from '@/components/PickupSuccessEmail';
import { DeliverySuccessEmail } from '@/components/DeliverySuccessEmail';
import { DepositConfirmationEmail } from '@/components/DepositConfirmationEmail';
import { PaymentPendingReminderEmail } from '@/components/PaymentPendingReminderEmail';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_for_build');

// The verified "from" address must match a domain you've added in Resend.
// e.g. RESEND_FROM_EMAIL="DRFTN <orders@drftnclothing.in>"
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'DRFTN <onboarding@resend.dev>';
const REPLY_TO_EMAIL = 'drftnclothing2@gmail.com';
const ADMIN_CC_EMAIL = 'drftnclothing@gmail.com';

/**
 * Sends a refund notification email to the customer by rendering a React component to static HTML.
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
    // Dynamic import to bypass Next.js static build checks for react-dom/server in route handlers
    const { renderToStaticMarkup } = await import('react-dom/server');
    const htmlString = renderToStaticMarkup(
      React.createElement(RefundConfirmationEmail, {
        orderNumber,
        customerName,
        productName,
        refundAmountPaise,
      })
    );

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [customerEmail],
      cc: [ADMIN_CC_EMAIL],
      replyTo: REPLY_TO_EMAIL,
      subject: `Refund Issued – Order ${orderNumber} | DRFTN`,
      html: htmlString,
    });

    if (error) {
      console.error(`[Email] Resend error for refund email on order ${orderNumber}:`, error);
      throw new Error(`Resend API Error: ${error.name} - ${error.message} (Code: ${(error as any).code || 'N/A'})`);
    } else {
      console.log(`[Email] Refund email sent successfully for order ${orderNumber} to ${customerEmail}`);
    }
  } catch (err: any) {
    console.error(`[Email] Failed to send refund email for order ${orderNumber}:`, err);
    throw err;
  }
}

/**
 * Sends an order confirmation email to the customer by rendering a React component to static HTML.
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
    // Dynamic import to bypass Next.js static build checks for react-dom/server in route handlers
    const { renderToStaticMarkup } = await import('react-dom/server');
    const htmlString = renderToStaticMarkup(
      React.createElement(OrderConfirmationEmail, {
        orderNumber,
        customerName,
        items,
        totalPaise,
        shippingChargePaise,
        discountAmountPaise,
        fulfillmentType,
        pickupCode,
        shippingAddress,
      })
    );

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [customerEmail],
      cc: [ADMIN_CC_EMAIL],
      replyTo: REPLY_TO_EMAIL,
      subject: `Order Confirmed – Order ${orderNumber} | DRFTN`,
      html: htmlString,
    });

    if (error) {
      console.error(`[Email] Resend error for success email on order ${orderNumber}:`, error);
      throw new Error(`Resend API Error: ${error.name} - ${error.message} (Code: ${(error as any).code || 'N/A'})`);
    } else {
      console.log(`[Email] Order success email sent successfully for order ${orderNumber} to ${customerEmail}`);
    }
  } catch (err: any) {
    console.error(`[Email] Failed to send order success email for order ${orderNumber}:`, err);
    throw err;
  }
}

/**
 * Sends a pickup success notification email to the customer.
 */
export async function sendPickupSuccessEmail({
  orderNumber,
  customerName,
  customerEmail,
  items,
  totalPaise,
}: {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null | undefined;
  items: Array<{ name: string; size: string; quantity: number; price: number }>;
  totalPaise: number;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping pickup success email.');
    return;
  }

  if (!customerEmail) {
    console.warn(`[Email] No customer email on order ${orderNumber} — skipping pickup success email.`);
    return;
  }

  try {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const htmlString = renderToStaticMarkup(
      React.createElement(PickupSuccessEmail, {
        orderNumber,
        customerName,
        items,
        totalPaise,
      })
    );

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [customerEmail],
      cc: [ADMIN_CC_EMAIL],
      replyTo: REPLY_TO_EMAIL,
      subject: `Collected: Order ${orderNumber} | DRFTN`,
      html: htmlString,
    });

    if (error) {
      console.error(`[Email] Resend error for pickup success email on order ${orderNumber}:`, error);
      throw new Error(`Resend API Error: ${error.name} - ${error.message}`);
    } else {
      console.log(`[Email] Pickup success email sent successfully for order ${orderNumber} to ${customerEmail}`);
    }
  } catch (err: any) {
    console.error(`[Email] Failed to send pickup success email for order ${orderNumber}:`, err);
    throw err;
  }
}

/**
 * Sends a delivery success notification email to the customer.
 */
export async function sendDeliverySuccessEmail({
  orderNumber,
  customerName,
  customerEmail,
  items,
  totalPaise,
  courierPartner,
  trackingNumber,
}: {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null | undefined;
  items: Array<{ name: string; size: string; quantity: number; price: number }>;
  totalPaise: number;
  courierPartner?: string | null;
  trackingNumber?: string | null;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping delivery success email.');
    return;
  }

  if (!customerEmail) {
    console.warn(`[Email] No customer email on order ${orderNumber} — skipping delivery success email.`);
    return;
  }

  try {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const htmlString = renderToStaticMarkup(
      React.createElement(DeliverySuccessEmail, {
        orderNumber,
        customerName,
        items,
        totalPaise,
        courierPartner,
        trackingNumber,
      })
    );

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [customerEmail],
      cc: [ADMIN_CC_EMAIL],
      replyTo: REPLY_TO_EMAIL,
      subject: `Delivered: Order ${orderNumber} | DRFTN`,
      html: htmlString,
    });

    if (error) {
      console.error(`[Email] Resend error for delivery success email on order ${orderNumber}:`, error);
      throw new Error(`Resend API Error: ${error.name} - ${error.message}`);
    } else {
      console.log(`[Email] Delivery success email sent successfully for order ${orderNumber} to ${customerEmail}`);
    }
  } catch (err: any) {
    console.error(`[Email] Failed to send delivery success email for order ${orderNumber}:`, err);
    throw err;
  }
}

/**
 * Sends a COD deposit receipt & order confirmation email to the customer.
 */
export async function sendDepositConfirmationEmail({
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
    console.warn('[Email] RESEND_API_KEY not set — skipping deposit success email.');
    return;
  }

  if (!customerEmail) {
    console.warn(`[Email] No customer email on order ${orderNumber} — skipping deposit success email.`);
    return;
  }

  try {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const htmlString = renderToStaticMarkup(
      React.createElement(DepositConfirmationEmail, {
        orderNumber,
        customerName,
        items,
        totalPaise,
        shippingChargePaise,
        discountAmountPaise,
        fulfillmentType,
        pickupCode,
        shippingAddress,
      })
    );

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [customerEmail],
      cc: [ADMIN_CC_EMAIL],
      replyTo: REPLY_TO_EMAIL,
      subject: `COD Order Confirmed – Order ${orderNumber} | DRFTN`,
      html: htmlString,
    });

    if (error) {
      console.error(`[Email] Resend error for deposit success email on order ${orderNumber}:`, error);
      throw new Error(`Resend API Error: ${error.name} - ${error.message}`);
    } else {
      console.log(`[Email] Deposit success email sent successfully for order ${orderNumber} to ${customerEmail}`);
    }
  } catch (err: any) {
    console.error(`[Email] Failed to send deposit success email for order ${orderNumber}:`, err);
    throw err;
  }
}

/**
 * Sends an incomplete prepaid order payment pending reminder email.
 */
export async function sendPaymentPendingReminderEmail({
  orderNumber,
  customerName,
  customerEmail,
  items,
  totalPaise,
  minutesRemaining,
}: {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null | undefined;
  items: Array<{ name: string; size: string; quantity: number; price: number }>;
  totalPaise: number;
  minutesRemaining: number;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping payment reminder email.');
    return;
  }

  if (!customerEmail) {
    console.warn(`[Email] No customer email on order ${orderNumber} — skipping payment reminder email.`);
    return;
  }

  try {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const htmlString = renderToStaticMarkup(
      React.createElement(PaymentPendingReminderEmail, {
        orderNumber,
        customerName,
        items,
        totalPaise,
        minutesRemaining,
      })
    );

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [customerEmail],
      replyTo: REPLY_TO_EMAIL,
      subject: `Action Required: Complete your order ${orderNumber} | DRFTN`,
      html: htmlString,
    });

    if (error) {
      console.error(`[Email] Resend error for payment reminder email on order ${orderNumber}:`, error);
      throw new Error(`Resend API Error: ${error.name} - ${error.message}`);
    } else {
      console.log(`[Email] Payment reminder email sent successfully for order ${orderNumber} to ${customerEmail}`);
    }
  } catch (err: any) {
    console.error(`[Email] Failed to send payment reminder email for order ${orderNumber}:`, err);
    throw err;
  }
}
