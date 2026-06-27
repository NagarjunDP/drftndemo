'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';
import { ChevronLeft, Lock, CheckCircle, Package, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ToastContainer';

export default function CheckoutPage() {
  const { items, getCartTotal, discountCode, clearCart } = useCartStore();
  const { addToast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Checkout steps: 1 = Contact & Shipping, 2 = Payment, 3 = Confirmation
  const [currentStep, setCurrentStep] = useState(1);
  const [successOrderInfo, setSuccessOrderInfo] = useState<{ number: string; total: number } | null>(null);

  // Dynamic store configuration
  const [storeConfig, setStoreConfig] = useState({
    razorpayActive: false,
    razorpayKeyId: '',
    freeShippingThreshold: 99900,
    defaultShippingCharge: 9900,
    codFee: 5000,
    whatsappNumber: '+917406164512',
  });

  // Form inputs state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');

  // Fetch settings on mount
  useEffect(() => {
    setMounted(true);
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          setStoreConfig(data);
          // If Razorpay is not active, default to COD or manual
          if (!data.razorpayActive) {
            setPaymentMethod('cod');
          }
        }
      } catch (err) {
        console.error('Failed to load store configurations:', err);
      }
    };
    fetchConfig();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Helper to calculate pricing breakdowns in paise
  const calculateTotalBreakdown = () => {
    const subtotal = getCartTotal(); // in paise
    let discount = 0;

    if (discountCode) {
      if (discountCode.discount_type === 'percent') {
        discount = Math.round(subtotal * (discountCode.discount_value / 100));
      } else {
        discount = discountCode.discount_value;
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    
    // Shipping calculation
    let shippingCharge = discountedSubtotal >= storeConfig.freeShippingThreshold ? 0 : storeConfig.defaultShippingCharge;
    
    // Add COD fee if COD is selected
    if (paymentMethod === 'cod' && storeConfig.razorpayActive) {
      shippingCharge += storeConfig.codFee;
    }

    return {
      subtotal,
      discount,
      shippingCharge,
      total: discountedSubtotal + shippingCharge,
    };
  };

  const loadRazorpaySDK = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Validates step 1 inputs
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validations
    if (!formData.name.trim()) return addToast('Name is required', 'error');
    if (!formData.email.trim() || !formData.email.includes('@')) return addToast('Please enter a valid email address', 'error');
    if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) return addToast('Please enter a valid 10-digit Indian mobile number', 'error');
    if (!formData.line1.trim()) return addToast('Shipping address line 1 is required', 'error');
    if (!formData.city.trim()) return addToast('City is required', 'error');
    if (!formData.state.trim()) return addToast('State is required', 'error');
    if (!/^\d{6}$/.test(formData.pincode.trim())) return addToast('Please enter a valid 6-digit Indian PIN code', 'error');

    setCurrentStep(2);
    window.scrollTo(0, 0);
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    const breakdown = calculateTotalBreakdown();

    try {
      // 1. Call Create Order API
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, size: i.size, quantity: i.quantity })),
          discountCode: discountCode?.code || undefined,
          paymentMethod: paymentMethod,
          customerInfo: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            address: {
              line1: formData.line1.trim(),
              line2: formData.line2 ? formData.line2.trim() : undefined,
              city: formData.city.trim(),
              state: formData.state.trim(),
              pincode: formData.pincode.trim(),
            },
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Order creation failed:', errorData);
        let errorMsg = errorData.error || 'Failed to place order';
        if (errorData.details) {
           errorMsg += ' (Check console for details)';
        }
        throw new Error(errorMsg);
      }

      const orderData = await res.json();

      // Scenario A: Razorpay Prepaid flow
      if (paymentMethod === 'razorpay' && storeConfig.razorpayActive && orderData.razorpayOrderId) {
        const sdkLoaded = await loadRazorpaySDK();
        if (!sdkLoaded) {
          throw new Error('Failed to load Razorpay payment SDK. Please try again.');
        }

        const options = {
          key: storeConfig.razorpayKeyId,
          amount: orderData.amount,
          currency: 'INR',
          name: 'DRFTN CLOTHING',
          description: 'Drift in Style',
          order_id: orderData.razorpayOrderId,
          prefill: {
            name: formData.name,
            email: formData.email,
            contact: formData.phone,
          },
          theme: {
            color: '#E63329',
          },
          handler: async function (response: any) {
            setIsProcessing(true);
            try {
              const verifyRes = await fetch('/api/orders/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: orderData.orderId,
                }),
              });

              if (!verifyRes.ok) {
                const verifyError = await verifyRes.json();
                throw new Error(verifyError.error || 'Signature verification failed');
              }

              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                addToast('Payment successful! Order confirmed.', 'success');
                setSuccessOrderInfo({
                  number: verifyData.orderNumber,
                  total: breakdown.total / 100,
                });
                clearCart();
                setCurrentStep(3);
                window.scrollTo(0, 0);
              }
            } catch (err: any) {
              addToast(err.message || 'Payment verification failed', 'error');
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              addToast('Payment cancelled by user.', 'error');
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } 
      // Scenario B: COD / Cash on Delivery flow (Prepaid setting active but COD selected)
      else if (paymentMethod === 'cod' && storeConfig.razorpayActive) {
        addToast('Order placed successfully (Cash on Delivery)!', 'success');
        setSuccessOrderInfo({
          number: orderData.orderNumber,
          total: breakdown.total / 100,
        });
        clearCart();
        setCurrentStep(3);
        window.scrollTo(0, 0);
      } 
      // Scenario C: Razorpay NOT configured -> WhatsApp manual payment ordering fallback
      else {
        addToast('Order placed. Redirecting to WhatsApp to complete payment...', 'success');
        
        // Prepare pre-filled WhatsApp message
        const itemsListText = items
          .map((i) => `• ${i.name} (Size: ${i.size}) x ${i.quantity}`)
          .join('%0A');
        
        const messageText = `Hello DRFTN CLOTHING! I'd like to complete my streetwear order.%0A%0A*Order Number:* ${orderData.orderNumber}%0A*Customer:* ${formData.name}%0A*Phone:* ${formData.phone}%0A*Address:* ${formData.line1}, ${formData.city} - ${formData.pincode}%0A%0A*Items:*%0A${itemsListText}%0A%0A*Total Amount:* ₹${(breakdown.total / 100).toFixed(2)}`;
        
        const whatsappUrl = `https://wa.me/${storeConfig.whatsappNumber.replace('+', '')}?text=${messageText}`;
        
        // Open WhatsApp link in new tab
        window.open(whatsappUrl, '_blank');

        setSuccessOrderInfo({
          number: orderData.orderNumber,
          total: breakdown.total / 100,
        });
        clearCart();
        setCurrentStep(3);
        window.scrollTo(0, 0);
      }

    } catch (error: any) {
      console.error(error);
      addToast(error.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      if (paymentMethod !== 'razorpay' || !storeConfig.razorpayActive) {
        setIsProcessing(false);
      }
    }
  };

  if (!mounted) return <div className="min-h-screen bg-brand-black" />;

  if (currentStep === 3 && successOrderInfo) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-brand-black text-brand-offwhite">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-widest text-brand-offwhite mb-4 uppercase">Order Confirmed</h1>
        <p className="text-zinc-400 mb-8 max-w-md mx-auto text-sm">
          Thank you for choosing DRFTN CLOTHING. Your order <span className="text-brand-offwhite font-bold">{successOrderInfo.number}</span> has been successfully logged.
        </p>
        <div className="bg-zinc-900/40 border border-zinc-800 p-6 w-full max-w-sm mb-8">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-zinc-500 uppercase tracking-wider text-xs">Total Amount</span>
            <span className="text-brand-offwhite font-bold font-mono">₹{successOrderInfo.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500 uppercase tracking-wider text-xs">Status</span>
            <span className={paymentMethod === 'cod' ? 'text-yellow-500 font-bold uppercase text-xs' : 'text-green-500 font-bold uppercase text-xs'}>
              {paymentMethod === 'cod' ? 'COD - Pending' : 'Paid'}
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800 text-[11px] text-zinc-500 uppercase tracking-widest">
            Estimated Delivery: 3-5 Business Days
          </div>
        </div>
        <div className="flex gap-4">
          <Link href="/shop" className="bg-brand-red text-white px-8 py-3.5 font-bold uppercase tracking-widest text-xs hover:bg-red-600 transition-colors">
            Continue Shopping
          </Link>
          <Link href="/track" className="bg-transparent border border-zinc-700 text-brand-offwhite px-8 py-3.5 font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-colors">
            Track Order
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-brand-black text-brand-offwhite">
        <Package className="w-16 h-16 text-zinc-800 mb-6" />
        <h2 className="text-2xl font-bold text-brand-offwhite mb-4 uppercase tracking-wider">Cart is Empty</h2>
        <p className="text-zinc-500 mb-8 max-w-sm mx-auto text-xs">
          You have no streetwear items in your cart to checkout. Head back to the shop to browse.
        </p>
        <Link href="/shop" className="bg-brand-red text-white px-8 py-3.5 font-bold uppercase tracking-widest text-xs hover:bg-red-600 transition-colors">
          Return to Shop
        </Link>
      </div>
    );
  }

  const { subtotal, discount, shippingCharge, total } = calculateTotalBreakdown();

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 bg-brand-black text-brand-offwhite">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-900">
        <button
          onClick={() => {
            if (currentStep === 2) setCurrentStep(1);
          }}
          className={`inline-flex items-center text-xs uppercase tracking-wider font-bold transition-colors ${
            currentStep === 1 ? 'text-zinc-500 hover:text-brand-offwhite cursor-pointer' : 'text-zinc-400 hover:text-brand-red cursor-pointer'
          }`}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {currentStep === 2 ? 'Back to Details' : 'Checkout'}
        </button>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <span className={currentStep === 1 ? 'text-brand-red' : 'text-zinc-500'}>01 Details</span>
          <span className="text-zinc-700">/</span>
          <span className={currentStep === 2 ? 'text-brand-red' : 'text-zinc-500'}>02 Payment</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Form Details / Payment Selection */}
        <div className="lg:col-span-7 xl:col-span-8">
          
          {currentStep === 1 ? (
            <form onSubmit={handleProceedToPayment} className="space-y-8 animate-fade-in">
              {/* Contact Info */}
              <section className="space-y-4">
                <h2 className="text-base font-bold text-brand-offwhite uppercase tracking-wider border-b border-zinc-900 pb-2">Contact Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold block">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Nagarjun D P"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-brand-offwhite px-4 py-3 text-sm focus:outline-none focus:border-brand-red focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold block">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="e.g. user@domain.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-brand-offwhite px-4 py-3 text-sm focus:outline-none focus:border-brand-red focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold block">Phone Number (10-digit)</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="e.g. 7406164512"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-brand-offwhite px-4 py-3 text-sm focus:outline-none focus:border-brand-red focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                </div>
              </section>

              {/* Shipping Info */}
              <section className="space-y-4">
                <h2 className="text-base font-bold text-brand-offwhite uppercase tracking-wider border-b border-zinc-900 pb-2">Shipping Address</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold block">Address Line 1</label>
                    <input
                      type="text"
                      name="line1"
                      required
                      placeholder="Street address, P.O. box, company name"
                      value={formData.line1}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-brand-offwhite px-4 py-3 text-sm focus:outline-none focus:border-brand-red focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold block">Apartment, suite, unit (optional)</label>
                    <input
                      type="text"
                      name="line2"
                      placeholder="Apartment, suite, unit, building, floor"
                      value={formData.line2}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-brand-offwhite px-4 py-3 text-sm focus:outline-none focus:border-brand-red focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold block">City</label>
                    <input
                      type="text"
                      name="city"
                      required
                      placeholder="e.g. Yelahanka, Bengaluru"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-brand-offwhite px-4 py-3 text-sm focus:outline-none focus:border-brand-red focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold block">State</label>
                    <input
                      type="text"
                      name="state"
                      required
                      placeholder="e.g. Karnataka"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-brand-offwhite px-4 py-3 text-sm focus:outline-none focus:border-brand-red focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold block">PIN Code (6-digit)</label>
                    <input
                      type="text"
                      name="pincode"
                      required
                      placeholder="e.g. 560064"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-brand-offwhite px-4 py-3 text-sm focus:outline-none focus:border-brand-red focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                </div>
              </section>

              {/* Submit Details to Proceed */}
              <button
                type="submit"
                className="w-full bg-brand-offwhite text-brand-black py-4 font-bold uppercase tracking-widest text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Proceed to Payment
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="space-y-8 animate-fade-in">
              <section className="space-y-4">
                <h2 className="text-base font-bold text-brand-offwhite uppercase tracking-wider border-b border-zinc-900 pb-2">Select Payment Method</h2>
                
                {storeConfig.razorpayActive ? (
                  <div className="space-y-4">
                    {/* Razorpay Option */}
                    <label className={`flex items-start gap-4 p-5 border transition-colors cursor-pointer ${
                      paymentMethod === 'razorpay' ? 'border-brand-red bg-zinc-900/40' : 'border-zinc-800 bg-zinc-900/10'
                    }`}>
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'razorpay'}
                        onChange={() => setPaymentMethod('razorpay')}
                        className="mt-1 accent-brand-red"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-sm block uppercase tracking-wider text-brand-offwhite">Prepaid - Debit/Credit Card / UPI</span>
                        <span className="text-xs text-zinc-500 mt-1 block">Pay securely online using Razorpay payment gateway. Fast processing.</span>
                      </div>
                    </label>

                    {/* COD Option */}
                    <label className={`flex items-start gap-4 p-5 border transition-colors cursor-pointer ${
                      paymentMethod === 'cod' ? 'border-brand-red bg-zinc-900/40' : 'border-zinc-800 bg-zinc-900/10'
                    }`}>
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="mt-1 accent-brand-red"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-sm block uppercase tracking-wider text-brand-offwhite">Cash on Delivery (COD)</span>
                        <span className="text-xs text-zinc-500 mt-1 block">
                          Pay in cash upon delivery. Adds an extra COD convenience charge of ₹{(storeConfig.codFee / 100).toFixed(0)}.
                        </span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="bg-zinc-900/40 border border-zinc-800 p-8 text-center space-y-4">
                    <Lock className="w-8 h-8 text-zinc-600 mx-auto" />
                    <div>
                      <h3 className="font-bold text-sm uppercase tracking-wider text-brand-offwhite mb-2">Prepaid Gateway Coming Soon</h3>
                      <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                        Online payments are currently offline. You can place your order now, and we will contact you on WhatsApp to complete payment/shipping.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Place Order / Payment Execute */}
              <div className="pt-4">
                <button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="w-full bg-brand-red text-white py-4 font-bold uppercase tracking-widest text-xs hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    'Processing Secure Checkout...'
                  ) : paymentMethod === 'razorpay' && storeConfig.razorpayActive ? (
                    `Pay ₹${(total / 100).toFixed(2)}`
                  ) : paymentMethod === 'cod' && storeConfig.razorpayActive ? (
                    'Confirm COD Order'
                  ) : (
                    'Place WhatsApp Order'
                  )}
                  {!isProcessing && <Lock className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
          <div className="bg-zinc-900/20 border border-zinc-800 p-6 md:p-8">
            <h2 className="text-sm font-bold text-brand-offwhite mb-6 uppercase tracking-widest border-b border-zinc-800 pb-3">Items Summary</h2>
            
            <div className="space-y-4 mb-6 max-h-[35vh] overflow-y-auto custom-scrollbar pr-2">
              {items.map((item) => (
                <div key={`${item.id}-${item.size}`} className="flex gap-4">
                  <div className="w-16 h-20 bg-zinc-900 flex-shrink-0 relative border border-zinc-800">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute -top-2 -right-2 bg-zinc-800 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-zinc-700">
                      {item.quantity}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-brand-offwhite truncate uppercase tracking-wide">{item.name}</h4>
                    <p className="text-[10px] text-zinc-500 mt-1">SIZE: {item.size}</p>
                    <p className="text-xs text-zinc-400 font-mono mt-1">₹{(item.price / 100).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-800 pt-6 space-y-3 text-xs uppercase tracking-wider">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span className="font-mono text-zinc-400">₹{(subtotal / 100).toFixed(2)}</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between text-green-500">
                  <span>Discount ({discountCode?.code})</span>
                  <span className="font-mono">-₹{(discount / 100).toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-zinc-500">
                <span>Shipping</span>
                <span className="font-mono text-zinc-400">
                  {shippingCharge === 0 ? 'FREE' : `₹${(shippingCharge / 100).toFixed(2)}`}
                </span>
              </div>
              
              <div className="pt-4 border-t border-zinc-850 flex justify-between items-center mt-3">
                <span className="text-brand-offwhite font-bold text-sm tracking-widest">Total</span>
                <span className="text-brand-offwhite font-bold text-lg font-mono">₹{(total / 100).toFixed(2)}</span>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
