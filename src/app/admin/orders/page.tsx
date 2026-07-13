'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { Order } from '@/types';
import { Search, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/ToastContainer';
import { useRouter } from 'next/navigation';

export default function AdminOrders() {
  const { addToast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = async () => {
    try {
      const data = await db.getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
      addToast('Failed to load orders', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useState<'all' | 'delivery' | 'pickup'>('all');

  const handleStatusChange = async (orderId: string, newStatus: Order['order_status']) => {
    try {
      await db.updateOrderStatus(orderId, { order_status: newStatus });
      addToast('Order status updated', 'success');
      fetchOrders();
    } catch (err) {
      addToast('Failed to update status', 'error');
    }
  };

  const filteredOrders = orders.filter(o => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = 
      o.order_number.toLowerCase().includes(cleanSearch) ||
      o.customer_name.toLowerCase().includes(cleanSearch) ||
      o.customer_email.toLowerCase().includes(cleanSearch) ||
      (o.pickup_code && o.pickup_code.toLowerCase().includes(cleanSearch));
      
    if (!matchesSearch) return false;
    if (activeTab === 'delivery') return o.fulfillment_type !== 'pickup';
    if (activeTab === 'pickup') return o.fulfillment_type === 'pickup';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in text-zinc-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-widest uppercase text-zinc-900">Order Management</h1>
          <p className="text-zinc-500 text-sm mt-1">View and manage customer orders, track shipments.</p>
        </div>
      </div>

      <div className="bg-white border border-zinc-200/60 rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50/50 border border-zinc-200 text-zinc-900 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-900 transition-colors rounded-lg"
            />
          </div>
          
          <div className="flex bg-zinc-150 p-1 rounded-lg self-start sm:self-auto border border-zinc-200/40">
            {(['all', 'delivery', 'pickup'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-zinc-900 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-800 bg-transparent'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'delivery' ? 'Delivery' : 'Pickup'}
              </button>
            ))}
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="p-8 text-center text-zinc-400 text-sm">Loading orders...</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/70">
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Order</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Date</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Customer</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Type</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Payment</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Status</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-400 text-sm">No orders found.</td>
                      </tr>
                    ) : (
                      filteredOrders.map(order => (
                        <tr 
                          key={order.id} 
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                          className="border-b border-zinc-100 hover:bg-zinc-50/20 transition-colors cursor-pointer"
                        >
                          <td className="p-4 font-mono text-sm text-zinc-900 font-bold">{order.order_number}</td>
                          <td className="p-4 text-sm text-zinc-650 font-medium">
                            {new Date(order.created_at || Date.now()).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-zinc-900 font-bold">{order.customer_name}</p>
                            <p className="text-xs text-zinc-400 font-medium">{order.customer_email}</p>
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${
                              order.fulfillment_type === 'pickup' 
                                ? 'bg-purple-50 text-purple-600 border border-purple-100' 
                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {order.fulfillment_type === 'pickup' ? 'Pickup' : 'Delivery'}
                            </span>
                            {order.fulfillment_type === 'pickup' && order.pickup_code && (
                              <span className="block text-[10px] font-mono text-purple-700 font-bold mt-1 tracking-widest uppercase">
                                Code: {order.pickup_code}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div>
                              <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${
                                order.payment_status === 'paid' 
                                  ? 'bg-green-50 text-green-600 border-green-100' 
                                  : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                              }`}>
                                {order.payment_status}
                              </span>
                              {order.payment_type === 'cod_with_deposit' && (
                                <span className="block text-[9px] font-mono text-zinc-400 mt-1 uppercase font-bold">
                                  COD (Dep Paid)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block text-left">
                              <select
                                value={order.order_status}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(order.id, e.target.value as any);
                                }}
                                className={`appearance-none bg-white border px-3 py-1.5 pr-8 text-xs font-bold uppercase tracking-wider rounded cursor-pointer focus:outline-none transition-colors border-zinc-200 text-zinc-800 ${
                                  order.order_status === 'delivered' || order.order_status === 'collected' ? 'text-green-600 border-green-200 bg-green-50/30' :
                                  order.order_status === 'cancelled' || order.order_status === 'failed' ? 'text-red-600 border-red-200 bg-red-50/30' :
                                  'hover:bg-zinc-50'
                                }`}
                              >
                                <option value="pending_payment">Pending Payment</option>
                                <option value="payment_verifying">Payment Verifying</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="preparing">Preparing</option>
                                <option value="ready_for_pickup">Ready for Pickup</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="collected" disabled>Collected (Verification Required)</option>
                                <option value="failed">Failed</option>
                                <option value="expired">Expired</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="payment_mismatch">Payment Mismatch</option>
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
                            </div>
                          </td>
                          <td className="p-4 font-mono text-sm text-zinc-900 font-bold">₹{(order.total / 100).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-zinc-100">
                {filteredOrders.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-sm">No orders found.</div>
                ) : (
                  filteredOrders.map(order => (
                    <div 
                      key={order.id}
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                      className="p-4 space-y-4 bg-white hover:bg-zinc-50/30 transition-colors cursor-pointer"
                    >
                      {/* Top Row: Order Num & Date */}
                      <div className="flex justify-between items-start text-left">
                        <div>
                          <span className="font-mono text-xs font-black text-zinc-900">{order.order_number}</span>
                          {order.fulfillment_type === 'pickup' && order.pickup_code && (
                            <span className="ml-2 px-1.5 py-0.5 text-[9px] font-mono bg-purple-100 text-purple-700 font-bold tracking-wider rounded uppercase">
                              Code: {order.pickup_code}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">
                            {new Date(order.created_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sm font-bold text-zinc-900 block">₹{(order.total / 100).toFixed(2)}</span>
                          <div className="flex gap-1.5 items-center mt-1 justify-end">
                            <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded border ${
                              order.fulfillment_type === 'pickup' 
                                ? 'bg-purple-50 text-purple-650 border-purple-100' 
                                : 'bg-blue-50 text-blue-650 border-blue-100'
                            }`}>
                              {order.fulfillment_type === 'pickup' ? 'Pickup' : 'Delivery'}
                            </span>
                            <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded border ${
                              order.payment_status === 'paid' 
                                ? 'bg-green-50 text-green-600 border-green-100' 
                                : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                            }`}>
                              {order.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="bg-zinc-50 p-2.5 border border-zinc-100 rounded-lg text-left">
                        <p className="text-xs text-zinc-900 font-bold">{order.customer_name}</p>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5 truncate">{order.customer_email}</p>
                      </div>

                      {/* Status Dropdown */}
                      <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-zinc-450 uppercase tracking-widest font-bold">Change Status</span>
                        <div className="relative">
                          <select
                            value={order.order_status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(order.id, e.target.value as any);
                            }}
                            className={`appearance-none bg-white border px-3 py-1.5 pr-8 text-xs font-bold uppercase tracking-wider rounded cursor-pointer focus:outline-none transition-colors border-zinc-200 text-zinc-800 ${
                              order.order_status === 'delivered' || order.order_status === 'collected' ? 'text-green-600 border-green-200 bg-green-50/30' :
                              order.order_status === 'cancelled' || order.order_status === 'failed' ? 'text-red-600 border-red-200 bg-red-50/30' :
                              'hover:bg-zinc-50'
                            }`}
                          >
                            <option value="pending_payment">Pending Payment</option>
                            <option value="payment_verifying">Payment Verifying</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready_for_pickup">Ready for Pickup</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="collected" disabled>Collected (Verification Required)</option>
                            <option value="failed">Failed</option>
                            <option value="expired">Expired</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="payment_mismatch">Payment Mismatch</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
