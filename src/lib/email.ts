import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
