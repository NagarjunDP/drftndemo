import * as React from 'react';

interface DeliveryStatusEmailProps {
  orderNumber: string;
  customerName: string;
  status: 'shipped' | 'out_for_delivery' | 'cancelled';
  items: Array<{ name: string; size: string; quantity: number; price: number }>;
  totalPaise: number;
  courierPartner?: string | null;
  trackingNumber?: string | null;
}

export function DeliveryStatusEmail({
  orderNumber,
  customerName,
  status,
  items,
  totalPaise,
  courierPartner,
  trackingNumber,
}: DeliveryStatusEmailProps) {
  const totalRupees = (totalPaise / 100).toFixed(2);

  let title = 'Order Update';
  let message = 'There is an update regarding your order.';

  if (status === 'shipped') {
    title = 'Your order is on the way!';
    message = 'Good news! Your order has been packed and handed over to our courier partner. It is now on its way to you.';
  } else if (status === 'out_for_delivery') {
    title = 'Out for delivery ⚡';
    message = 'Get ready! Our delivery partner is out with your package and will arrive at your address today.';
  } else if (status === 'cancelled') {
    title = 'Order Cancelled';
    message = 'Your order has been cancelled. If this payment was prepaid, your refund has been automatically initiated and will be credited to your original payment method in 5-7 business days.';
  }

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
                  <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: status === 'cancelled' ? '#ff4d4d' : '#ffffff' }}>{title}</h1>
                  <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#888', lineHeight: 1.5 }}>Order <strong style={{ color: '#ccc' }}>{orderNumber}</strong></p>

                  <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    Hi {customerName},
                  </p>
                  <p style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    {message}
                  </p>

                  {/* Delivery details if available */}
                  {status !== 'cancelled' && (courierPartner || trackingNumber) && (
                    <table width="100%" cellPadding="0" cellSpacing="0" style={{ margin: '0 0 28px' }}>
                      <tr>
                        <td style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '16px 20px' }}>
                          <p style={{ margin: '0 0 4px', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Tracking Details</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#ccc', lineHeight: '1.6' }}>
                            {courierPartner && <span><strong>Carrier:</strong> {courierPartner}<br /></span>}
                            {trackingNumber && <span><strong>AWB Tracking ID:</strong> {trackingNumber}<br /></span>}
                            <span>You can track your order status live anytime at <a href="https://www.drftnclothing.in/track" style={{ color: '#ffffff', textDecoration: 'underline' }}>drftnclothing.in/track</a>.</span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  )}

                  {/* Summary of Items */}
                  <p style={{ margin: '0 0 12px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#666', fontWeight: 'bold', borderBottom: '1px solid #1e1e1e', paddingBottom: '6px' }}>Order details</p>
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
                      <td style={{ padding: '12px 0 0', fontSize: '15px', fontWeight: 'bold', color: '#ffffff' }}>Total</td>
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
