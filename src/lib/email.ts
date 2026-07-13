import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_for_build');

// The verified "from" address must match a domain you've added in Resend.
// Until your custom domain is verified, use the Resend sandbox address.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'DRFTN <onboarding@resend.dev>';
const ADMIN_EMAIL  = process.env.RESEND_ADMIN_EMAIL || 'drftnclothing@gmail.com';

/**
 * Sends a refund notification email to the customer and a BCC copy to admin.
 * Called fire-and-forget — failures are logged but never throw.
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

  const refundRupees = (refundAmountPaise / 100).toFixed(2);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Refund Confirmation – DRFTN</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e8e8e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;border-bottom:1px solid #1e1e1e;">
              <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:4px;color:#ffffff;">DRFTN</p>
              <p style="margin:6px 0 0;font-size:11px;letter-spacing:2px;color:#666;text-transform:uppercase;">Clothing</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#ffffff;">Refund Issued</h1>
              <p style="margin:0 0 28px;font-size:14px;color:#888;line-height:1.5;">Order <strong style="color:#ccc;">${orderNumber}</strong></p>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#ccc;">
                Hi ${customerName},
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#ccc;">
                We're sorry — your payment for <strong style="color:#fff;">${productName}</strong>
                was received, but the item sold out moments before your checkout completed.
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#ccc;">
                A full refund of <strong style="color:#fff;">₹${refundRupees}</strong> has been
                automatically initiated to your original payment method. Most banks reflect this
                within <strong style="color:#fff;">5–7 business days</strong>.
              </p>

              <!-- Refund amount highlight -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#666;">Refund Amount</p>
                    <p style="margin:0;font-size:26px;font-weight:700;color:#ffffff;">₹${refundRupees}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#ccc;">
                We drop limited pieces and sometimes demand exceeds supply in the final seconds.
                Follow us for the next drop — you'll get first access.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #1e1e1e;">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
                Questions? Reply to this email or reach us at
                <a href="mailto:drftnclothing@gmail.com" style="color:#888;text-decoration:none;">drftnclothing@gmail.com</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#333;">
                © ${new Date().getFullYear()} DRFTN Clothing. Bengaluru, India.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [customerEmail],
      bcc: [ADMIN_EMAIL],
      subject: `Refund Issued – Order ${orderNumber} | DRFTN`,
      html,
    });

    if (error) {
      console.error(`[Email] Resend error for order ${orderNumber}:`, error);
    } else {
      console.log(`[Email] Refund email sent for order ${orderNumber} to ${customerEmail}`);
    }
  } catch (err) {
    console.error(`[Email] Failed to send refund email for order ${orderNumber}:`, err);
  }
}

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

  const isPickup = fulfillmentType === 'pickup';
  const totalRupees = (totalPaise / 100).toFixed(2);
  const shippingRupees = (shippingChargePaise / 100).toFixed(2);
  const discountRupees = (discountAmountPaise / 100).toFixed(2);
  const subtotalPaise = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const subtotalRupees = (subtotalPaise / 100).toFixed(2);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmed – DRFTN</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e8e8e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;border-bottom:1px solid #1e1e1e;">
              <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:4px;color:#ffffff;">DRFTN</p>
              <p style="margin:6px 0 0;font-size:11px;letter-spacing:2px;color:#666;text-transform:uppercase;">Clothing</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#ffffff;">Order Confirmed</h1>
              <p style="margin:0 0 28px;font-size:14px;color:#888;line-height:1.5;">Order <strong style="color:#ccc;">${orderNumber}</strong></p>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#ccc;">
                Hi ${customerName},
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#ccc;">
                Welcome to the drop. Your order has been successfully placed and confirmed. Below is your order summary.
              </p>

              <!-- Pickup code / Shipping Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:20px 24px;">
                    ${isPickup ? `
                      <p style="margin:0 0 4px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#888;font-weight:bold;">In-Store Pickup Code</p>
                      <p style="margin:0 0 16px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:4px;">${pickupCode}</p>
                      <p style="margin:0;font-size:13px;line-height:1.6;color:#ccc;">
                        <strong>Store pickup address:</strong><br />
                        DRFTN Store, 1st Floor, Kogilu Main Rd, above Sri Venkateshwar Vaibhava Veg Hotel, K B Sandra, Yelahanka, Bengaluru - 560064
                      </p>
                      <p style="margin:8px 0 0;font-size:11px;color:#666;">Show this code to the store staff when picking up your fits.</p>
                    ` : `
                      <p style="margin:0 0 8px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#888;font-weight:bold;">Shipping Address</p>
                      <p style="margin:0;font-size:13px;line-height:1.6;color:#ccc;">
                        <strong>${customerName}</strong><br />
                        ${shippingAddress?.line1}<br />
                        ${shippingAddress?.line2 ? `${shippingAddress.line2}<br />` : ''}
                        ${shippingAddress?.city}, ${shippingAddress?.state} - ${shippingAddress?.pincode}
                      </p>
                    `}
                  </td>
                </tr>
              </table>

              <!-- secured fits -->
              <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;font-weight:bold;border-bottom:1px solid #1e1e1e;padding-bottom:6px;">Secured Fits</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                ${items.map(item => `
                  <tr>
                    <td style="padding:10px 0;font-size:14px;color:#ccc;">
                      ${item.name} (${item.size}) <span style="color:#666;font-size:12px;">x${item.quantity}</span>
                    </td>
                    <td align="right" style="padding:10px 0;font-size:14px;color:#ffffff;font-weight:bold;">
                      ₹${((item.price * item.quantity) / 100).toFixed(2)}
                    </td>
                  </tr>
                `).join('')}
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #1e1e1e;padding-top:16px;">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;">Subtotal</td>
                  <td align="right" style="padding:6px 0;font-size:13px;color:#ccc;">₹${subtotalRupees}</td>
                </tr>
                ${shippingChargePaise > 0 ? `
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#888;">Shipping &amp; Handling</td>
                    <td align="right" style="padding:6px 0;font-size:13px;color:#ccc;">₹${shippingRupees}</td>
                  </tr>
                ` : ''}
                ${discountAmountPaise > 0 ? `
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#e63329;">Discount</td>
                    <td align="right" style="padding:6px 0;font-size:13px;color:#e63329;">-₹${discountRupees}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td style="padding:12px 0 0;font-size:15px;font-weight:bold;color:#ffffff;">Total Paid</td>
                  <td align="right" style="padding:12px 0 0;font-size:18px;font-weight:bold;color:#ffffff;">₹${totalRupees}</td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #1e1e1e;">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
                Questions? Reply to this email or reach us at
                <a href="mailto:drftnclothing@gmail.com" style="color:#888;text-decoration:none;">drftnclothing@gmail.com</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#333;">
                © ${new Date().getFullYear()} DRFTN Clothing. Bengaluru, India.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [customerEmail],
      bcc: [ADMIN_EMAIL],
      subject: `Order Confirmed – Order ${orderNumber} | DRFTN`,
      html,
    });

    if (error) {
      console.error(`[Email] Resend error for success order ${orderNumber}:`, error);
    } else {
      console.log(`[Email] Order success email sent for order ${orderNumber} to ${customerEmail}`);
    }
  } catch (err) {
    console.error(`[Email] Failed to send order success email for order ${orderNumber}:`, err);
  }
}
