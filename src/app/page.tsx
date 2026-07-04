'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, ChevronRight, Plus } from 'lucide-react';
import { dbService } from '@/lib/db';
import { Product, Category } from '@/types';
import { useCartStore } from '@/lib/cartStore';
import { useAnimationStore } from '@/lib/animationStore';
import { toast } from '@/lib/toast';
import HeroSection from '@/components/HeroSection';
import AnnouncementTicker from '@/components/AnnouncementTicker';

/* ──────────────────────────────────────────
   REVEAL-ON-SCROLL HOOK (unchanged)
   ────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

/* ──────────────────────────────────────────
   COUNTER ANIMATION (unchanged)
   ────────────────────────────────────────── */
function AnimatedCounter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useReveal();

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(to / 50);
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setCount(to); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [visible, to]);

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>}>
      {count}{suffix}
    </span>
  );
}

/* ──────────────────────────────────────────
   PRODUCT CARD (logic unchanged, visual upgrade)
   ────────────────────────────────────────── */
function ProductCard({
  prod,
  onQuickAdd,
  aspectClass = 'aspect-[3/4]'
}: {
  prod: Product;
  onQuickAdd: (e: React.MouseEvent, p: Product) => void;
  aspectClass?: string;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleQuickAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding) return;
    setIsAdding(true);
    setTimeout(() => setIsAdding(false), 900);
    onQuickAdd(e, prod);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  return (
    <Link
      href={`/shop/${prod.slug}`}
      className="group flex flex-col product-card text-left transition-all duration-300 active:scale-[0.99] w-full"
      aria-label={`View ${prod.name} — ₹${(prod.price / 100).toLocaleString('en-IN')}`}
      style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
    >
      {/* Image Container */}
      <div className={`relative overflow-hidden bg-brand-black rounded-[24px] ${aspectClass}`}>
        <Image
          src={prod.images[0] || 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800'}
          alt={prod.name}
          fill
          sizes="(max-width: 768px) 85vw, 40vw"
          loading="lazy"
          className="object-cover transition-transform duration-[750ms] ease-luxury group-hover:scale-[1.04]"
        />

        {/* Floating Detail Label */}
        {prod.is_featured && (
          <span className="absolute top-4 left-4 bg-brand-black/45 backdrop-blur-md text-brand-offwhite text-[8px] tracking-[0.2em] font-semibold py-1 px-2.5 rounded-full border border-white/10 uppercase z-10">
            NEW
          </span>
        )}

        {/* Wishlist Heart Icon (Top-Right) */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-brand-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 hover:border-brand-offwhite/50 transition-colors"
          aria-label="Add to wishlist"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isWishlisted ? 'var(--color-red)' : 'none'}
            stroke={isWishlisted ? 'var(--color-red)' : 'currentColor'}
            strokeWidth="1.5"
            className="w-4 h-4 text-brand-offwhite"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
        </button>

        {/* Quick Add Plus Button (Bottom-Right) */}
        <div className="absolute bottom-4 right-4 z-10">
          <button
            onClick={handleQuickAddClick}
            disabled={isAdding}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 shadow-md ${
              isAdding
                ? 'bg-brand-red border-brand-red text-white'
                : 'bg-brand-black/60 backdrop-blur-md border-white/10 hover:border-brand-offwhite text-brand-offwhite'
            }`}
            id={`quick-add-${prod.id}`}
            aria-label={`Quick add ${prod.name} to cart`}
          >
            {isAdding ? (
              <span className="text-xs font-bold font-mono">✓</span>
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="pt-4 pb-2 space-y-1">
        <h3 className="text-xs font-medium text-brand-offwhite tracking-wide uppercase line-clamp-1 font-body">
          {prod.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-offwhite font-body">
            ₹{(prod.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </span>
          {prod.compare_price && prod.compare_price > prod.price && (
            <span className="text-[10px] text-brand-stone line-through font-body">
              ₹{(prod.compare_price / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────
   MAIN PAGE — data logic unchanged, layout/styles upgraded
   ────────────────────────────────────────── */
export default function Homepage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  // Image arrays passed as props to HeroSection — edit here to change hero images
  const heroImagesLeft = [
    '/hero-clothing.png',
    'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=1600&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1600&auto=format&fit=crop&q=85',
  ];

  const heroImagesRight = [
    'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=85',
  ];

  const categoryRef = useRef<HTMLElement>(null);
  const featuredRef = useRef<HTMLElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const igRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = [categoryRef, featuredRef, storyRef, igRef];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
          }
        });
      },
      { threshold: 0.07 }
    );
    sections.forEach((ref) => { if (ref.current) obs.observe(ref.current); });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [prods, cats] = await Promise.all([dbService.getProducts(), dbService.getCategories()]);
        setFeaturedProducts(prods.filter((p) => p.is_featured).slice(0, 4));
        setCategories(cats.slice(0, 4));
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // handleQuickAdd — logic unchanged
  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const availableSizes = product.sizes.filter((s) => (product.stock_quantity[s] || 0) > 0);
    if (availableSizes.length === 0) { toast.error('This product is sold out!'); return; }
    const defaultSize = availableSizes.includes('M') ? 'M' : availableSizes[0];
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compare_price: product.compare_price,
      image: product.images[0] || 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800',
      size: defaultSize,
    }, 1);

    let cartEl = document.getElementById('navbar-cart-btn');
    if (!cartEl || cartEl.getBoundingClientRect().width === 0) {
      cartEl = document.getElementById('mobile-cart-trigger');
    }

    if (cartEl) {
      const cartRect = cartEl.getBoundingClientRect();
      const endX = cartRect.left + cartRect.width / 2;
      const endY = cartRect.top + cartRect.height / 2;
      const cardEl = e.currentTarget.closest('.product-card');
      const imgEl = cardEl?.querySelector('img');
      const sourceRect = imgEl ? imgEl.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();
      const startX = sourceRect.left + sourceRect.width / 2;
      const startY = sourceRect.top + sourceRect.height / 2;
      useAnimationStore.getState().addFlyingItem({
        imageUrl: product.images[0] || 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800',
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
      });
    } else {
      useAnimationStore.getState().triggerCartPulse();
    }
    toast.cartSuccess(product.name, product.images[0] || 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800');
  };

  return (
    <div className="w-full flex flex-col bg-brand-black">

      {/* ═══════════════════════════════════════════
          1. HERO — KINETIC MASKED TYPOGRAPHY
          ═══════════════════════════════════════════ */}
      <HeroSection
        variant="kinetic"
        imagesLeft={heroImagesLeft}
        imagesRight={heroImagesRight}
      />

      {/* Mobile only below-the-fold content block */}
      <div className="md:hidden bg-[#0A0A0A] px-8 py-10 text-center border-b border-brand-graphite space-y-4">
        <div className="inline-flex items-center gap-2.5 justify-center">
          <span className="block w-6 h-px bg-brand-amber" aria-hidden="true" />
          <span className="text-brand-stone text-[9px] font-semibold tracking-[0.38em] uppercase font-body leading-none">
            New Season Drop
          </span>
          <span className="block w-6 h-px bg-brand-amber" aria-hidden="true" />
        </div>
        <p className="text-brand-stone/85 text-[11px] tracking-widest leading-relaxed uppercase font-body max-w-sm mx-auto">
          Heavyweight apparel designed to challenge gender constraints.
          Drop shoulder silhouettes. Raw minimalist industrial DNA.
        </p>
      </div>

      {/* ═══════════════════════════════════════════
          2. ANNOUNCEMENT TICKER — ROTATING SINGLE MESSAGE (Option A)
          ═══════════════════════════════════════════ */}
      <AnnouncementTicker />

      {/* ═══════════════════════════════════════════
          3. CATEGORIES — EDITORIAL LAYOUT
          ═══════════════════════════════════════════ */}
      <section
        ref={categoryRef}
        className="py-24 md:py-48 px-0 md:px-12 max-w-screen-2xl mx-auto w-full overflow-hidden"
        aria-labelledby="categories-heading"
      >
        {/* Header */}
        <div className="flex items-end justify-between mb-10 px-6 md:px-0">
          <div className="space-y-2">
            <span className="eyebrow before:content-none md:before:content-['']">Departments</span>
            <h2
              id="categories-heading"
              className="text-brand-offwhite leading-none font-display uppercase text-3xl md:text-5xl"
            >
              Shop by Category
            </h2>
          </div>
          <Link
            href="/shop"
            className="group flex items-center gap-1 text-[10px] md:text-xs text-brand-stone hover:text-brand-offwhite tracking-[0.18em] uppercase font-semibold transition-colors font-body"
          >
            View All <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {/* Category Contents */}
        {categories.length > 0 ? (
          <>
            {/* Mobile swipe carousel — Apple App Store style */}
            <div 
              className="flex md:hidden gap-5 overflow-x-auto snap-x snap-mandatory px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full"
              style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
            >
              {categories.map((cat, i) => {
                const meta = cat.slug && (cat.slug.toLowerCase() in {
                  'hoodies': 1, 'jackets': 1, 't-shirts': 1, 'denims': 1, 'accessories': 1
                }) 
                  ? {
                      'hoodies': { eyebrow: 'ESSENTIALS', desc: 'Minimal Everyday Essentials' },
                      'jackets': { eyebrow: 'TECHNICAL', desc: 'Technical Outerwear' },
                      't-shirts': { eyebrow: 'HEAVYWEIGHT', desc: 'Heavyweight Cotton Tees' },
                      'denims': { eyebrow: 'PREMIUM FIT', desc: 'Relaxed Premium Fit' },
                      'accessories': { eyebrow: 'ACCENTS', desc: 'Industrial Accents' }
                    }[cat.slug.toLowerCase() as 'hoodies'|'jackets'|'t-shirts'|'denims'|'accessories']
                  : { eyebrow: 'NEW COLLECTION', desc: 'Relaxed Premium Fit' };

                return (
                  <Link
                    key={cat.id}
                    href={`/shop?category=${cat.slug}`}
                    className="w-[85vw] max-w-[360px] shrink-0 snap-start relative aspect-[3/4] rounded-[24px] overflow-hidden bg-brand-charcoal active:scale-98 transition-transform duration-300 flex flex-col justify-end"
                    aria-label={`Shop ${cat.name} collection`}
                  >
                    {/* Background image */}
                    <div className="absolute inset-0 z-0">
                      <Image
                        src={cat.image_url || 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800'}
                        alt={cat.name}
                        fill
                        sizes="85vw"
                        loading="lazy"
                        className="object-cover"
                      />
                      {/* Gradient overlay to protect text contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    </div>

                    {/* Capsule badge top-left */}
                    <div className="absolute top-5 left-5 bg-brand-black/35 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                      <span className="text-brand-stone-light text-[8px] font-bold tracking-[0.2em] uppercase">
                        {meta.eyebrow}
                      </span>
                    </div>

                    {/* Card content text */}
                    <div className="relative z-10 p-6 flex flex-col items-start text-left">
                      <span className="text-brand-stone text-[10px] font-mono tracking-widest block mb-2">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-brand-offwhite text-[32px] font-extrabold tracking-tight uppercase leading-none font-display mb-1.5">
                        {cat.name}
                      </h3>
                      <p className="text-[12px] uppercase tracking-[0.18em] font-body font-semibold text-brand-stone-light mb-4">
                        {meta.desc}
                      </p>
                      <span className="text-[10px] tracking-[0.2em] font-bold text-brand-offwhite uppercase flex items-center gap-1">
                        Explore <span className="text-xs">→</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop visual grid — polished layout */}
            <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-5 items-stretch bg-transparent">
              {categories.map((cat, i) => {
                const isLargeCard = i === 0 || i === 3;
                const aspectHeightClass = i === 0 
                  ? 'col-span-1 md:col-span-2 md:row-span-2 min-h-[520px]' 
                  : i === 3 
                  ? 'col-span-1 md:col-span-2 min-h-[250px]' 
                  : 'col-span-1 min-h-[250px]';

                return (
                  <Link
                    key={cat.id}
                    href={`/shop?category=${cat.slug}`}
                    className={`group relative overflow-hidden bg-brand-black rounded-[24px] border border-white/5 shadow-xl transition-all duration-300 active:scale-[0.99] flex flex-col justify-end ${aspectHeightClass}`}
                    aria-label={`Shop ${cat.name} collection`}
                  >
                    <div className="absolute inset-0 z-0">
                      <Image
                        src={cat.image_url || 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800'}
                        alt={cat.name}
                        fill
                        sizes={isLargeCard ? '(max-width: 768px) 100vw, 50vw' : '25vw'}
                        className="object-cover transition-transform duration-700 ease-luxury group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 via-brand-black/20 to-transparent" />
                    </div>

                    <div className="relative z-10 p-7 text-left">
                      <p className="text-brand-stone text-[10px] tracking-[0.3em] uppercase font-body font-semibold mb-1">
                        {String(i + 1).padStart(2, '0')}
                      </p>
                      <h3 className={`text-brand-offwhite font-bold mb-1.5 font-display uppercase tracking-wide leading-none ${
                        isLargeCard ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'
                      }`}>
                        {cat.name}
                      </h3>
                      <span className="flex items-center gap-1 text-[9px] text-brand-stone tracking-[0.25em] uppercase font-body font-semibold group-hover:text-brand-amber transition-colors duration-300">
                        Shop Collection <span className="transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-stretch px-6 md:px-0" aria-busy="true" aria-label="Loading categories">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={`shimmer rounded-[24px] ${
                  i === 0 
                    ? 'col-span-1 md:col-span-2 md:row-span-2 h-[290px] md:min-h-[500px]'
                    : i === 1 || i === 2
                    ? 'col-span-1 h-[230px] md:h-[242px]'
                    : 'col-span-1 md:col-span-2 h-[290px] md:h-[242px]'
                }`} 
              />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          4. LATEST DROP (FEATURED PRODUCTS)
          ═══════════════════════════════════════════ */}
      <section
        ref={featuredRef}
        className="py-24 md:py-48 px-0 md:px-12 border-t border-brand-graphite bg-brand-black w-full overflow-hidden"
        aria-labelledby="featured-heading"
      >
        <div className="max-w-screen-2xl mx-auto">
          {/* Header */}
          <div className="flex items-end justify-between mb-10 px-6 md:px-0">
            <div className="space-y-2">
              <span className="eyebrow before:content-none md:before:content-['']">01 — Exclusives</span>
              <h2
                id="featured-heading"
                className="text-brand-offwhite leading-none font-display uppercase text-3xl md:text-5xl"
              >
                Latest Drop
              </h2>
            </div>
            <Link
              href="/shop"
              className="group flex items-center gap-1 text-[10px] md:text-xs text-brand-stone hover:text-brand-offwhite tracking-[0.18em] uppercase font-semibold transition-colors font-body"
            >
              View All <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {/* Products */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 px-6 md:px-0" aria-busy="true" aria-label="Loading products">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[3/4] shimmer rounded-[24px]" />
                  <div className="h-3 shimmer w-1/2" />
                  <div className="h-4 shimmer w-3/4" />
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <>
              {/* Mobile snap carousel */}
              <div 
                className="flex md:hidden gap-5 overflow-x-auto snap-x snap-mandatory px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full"
                style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
              >
                {featuredProducts.map((prod) => (
                  <div key={prod.id} className="w-[82vw] shrink-0 snap-start">
                    <ProductCard prod={prod} onQuickAdd={handleQuickAdd} aspectClass="aspect-[3/4]" />
                  </div>
                ))}
              </div>

              {/* Desktop grid layout */}
              <div className="hidden md:grid grid-cols-12 gap-5">
                {featuredProducts.map((prod, i) => {
                  const colSpanClass = i === 0 || i === 3 ? 'md:col-span-7' : 'md:col-span-5';
                  const aspectClass = i === 0 || i === 3 ? 'aspect-[16/10] md:aspect-[3/2]' : 'aspect-[3/4]';
                  return (
                    <div key={prod.id} className={`reveal reveal-delay-${(i % 4) + 1} ${colSpanClass}`}>
                      <ProductCard prod={prod} onQuickAdd={handleQuickAdd} aspectClass={aspectClass} />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Empty state for featured products */
            <div className="text-center py-20 border border-brand-graphite mx-6 md:mx-0 rounded-[24px]">
              <p className="text-brand-stone text-xs tracking-widest uppercase font-body">New drops coming soon</p>
              <Link href="/shop" className="btn-outline mt-6 inline-flex">
                <span>Browse All</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          5. BRAND STORY — EDITORIAL SPLIT
          ═══════════════════════════════════════════ */}
      <section
        ref={storyRef}
        className="py-36 md:py-56 px-8 md:px-12 max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center"
        aria-labelledby="story-heading"
      >
        {/* Text */}
        <div className="space-y-8 border-l-2 border-brand-amber/20 pl-8 lg:pl-12">
          <div className="reveal space-y-4">
            <span className="eyebrow">The Brand</span>
            <h2
              id="story-heading"
              className="text-brand-offwhite leading-tight font-display uppercase"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)' }}
            >
              Born in Yelahanka.
              <br />
              <span className="text-brand-stone/80">Built for the World.</span>
            </h2>
          </div>

          <div className="reveal reveal-delay-2 space-y-4">
            <p className="text-brand-stone text-sm md:text-base leading-relaxed font-body font-light">
              DRFTN CLOTHING is a premium D2C brand that represents the spirit of youth culture
              in Yelahanka, Bengaluru. Inspired by industrial minimalism and global streetwear,
              we build apparel that balances durability with a relaxed unisex fit.
            </p>
            <p className="text-brand-gray text-sm leading-relaxed font-body font-light">
              Every garment we produce is created using curated heavyweight fabrics,
              drop shoulder tailoring, and bold graphic expressions. We don&apos;t follow
              trends — we set the drift.
            </p>
          </div>

          <div className="reveal reveal-delay-3 flex flex-col sm:flex-row gap-4 pt-2">
            <Link href="/about" className="btn-primary">
              <span>Read Our Philosophy</span>
              <ArrowUpRight className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
            </Link>
          </div>

          {/* Brand Values */}
          <div className="reveal reveal-delay-4 grid grid-cols-3 gap-6 pt-6 border-t border-brand-graphite">
            {[
              { label: 'Heavyweight', note: 'Fabrics' },
              { label: 'Unisex', note: 'Silhouettes' },
              { label: 'D2C', note: 'Direct' },
            ].map((val) => (
              <div key={val.label} className="space-y-1">
                <span className="block w-4 h-px bg-brand-amber mb-2" aria-hidden="true" />
                <p className="text-[11px] tracking-[0.15em] text-brand-offwhite uppercase font-body font-semibold">{val.label}</p>
                <p className="text-[10px] tracking-wider text-brand-stone uppercase font-body">{val.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Images Collage */}
        <div className="reveal reveal-delay-2 grid grid-cols-2 gap-3 h-[480px] md:h-[600px]">
          <div className="overflow-hidden relative h-full">
            <Image
              src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&auto=format&fit=crop&q=85"
              alt="DRFTN model wearing streetwear — confident urban styling"
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover hover:scale-105 transition-transform duration-700 ease-luxury grayscale hover:grayscale-0"
            />
          </div>
          <div className="overflow-hidden relative h-full mt-10">
            <Image
              src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=85"
              alt="DRFTN fabric and garment detail — heavyweight construction"
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover hover:scale-105 transition-transform duration-700 ease-luxury grayscale hover:grayscale-0"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          6. EDITORIAL BANNER — Material Promise
          ═══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden border-t border-brand-graphite"
        aria-label="Brand philosophy"
      >
        <div className="relative h-72 md:h-96">
          <Image
            src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1600&auto=format&fit=crop&q=80"
            alt="DRFTN premium fabric detail — heavyweight textile craftsmanship"
            fill
            sizes="100vw"
            className="object-cover grayscale opacity-30"
          />
          <div className="absolute inset-0 bg-brand-black/75" aria-hidden="true" />
          <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
            <div className="space-y-4 max-w-3xl">
              <p className="text-brand-amber text-[10px] tracking-[0.45em] uppercase font-body font-semibold">
                Our Material Promise
              </p>
              <blockquote className="text-brand-offwhite font-display uppercase tracking-wider leading-tight" style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.8rem)' }}>
                &ldquo;Every thread is chosen with intention. Every cut is deliberate. Every garment is a statement.&rdquo;
              </blockquote>
              <p className="text-brand-stone text-xs tracking-[0.3em] uppercase font-body">
                — DRFTN CLOTHING
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          7. LOOKBOOK GALLERY
          ═══════════════════════════════════════════ */}
      <section
        ref={igRef}
        className="py-32 md:py-48 px-8 md:px-12 w-full"
        aria-labelledby="lookbook-heading"
      >
        <div className="max-w-screen-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 reveal space-y-3">
            <span className="eyebrow mx-auto justify-center before:content-none after:content-[''] text-center">
              <span className="block w-6 h-px bg-brand-amber mx-auto mb-3" aria-hidden="true" />
            </span>
            <h2
              id="lookbook-heading"
              className="text-brand-offwhite font-display uppercase"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
            >
              Drift With Us
            </h2>
            <a
              href="https://instagram.com/drftnclothing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] text-brand-stone hover:text-brand-amber tracking-[0.25em] uppercase transition-colors font-body font-semibold border-animate pb-0.5"
              aria-label="Follow DRFTN on Instagram @drftnclothing"
            >
              @drftnclothing
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>

          {/* Asymmetric Photo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 md:gap-1.5">
            {[
              { url: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500', alt: 'DRFTN lookbook — urban streetwear styling' },
              { url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500', alt: 'DRFTN lookbook — oversized silhouette editorial' },
              { url: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=500', alt: 'DRFTN lookbook — minimalist fashion portrait' },
              { url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500', alt: 'DRFTN lookbook — heavyweight garment detail' },
              { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500', alt: 'DRFTN lookbook — unisex fashion editorial' },
              { url: 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=500', alt: 'DRFTN lookbook — streetwear culture' },
            ].map(({ url, alt }, i) => (
              <a
                key={i}
                href="https://instagram.com/drftnclothing"
                target="_blank"
                rel="noopener noreferrer"
                className={`reveal reveal-delay-${(i % 4) + 1} aspect-square overflow-hidden block group bg-brand-graphite relative ${
                  i === 0 ? 'sm:col-span-2 sm:row-span-2 sm:aspect-auto' : ''
                }`}
                aria-label={`View DRFTN on Instagram — ${alt}`}
              >
                <Image
                  src={url}
                  alt={alt}
                  fill
                  sizes={i === 0 ? '(max-width: 640px) 50vw, 33vw' : '(max-width: 640px) 50vw, 16vw'}
                  className="object-cover transition-all duration-600 grayscale group-hover:grayscale-0 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-brand-black/30 group-hover:bg-transparent transition-colors duration-400" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          8. NEWSLETTER — Full-bleed editorial
          ═══════════════════════════════════════════ */}
      <section
        className="relative border-t border-brand-graphite bg-brand-charcoal py-32 md:py-44 px-8 md:px-12 overflow-hidden"
        aria-labelledby="newsletter-heading"
      >
        {/* Giant display type behind form — purely decorative */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
          aria-hidden="true"
        >
          <span
            className="font-display uppercase text-brand-graphite opacity-60 whitespace-nowrap"
            style={{ fontSize: 'clamp(6rem, 18vw, 20rem)', fontWeight: 800, letterSpacing: '-0.05em' }}
          >
            INNER CIRCLE
          </span>
        </div>

        <div className="relative z-10 max-w-screen-2xl mx-auto text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="block w-6 h-px bg-brand-amber" aria-hidden="true" />
            <span className="text-brand-stone text-[10px] font-semibold tracking-[0.35em] uppercase font-body">
              Exclusive Access
            </span>
            <span className="block w-6 h-px bg-brand-amber" aria-hidden="true" />
          </div>
          <h2
            id="newsletter-heading"
            className="text-brand-offwhite mx-auto max-w-xl font-display uppercase"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Be First to the Drop
          </h2>
          <p className="text-brand-stone text-sm max-w-md mx-auto font-body font-light">
            Get early access to exclusive releases, behind-the-scenes content, and member-only offers.
          </p>
          <form
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("You're on the list! Welcome to the inner circle.");
              (e.target as HTMLFormElement).reset();
            }}
            aria-label="Newsletter signup"
          >
            <label htmlFor="homepage-newsletter-email" className="sr-only">Email address</label>
            <input
              id="homepage-newsletter-email"
              type="email"
              required
              placeholder="your@email.com"
              className="flex-1 px-4 py-3.5 text-sm bg-brand-graphite border border-brand-muted text-brand-offwhite placeholder-brand-stone focus:border-brand-amber focus:outline-none font-body"
            />
            <button
              type="submit"
              className="btn-primary whitespace-nowrap"
              id="newsletter-submit"
            >
              <span>Join the List</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
