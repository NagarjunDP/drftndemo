'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Plus, Minus, Trash2, ShoppingBag, Tag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../lib/cartStore';
import { getOptimizedImageUrl } from '@/lib/cloudinary';
import { toast } from '@/lib/toast';
import { motion } from 'framer-motion';

const FREE_SHIPPING_THRESHOLD = 99900; // ₹999 in paise

export default function MiniCart() {
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const setIsOpen = useCartStore((state) => state.setIsOpen);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const getCartTotal = useCartStore((state) => state.getCartTotal);
  const discountCode = useCartStore((state) => state.discountCode);
  const applyDiscount = useCartStore((state) => state.applyDiscount);

  const [promoInput, setPromoInput] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);

  const subtotal = getCartTotal();

  let discountAmount = 0;
  if (discountCode) {
    if (discountCode.discount_type === 'percent') {
      discountAmount = Math.round(subtotal * (discountCode.discount_value / 100));
    } else {
      discountAmount = discountCode.discount_value;
    }
  }
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Shipping progress — % toward ₹999 free shipping
  const shippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const hasEarnedFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    try {
      const res = await fetch('/api/discount/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput, subtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) { toast.error(data.message || 'Invalid promo code!'); return; }
      applyDiscount({
        id: 'applied-coupon',
        code: promoInput.toUpperCase().trim(),
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_value: 0,
        used_count: 0,
        is_active: true,
      });
      toast.success(data.message || 'Promo code applied!');
      setPromoInput('');
    } catch (err) {
      toast.error('Error applying coupon.');
      console.error(err);
    }
  };

  const handleRemovePromo = () => {
    applyDiscount(null);
    toast.info('Promo code removed.');
  };

  // iOS-safe scroll lock
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY) * -1);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // ESC close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 2500);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isOpen, setIsOpen]);

  const handleInteraction = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-[4000] bg-black/70 backdrop-blur-sm transition-opacity duration-400 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Cart Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        onMouseEnter={handleInteraction}
        onTouchStart={handleInteraction}
        onClick={handleInteraction}
        onKeyDown={handleInteraction}
        className={`fixed top-0 right-0 h-full w-full max-w-sm z-[4001] bg-brand-black flex flex-col transition-transform duration-400 ease-streetwear ${
          isOpen 
            ? 'translate-x-0 border-l border-brand-graphite shadow-2xl' 
            : 'translate-x-[105%] border-l-0 shadow-none'
        }`}
      >
        {/* ── Shipping Progress Bar (very top) ── */}
        {items.length > 0 && (
          <div className="px-5 pt-4 pb-3 bg-brand-charcoal border-b border-brand-graphite">
            <div className="flex items-center justify-between mb-2">
              {hasEarnedFreeShipping ? (
                <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-brand-amber">
                  ✓ Free Shipping Unlocked!
                </p>
              ) : (
                <p className="text-[10px] tracking-[0.15em] uppercase font-body font-medium text-brand-stone">
                  Add <span className="text-brand-offwhite font-bold">
                    ₹{(amountToFreeShipping / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </span> more for free shipping
                </p>
              )}
            </div>
            <div className="shipping-progress-bar">
              <div
                className="shipping-progress-fill"
                style={{ width: `${shippingProgress}%` }}
                role="progressbar"
                aria-valuenow={shippingProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${shippingProgress.toFixed(0)}% toward free shipping`}
              />
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-brand-graphite flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-4 h-4 text-brand-offwhite" aria-hidden="true" />
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-offwhite font-display">
              Your Bag
            </h2>
            {itemCount > 0 && (
              <span className="text-[9px] text-brand-black font-extrabold bg-brand-offwhite py-0.5 px-2 tracking-wider uppercase" aria-label={`${itemCount} items`}>
                {itemCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-brand-stone hover:text-brand-offwhite transition-colors -mr-1"
            aria-label="Close shopping bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Items List ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" role="list" aria-label="Cart items">
          {items.length === 0 ? (
            /* Empty cart state */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-5 pb-10" role="status">
              <div className="w-16 h-16 border border-brand-graphite flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-brand-muted stroke-[1]" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <p className="text-brand-offwhite font-medium uppercase tracking-[0.2em] text-sm font-display">
                  NO DROPS IN BAG.
                </p>
                <p className="text-brand-stone text-xs leading-relaxed max-w-[180px] mx-auto font-body">
                  Add some heavy hitters to get driftin&apos;.
                </p>
              </div>
              <Link
                href="/shop"
                onClick={() => setIsOpen(false)}
                className="btn-primary text-[10px] py-3 px-8 tracking-widest"
              >
                <span>Shop Collection</span>
                <ArrowRight className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <motion.div
                key={`${item.id}-${item.size}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex gap-3.5 border-b border-brand-graphite pb-5 last:border-0 last:pb-0"
                role="listitem"
              >
                {/* Product Image */}
                <div className="relative w-16 h-20 bg-brand-graphite overflow-hidden flex-shrink-0">
                  <Image
                    src={getOptimizedImageUrl(item.image, 200) || 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200'}
                    alt={`${item.name}, size ${item.size}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>

                {/* Item Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-xs font-semibold text-brand-offwhite tracking-wide uppercase line-clamp-2 font-body leading-snug">
                        {item.name}
                      </h3>
                      <p className="text-xs font-bold text-brand-offwhite shrink-0 font-body">
                        ₹{((item.price * item.quantity) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <p className="text-[10px] text-brand-stone font-medium uppercase tracking-wider mt-1">
                      Size: {item.size}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Qty selector */}
                    <div className="flex items-center border border-brand-muted bg-brand-graphite" role="group" aria-label="Quantity controls">
                      <button
                        onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-brand-stone hover:text-brand-offwhite transition-colors"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs px-2 text-brand-offwhite font-bold w-6 text-center select-none">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                        disabled={item.quantity >= (item.stock_quantity?.[item.size] ?? Infinity)}
                        className="w-7 h-7 flex items-center justify-center text-brand-stone hover:text-brand-offwhite transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id, item.size)}
                      className="text-brand-muted hover:text-brand-red transition-colors p-1"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        {items.length > 0 && (
          <div className="px-5 py-5 border-t border-brand-graphite bg-brand-charcoal/60 space-y-4 flex-shrink-0">
            {/* Promo Code */}
            <form onSubmit={handleApplyPromo} className="flex gap-2" aria-label="Apply promo code">
              <label htmlFor="minicart-promo" className="sr-only">Promo code</label>
              <input
                id="minicart-promo"
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Promo Code"
                className="flex-1 bg-brand-graphite border border-brand-muted text-brand-offwhite py-2 px-3 text-[10px] tracking-widest uppercase font-bold placeholder-brand-stone"
              />
              <button
                type="submit"
                className="bg-brand-graphite border border-brand-muted text-brand-offwhite hover:border-brand-amber hover:text-brand-amber font-bold text-[10px] uppercase tracking-widest py-2 px-3 transition-colors"
              >
                Apply
              </button>
            </form>

            {discountCode && (
              <div className="flex justify-between items-center text-xs text-emerald-400">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3" aria-hidden="true" />
                  <span className="uppercase font-bold tracking-wider">{discountCode.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">−₹{(discountAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                  <button
                    onClick={handleRemovePromo}
                    className="text-brand-stone hover:text-brand-red text-[9px] uppercase font-bold tracking-widest transition-colors"
                    aria-label="Remove promo code"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="space-y-1.5 pt-1">
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-brand-stone">
                  <span className="uppercase tracking-wider font-body">Subtotal</span>
                  <span className="font-mono">₹{(subtotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-400">
                  <span className="uppercase tracking-wider font-body">Discount</span>
                  <span>−₹{(discountAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-brand-graphite">
                <span className="text-xs uppercase tracking-[0.2em] text-brand-stone font-body font-semibold">Total</span>
                <span className="text-base font-extrabold text-brand-offwhite font-display">
                  ₹{(finalTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Link
                href="/cart"
                onClick={() => setIsOpen(false)}
                className="btn-outline text-center py-3.5 text-[10px] tracking-widest"
              >
                View Bag
              </Link>
              <Link
                href="/checkout"
                onClick={() => setIsOpen(false)}
                className="btn-electric relative overflow-hidden bg-brand-offwhite text-brand-black text-center py-3.5 text-[10px] tracking-widest font-bold uppercase border border-transparent hover:bg-white transition-all duration-300"
              >
                Checkout
              </Link>
            </div>

            <p className="text-[9px] text-brand-stone/60 text-center tracking-[0.15em] font-body">
              Shipping & taxes calculated at checkout
            </p>
          </div>
        )}
      </div>
    </>
  );
}
