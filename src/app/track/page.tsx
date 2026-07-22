'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { Order } from '@/types';
import { Search, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/components/ToastContainer';

const STATUS_STAGES = [
  { id: 'placed', label: 'Order Placed', icon: Clock },
  { id: 'confirmed', label: 'Order Confirmed', icon: CheckCircle },
  { id: 'packed', label: 'Packed', icon: Package },
  { id: 'shipped', label: 'Shipped', icon: Truck },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export default function TrackOrderPage() {
  const { addToast } = useToast();
  const [orderNumber, setOrderNumber] = useState('');
  const [contact, setContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<any | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !contact) {
      addToast('Please enter both Order Number and Contact info.', 'error');
      return;
    }

    setIsLoading(true);
    setOrder(null);

    try {
      const foundOrder = await db.getOrderByTracking(orderNumber, contact);
      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        addToast('No order found with these details. Please check and try again.', 'error');
      }
    } catch (error) {
      console.error(error);
      addToast('Failed to fetch order tracking information.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    return STATUS_STAGES.findIndex((stage) => stage.id === status);
  };

  // Real-time polling updates when the tracking dashboard is open
  React.useEffect(() => {
    if (!order) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(order.order_number)}&phone=${encodeURIComponent(contact)}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } catch (err) {
        console.error('Real-time tracking status check error:', err);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [order?.order_number, contact]);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 min-h-[70vh]">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-widest text-brand-offwhite uppercase mb-4">
          Track Your Order
        </h1>
        <p className="text-zinc-500 max-w-lg mx-auto text-sm">
          Enter your order number and the email or phone number used during checkout to view the current status of your shipment.
        </p>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800 p-6 md:p-8 rounded-none max-w-2xl mx-auto mb-12">
        <form onSubmit={handleTrack} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Order Number</label>
              <input
                type="text"
                placeholder="e.g. DRFTN-7K9M2P"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full bg-zinc-900/80 border border-zinc-800 text-brand-offwhite px-4 py-3 focus:outline-none focus:border-white transition-colors"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Email or Phone</label>
              <input
                type="text"
                placeholder="Entered at checkout"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full bg-zinc-900/80 border border-zinc-800 text-brand-offwhite px-4 py-3 focus:outline-none focus:border-white transition-colors"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black px-8 py-4 font-bold uppercase tracking-widest text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'Track Order'}
            {!isLoading && <Search className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {order && (
        <div className="animate-fade-in bg-zinc-900/50 border border-zinc-800 p-6 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 pb-6 border-b border-zinc-800 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-brand-offwhite uppercase tracking-wider mb-1">
                Order {order.order_number}
              </h2>
              <p className="text-zinc-500 text-sm">Placed on {new Date(order.created_at || Date.now()).toLocaleDateString()}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-zinc-400 mb-1">Total Amount</p>
              <p className="text-xl text-brand-offwhite font-mono font-bold">₹{(order.total / 100).toFixed(2)}</p>
            </div>
          </div>

          {order.tracking_history && (
            <div className="mb-8 p-6 border border-zinc-800 bg-zinc-950/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Courier Tracking Status</p>
                <p className="text-lg font-bold text-white mt-1">{order.tracking_history.status_label}</p>
                {order.tracking_number && (
                  <p className="text-xs text-zinc-400 mt-1 font-mono">Tracking Number: {order.tracking_number} ({order.courier_partner || 'Courier'})</p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Last Status Update</p>
                <p className="text-sm text-zinc-400 mt-1">
                  {new Date(order.tracking_history.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {order.order_status === 'cancelled' ? (
            <div className="bg-zinc-950 border border-zinc-800 text-zinc-400 p-6 text-center font-bold tracking-widest uppercase text-sm mb-10">
              This order has been cancelled.
            </div>
          ) : (
            <div className="relative mb-12 py-4">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-800 -translate-y-1/2 hidden md:block" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-white -translate-y-1/2 hidden md:block transition-all duration-1000"
                style={{
                  width: `${(Math.max(0, getStatusIndex(order.order_status)) / (STATUS_STAGES.length - 1)) * 100}%`,
                }}
              />
              
              <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-4 relative z-10">
                {STATUS_STAGES.map((stage, index) => {
                  const currentIndex = getStatusIndex(order.order_status);
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;
                  const Icon = stage.icon;

                  return (
                    <div key={stage.id} className="flex md:flex-col items-center gap-4 md:gap-3 flex-1">
                      <div className="md:hidden w-1 h-full bg-zinc-800 absolute left-5 top-10 -z-10" />
                      
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                          isCompleted
                            ? 'bg-white border-white text-black'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="md:text-center">
                        <p
                          className={`text-xs md:text-sm font-bold uppercase tracking-wider ${
                            isCompleted ? 'text-brand-offwhite' : 'text-zinc-600'
                          }`}
                        >
                          {stage.label}
                        </p>
                        {isCurrent && order.tracking_number && stage.id === 'shipped' && (
                          <p className="text-xs text-white/80 mt-1 font-mono">AWB: {order.tracking_number}</p>
                        )}
                        {isCurrent && order.courier_partner && stage.id === 'shipped' && (
                          <p className="text-xs text-zinc-400 mt-1">{order.courier_partner}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Items Summary */}
          <div className="bg-brand-black border border-zinc-800 p-6">
            <h3 className="text-sm font-bold text-brand-offwhite uppercase tracking-wider mb-4 pb-2 border-b border-zinc-800">
              Items in Shipment
            </h3>
            <div className="space-y-4">
              {order.items.map((item: any, idx: number) => (
                <div key={`${item.id}-${idx}`} className="flex items-center gap-4">
                  <div className="w-12 h-16 bg-zinc-900 flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-brand-offwhite truncate">{item.name}</p>
                    <p className="text-xs text-zinc-500">Size: {item.size} | Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-400 font-mono">₹{(item.price / 100).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
