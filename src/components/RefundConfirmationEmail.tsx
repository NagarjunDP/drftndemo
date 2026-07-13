import * as React from 'react';

interface RefundConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
  productName: string;
  refundAmountPaise: number;
}

export function RefundConfirmationEmail({
  orderNumber,
  customerName,
  productName,
  refundAmountPaise,
}: RefundConfirmationEmailProps) {
  const refundRupees = (refundAmountPaise / 100).toFixed(2);

  return (
    <div style={{
      margin: 0,
      padding: 0,
      background: '#0a0a0a',
      fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif",
      color: '#e8e8e8'
    }}>
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: '#0a0a0a', padding: '40px 20px' }}>
        <tr>
          <td align="center">
            <table width="580" cellPadding="0" cellSpacing="0" style={{ background: '#111111', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2a2a2a' }}>

              {/* Header */}
              <tr>
                <td style={{ padding: '36px 40px 28px', borderBottom: '1px solid #1e1e1e' }}>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: 700, letterSpacing: '4px', color: '#ffffff' }}>DRFTN</p>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', letterSpacing: '2px', color: '#666', textTransform: 'uppercase' }}>Clothing</p>
                </td>
              </tr>

              {/* Body */}
              <tr>
                <td style={{ padding: '36px 40px' }}>
                  <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>Refund Issued</h1>
                  <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#888', lineHeight: 1.5 }}>Order <strong style={{ color: '#ccc' }}>{orderNumber}</strong></p>

                  <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    Hi {customerName},
                  </p>
                  <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    We&apos;re sorry — your payment for <strong style={{ color: '#fff' }}>{productName}</strong>
                    was received, but the item sold out moments before your checkout completed.
                  </p>
                  <p style={{ margin: '0 0 28px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    A full refund of <strong style={{ color: '#fff' }}>{refundRupees}</strong> has been
                    automatically initiated to your original payment method. Most banks reflect this
                    within <strong style={{ color: '#fff' }}>5–7 business days</strong>.
                  </p>

                  {/* Refund amount highlight */}
                  <table width="100%" cellPadding="0" cellSpacing="0" style={{ margin: '0 0 28px' }}>
                    <tr>
                      <td style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '20px 24px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#666' }}>Refund Amount</p>
                        <p style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#ffffff' }}>₹{refundRupees}</p>
                      </td>
                    </tr>
                  </table>

                  <p style={{ margin: '0 0 8px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    We drop limited pieces and sometimes demand exceeds supply in the final seconds.
                    Follow us for the next drop — you&apos;ll get first access.
                  </p>
                </td>
              </tr>

              {/* Footer */}
              <tr>
                <td style={{ padding: '24px 40px', borderTop: '1px solid #1e1e1e' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#444', lineHeight: 1.6 }}>
                    Questions? Reply to this email or reach us at{' '}
                    <a href="mailto:drftnclothing@gmail.com" style={{ color: '#888', textDecoration: 'none' }}>drftnclothing@gmail.com</a>
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#333' }}>
                    © {new Date().getFullYear()} DRFTN Clothing. Bengaluru, India.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </div>
  );
}
