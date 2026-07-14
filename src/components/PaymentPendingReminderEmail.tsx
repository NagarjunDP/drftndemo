import * as React from 'react';

interface PaymentPendingReminderEmailProps {
  orderNumber: string;
  customerName: string;
  items: Array<{ name: string; size: string; quantity: number; price: number }>;
  totalPaise: number;
  minutesRemaining: number;
}

export function PaymentPendingReminderEmail({
  orderNumber,
  customerName,
  items,
  totalPaise,
  minutesRemaining,
}: PaymentPendingReminderEmailProps) {
  const totalRupees = (totalPaise / 100).toFixed(2);
  const checkoutUrl = "https://www.drftnclothing.in/checkout"; // canonical checkout link

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
                  <img src="https://www.drftnclothing.in/logo.png?v=3" alt="DRFTN" width="130" style={{ display: 'block', border: 'none', outline: 'none' }} />
                </td>
              </tr>

              {/* Body */}
              <tr>
                <td style={{ padding: '36px 40px' }}>
                  <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: '#e63329' }}>Complete Your Checkout</h1>
                  <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#888', lineHeight: 1.5 }}>Reservation Number <strong style={{ color: '#ccc' }}>{orderNumber}</strong></p>

                  <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    Hi {customerName},
                  </p>
                  <p style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    Your items are reserved, but payment is incomplete. To secure your fits, please complete the payment within the next <strong>{minutesRemaining} minutes</strong>. 
                  </p>
                  
                  <p style={{ margin: '0 0 28px', fontSize: '14px', lineHeight: 1.7, color: '#ff6666' }}>
                    ⚠️ <strong>Important:</strong> If payment isn&apos;t completed within {minutesRemaining} minutes, your hold will automatically expire, the items will be released back to the stock pool, and they may sell out.
                  </p>

                  {/* Call to Action button */}
                  <table width="100%" cellPadding="0" cellSpacing="0" style={{ margin: '0 0 32px' }}>
                    <tr>
                      <td align="center">
                        <a href={checkoutUrl} style={{
                          display: 'inline-block',
                          padding: '14px 32px',
                          background: '#ffffff',
                          color: '#000000',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '2px',
                          textDecoration: 'none',
                          borderRadius: '0px'
                        }}>
                          Complete Payment Now
                        </a>
                      </td>
                    </tr>
                  </table>

                  {/* Reserved Items */}
                  <p style={{ margin: '0 0 12px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#666', fontWeight: 'bold', borderBottom: '1px solid #1e1e1e', paddingBottom: '6px' }}>Reserved Items</p>
                  <table width="100%" cellPadding="0" cellSpacing="0" style={{ margin: '0 0 28px' }}>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td style={{ padding: '10px 0', fontSize: '14px', color: '#ccc' }}>
                          {item.name} ({item.size}) <span style={{ color: '#666', fontSize: '12px' }}>x{item.quantity}</span>
                        </td>
                        <td align="right" style={{ padding: '10px 0', fontSize: '14px', color: '#ffffff', fontWeight: 'bold' }}>
                          ₹{((item.price * item.quantity) / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '1px solid #1e1e1e' }}>
                      <td style={{ padding: '16px 0 0', fontSize: '15px', fontWeight: 'bold', color: '#ffffff' }}>Order Total</td>
                      <td align="right" style={{ padding: '16px 0 0', fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>₹{totalRupees}</td>
                    </tr>
                  </table>

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
