import * as React from 'react';

interface OrderConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
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
}

export function OrderConfirmationEmail({
  orderNumber,
  customerName,
  items,
  totalPaise,
  shippingChargePaise,
  discountAmountPaise,
  fulfillmentType,
  pickupCode,
  shippingAddress,
}: OrderConfirmationEmailProps) {
  const isPickup = fulfillmentType === 'pickup';
  const totalRupees = (totalPaise / 100).toFixed(2);
  const shippingRupees = (shippingChargePaise / 100).toFixed(2);
  const discountRupees = (discountAmountPaise / 100).toFixed(2);
  const subtotalPaise = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const subtotalRupees = (subtotalPaise / 100).toFixed(2);

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
                  <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>Order Confirmed</h1>
                  <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#888', lineHeight: 1.5 }}>Order <strong style={{ color: '#ccc' }}>{orderNumber}</strong></p>

                  <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    Hi {customerName},
                  </p>
                  <p style={{ margin: '0 0 28px', fontSize: '15px', lineHeight: 1.7, color: '#ccc' }}>
                    Welcome to the drop. Your order has been successfully placed and confirmed. Below is your order summary.
                  </p>

                  {/* Pickup code / Shipping Info */}
                  <table width="100%" cellPadding="0" cellSpacing="0" style={{ margin: '0 0 28px' }}>
                    <tr>
                      <td style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '20px 24px' }}>
                        {isPickup ? (
                          <div>
                            <p style={{ margin: '0 0 4px', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>In-Store Pickup Code</p>
                            <p style={{ margin: '0 0 16px', fontSize: '28px', fontWeight: 900, color: '#ffffff', letterSpacing: '4px' }}>{pickupCode}</p>
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#ccc' }}>
                              <strong>Store pickup address:</strong><br />
                              DRFTN Store, 1st Floor, Kogilu Main Rd, above Sri Venkateshwar Vaibhava Veg Hotel, K B Sandra, Yelahanka, Bengaluru - 560064
                            </p>
                            <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#666' }}>Show this code to the store staff when picking up your fits.</p>
                          </div>
                        ) : (
                          <div>
                            <p style={{ margin: '0 0 8px', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Shipping Address</p>
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#ccc' }}>
                              <strong>{customerName}</strong><br />
                              {shippingAddress?.line1}<br />
                              {shippingAddress?.line2 ? `${shippingAddress.line2}\n` : ''}
                              {shippingAddress?.city}, {shippingAddress?.state} - {shippingAddress?.pincode}
                            </p>
                          </div>
                        )}
                      </td>
                    </tr>
                  </table>

                  {/* Secured Fits */}
                  <p style={{ margin: '0 0 12px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#666', fontWeight: 'bold', borderBottom: '1px solid #1e1e1e', paddingBottom: '6px' }}>Secured Fits</p>
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

                  {/* Totals */}
                  <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderTop: '1px solid #1e1e1e', paddingTop: '16px' }}>
                    <tr>
                      <td style={{ padding: '6px 0', fontSize: '13px', color: '#888' }}>Subtotal</td>
                      <td align="right" style={{ padding: '6px 0', fontSize: '13px', color: '#ccc' }}>₹{subtotalRupees}</td>
                    </tr>
                    {shippingChargePaise > 0 && (
                      <tr>
                        <td style={{ padding: '6px 0', fontSize: '13px', color: '#888' }}>Shipping &amp; Handling</td>
                        <td align="right" style={{ padding: '6px 0', fontSize: '13px', color: '#ccc' }}>₹{shippingRupees}</td>
                      </tr>
                    )}
                    {discountAmountPaise > 0 && (
                      <tr>
                        <td style={{ padding: '6px 0', fontSize: '13px', color: '#e63329' }}>Discount</td>
                        <td align="right" style={{ padding: '6px 0', fontSize: '13px', color: '#e63329' }}>-₹{discountRupees}</td>
                      </tr>
                    )}
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
