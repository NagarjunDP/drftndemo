import * as React from 'react';

interface DeliverySuccessEmailProps {
  orderNumber: string;
  customerName: string;
  items: Array<{ name: string; size: string; quantity: number; price: number }>;
  totalPaise: number;
  courierPartner?: string | null;
  trackingNumber?: string | null;
}

export function DeliverySuccessEmail({
  orderNumber,
  customerName,
  items,
  totalPaise,
  courierPartner,
  trackingNumber,
}: DeliverySuccessEmailProps) {
  const totalRupees = (totalPaise / 100).toFixed(2);

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
                  <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>Delivered successfully</h1>
                  <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#888', lineHeight: 1.5 }}>Order <strong style={{ color: '#ccc' }}>{orderNumber}</strong></p>

                  <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    Hi {customerName},
                  </p>
                  <p style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    Your order has been successfully delivered. We hope you love your new fits! Below is a summary of your items.
                  </p>

                  {/* Delivery details if available */}
                  {(courierPartner || trackingNumber) && (
                    <table width="100%" cellPadding="0" cellSpacing="0" style={{ margin: '0 0 28px' }}>
                      <tr>
                        <td style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '16px 20px' }}>
                          <p style={{ margin: '0 0 4px', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Delivery Details</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#ccc', lineHeight: '1.6' }}>
                            {courierPartner && <span><strong>Carrier:</strong> {courierPartner}<br /></span>}
                            {trackingNumber && <span><strong>Tracking AWB:</strong> {trackingNumber}</span>}
                          </p>
                        </td>
                      </tr>
                    </table>
                  )}

                  {/* Summary of Items */}
                  <p style={{ margin: '0 0 12px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#666', fontWeight: 'bold', borderBottom: '1px solid #1e1e1e', paddingBottom: '6px' }}>Delivered fits</p>
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
                  </table>

                  {/* Total Paid */}
                  <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderTop: '1px solid #1e1e1e', paddingTop: '16px' }}>
                    <tr>
                      <td style={{ padding: '12px 0 0', fontSize: '15px', fontWeight: 'bold', color: '#ffffff' }}>Total Paid</td>
                      <td align="right" style={{ padding: '12px 0 0', fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>₹{totalRupees}</td>
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
