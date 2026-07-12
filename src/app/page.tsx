'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, ChevronRight, Plus } from 'lucide-react';
import { dbService } from '@/lib/db';
import { Product, Category } from '@/types';
import { useCartStore } from '@/lib/cartStore';
import { useAnimationStore } from '@/lib/animationStore';
import { toast } from '@/lib/toast';
import HeroSection from '@/components/HeroSection';
import DesktopHeroParallax from '@/components/DesktopHeroParallax';
import RevealSection from '@/components/RevealSection';
import AnnouncementTicker from '@/components/AnnouncementTicker';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

/* ──────────────────────────────────────────
   PRODUCT CARD (logic unchanged, visual upgrade)
   ────────────────────────────────────────── */
function ProductCard({
  prod,
  onQuickAdd,
  aspectClass = 'aspect-[4/5]',
  showActions = false
}: {
  prod: Product;
  onQuickAdd: (e: React.MouseEvent, p: Product) => void;
  aspectClass?: string;
  showActions?: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);

  const isOutOfStock = prod.sizes.every((s) => (prod.stock_quantity[s] || 0) === 0);

  const handleQuickAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding || isOutOfStock) return;
    setIsAdding(true);
    setTimeout(() => setIsAdding(false), 900);
    onQuickAdd(e, prod);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full"
    >
      <Link
        href={`/shop/${prod.slug}`}
        className="group flex flex-col bg-transparent text-left w-full relative"
        aria-label={`View ${prod.name} — ₹${(prod.price / 100).toLocaleString('en-IN')}`}
      >
        <motion.div
          whileTap={{ scale: 0.97, filter: 'brightness(1.08)' }}
          transition={{ duration: 0.15 }}
          className="flex flex-col w-full text-left"
        >
          {/* Image Container */}
          <div className={`relative overflow-hidden rounded-xl bg-brand-charcoal ${aspectClass} w-full border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.5)]`}>
            <Image
              src={prod.images[0] || 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800'}
              alt={prod.name}
              fill
              sizes="(max-width: 768px) 85vw, 40vw"
              loading="lazy"
              className="object-cover transition-transform duration-[750ms] ease-out group-hover:scale-[1.01]"
            />
            {/* Subtle bottom dark gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />

            {/* Refined Minimal Outlined Badges */}
            {isOutOfStock ? (
              <div className="absolute top-3.5 left-3.5 z-20 border border-white/10 text-white/50 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-[2px]">
                <span className="text-[9px] font-mono font-bold tracking-widest uppercase">
                  SOLD OUT
                </span>
              </div>
            ) : prod.is_featured ? (
              <div className="absolute top-3.5 left-3.5 z-20 border border-white/20 text-white/95 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-[2px]">
                <span className="text-[9px] font-mono font-bold tracking-widest uppercase">
                  NEW DROP
                </span>
              </div>
            ) : null}

            {/* Actions */}
            {showActions && !isOutOfStock && (
              <div className="absolute bottom-3.5 right-3.5 z-10">
                <button
                  onClick={handleQuickAddClick}
                  disabled={isAdding}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200 active:scale-90 ${
                    isAdding
                      ? 'bg-white text-black border border-white'
                      : 'bg-black/60 hover:bg-black/80 text-white border border-white/10'
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
            )}
          </div>

          {/* Product Details (Unified rhythm) */}
          <div className="pt-3 pb-1 flex flex-col text-left space-y-1">
            <h3 className="text-xs font-semibold text-white tracking-[0.06em] uppercase line-clamp-1 font-body">
              {prod.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-body">
                ₹{(prod.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </span>
              {prod.compare_price && prod.compare_price > prod.price && (
                <>
                  <span className="text-[10px] text-white/40 line-through font-body">
                    ₹{(prod.compare_price / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] font-mono text-white/50 tracking-wider">
                    -{Math.round(((prod.compare_price - prod.price) / prod.compare_price) * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
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


  const categoryRef = useRef<HTMLElement>(null);
  const featuredRef = useRef<HTMLElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const igRef = useRef<HTMLElement>(null);

  // Load product data
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

  // GSAP ScrollTrigger Animation binding
  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      // reveals now handled natively by Framer Motion
      return;
    });

    ScrollTrigger.refresh();

    return () => ctx.revert();
  }, [loading]);

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
    <div id="page-wrapper" className="w-full bg-brand-black relative">



      {/* ═══════════════════════════════════════════
          1. HERO — CINEMATIC WIPE & original copy
          Mobile: existing HeroSection (untouched)
          Desktop (≥768px): layered parallax hero
          ═══════════════════════════════════════════ */}

      {/* Mobile hero — hidden on md+ */}
      <div className="md:hidden">
        <HeroSection />
      </div>

      {/* Desktop parallax hero — hidden below md */}
      <div className="hidden md:block">
        <DesktopHeroParallax />
      </div>

      {/* ═══════════════════════════════════════════
          NEW: LIGHT TO DARK REVEAL SECTION
          ═══════════════════════════════════════════ */}
      <RevealSection />

      {/* ═══════════════════════════════════════════
          2. CATEGORIES (DEPARTMENTS) — checkpoint 1
          ═══════════════════════════════════════════ */}
      <section
        ref={categoryRef}
        className="pt-12 pb-16 md:pt-16 md:pb-20 w-full overflow-hidden text-brand-offwhite relative z-10"
        aria-labelledby="categories-heading"
      >

        {/* Header */}
        <motion.div
          initial={{ opacity: 0.3, filter: 'blur(4px)', y: 16 }}
          whileInView={{
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            textShadow: [
              '0 0 0px rgba(255,255,255,0)',
              '0 0 15px rgba(255,255,255,0.4)',
              '0 0 0px rgba(255,255,255,0)',
            ],
          }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{
            opacity: { type: 'spring', stiffness: 100, damping: 15 },
            y: { type: 'spring', stiffness: 100, damping: 15 },
            filter: { duration: 0.5 },
            textShadow: { duration: 0.4, delay: 0.35 }
          }}
          className="flex items-end justify-between mb-16 px-6 md:px-12 max-w-screen-2xl mx-auto w-full animate-telemetry-hud"
        >
          <div className="relative pl-6 py-2 text-left">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-white/20" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-white/20" />
            
            <h2
              id="categories-heading"
              className="text-white leading-none font-display uppercase text-3xl md:text-5xl tracking-tight"
            >
              COLLECTIONS
            </h2>
          </div>

          <Link
            href="/shop"
            className="flex items-center gap-3 border border-[#2A2A2A] hover:border-white bg-[#121212]/50 hover:bg-white/5 px-4 py-2.5 rounded-[8px] transition-all duration-300 group"
          >
            <span className="text-[10px] font-bold text-white tracking-[0.15em] uppercase font-mono">
              EXPLORE ALL
            </span>
            {/* Visual telemetry dashboard gauge */}
            <div className="flex items-center gap-0.5 font-mono text-[9px] text-white">
              <span className="w-1.5 h-2.5 bg-white rounded-[1px] animate-pulse" />
              <span className="w-1.5 h-1.5 bg-zinc-800 rounded-[1px]" />
              <span className="w-1.5 h-1.5 bg-zinc-800 rounded-[1px]" />
            </div>
          </Link>
        </motion.div>

        {/* Product Cards Grid (Rebuilt as a clean, image-forward product grid) */}
        {featuredProducts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[8px] md:gap-6 px-4 md:px-12 max-w-screen-2xl mx-auto w-full">
              {featuredProducts.slice(0, 4).map((prod) => (
                <ProductCard
                  key={prod.id}
                  prod={prod}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="max-w-screen-2xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 px-4 md:px-12" aria-busy="true" aria-label="Loading collections">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className="w-full aspect-[3/4] shimmer rounded-[8px]" 
              />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          3. BRAND STORY — checkpoint 2
          ═══════════════════════════════════════════ */}
      <section
        ref={storyRef}
        className="py-16 md:py-24 px-6 md:px-12 max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-10"
        aria-labelledby="story-heading"
      >

        {/* Text */}
        <motion.div
          initial={{ opacity: 0.3, filter: 'blur(4px)', y: 16 }}
          whileInView={{
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            textShadow: [
              '0 0 0px rgba(255,255,255,0)',
              '0 0 15px rgba(255,255,255,0.4)',
              '0 0 0px rgba(255,255,255,0)',
            ],
          }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{
            opacity: { type: 'spring', stiffness: 100, damping: 15 },
            y: { type: 'spring', stiffness: 100, damping: 15 },
            filter: { duration: 0.5 },
            textShadow: { duration: 0.4, delay: 0.35 }
          }}
          className="space-y-8 border-l-2 border-white/10 pl-6 lg:pl-10"
        >
          <div className="relative pl-6 py-2 text-left">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-white/20" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-white/20" />
            <h2
              id="story-heading"
              className="text-white leading-none font-display uppercase text-3xl md:text-5xl tracking-tight"
            >
              Born in Yelahanka.
              <br />
              <span className="text-brand-stone/60 font-light">Built for the World.</span>
            </h2>
          </div>

          <div className="space-y-4 text-left">
            <p className="text-brand-stone text-sm md:text-base leading-relaxed font-body font-normal">
              DRFTN CLOTHING is a premium D2C brand that represents the spirit of youth culture
              in Yelahanka, Bengaluru. Inspired by industrial minimalism and global streetwear,
              we build apparel that balances durability with a relaxed unisex fit.
            </p>
            <p className="text-brand-silver text-xs leading-relaxed font-body font-normal">
              Every garment we produce is created using curated heavyweight fabrics,
              drop shoulder tailoring, and bold graphic expressions. We don&apos;t follow
              trends — we set the drift.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link href="/about" className="btn-secondary-dark text-xs font-bold uppercase tracking-widest px-8 py-4 inline-flex items-center gap-1">
              <span>Read Our Philosophy</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Brand Values */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-brand-graphite/40">
            {[
              { label: 'Heavyweight', note: 'Fabrics' },
              { label: 'Unisex', note: 'Silhouettes' },
              { label: 'D2C', note: 'Direct' },
            ].map((val) => (
              <div key={val.label} className="space-y-1 text-left">
                <span className="block w-4 h-[2px] bg-white/60 mb-2" aria-hidden="true" />
                <p className="text-[10px] tracking-[0.15em] text-white uppercase font-body font-bold">{val.label}</p>
                <p className="text-[9px] tracking-wider text-brand-stone uppercase font-body">{val.note}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Images Collage */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="grid grid-cols-2 gap-3.5 h-[420px] md:h-[520px]"
        >
          <div className="overflow-hidden relative h-full rounded-[var(--radius-lg)] bg-brand-charcoal border border-white/5">
            <Image
              src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&auto=format&fit=crop&q=85"
              alt="DRFTN model wearing streetwear"
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              loading="lazy"
              className="object-cover hover:scale-103 transition-transform duration-700 grayscale hover:grayscale-0"
            />
          </div>
          <div className="overflow-hidden relative h-full mt-10 rounded-[var(--radius-lg)] bg-brand-charcoal border border-white/5">
            <Image
              src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=85"
              alt="DRFTN fabric and garment detail"
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              loading="lazy"
              className="object-cover hover:scale-103 transition-transform duration-700 grayscale hover:grayscale-0"
            />
          </div>
        </motion.div>
      </section>

      {/* ── Promo Banner Strip ── */}
      <section className="w-full bg-white py-5 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 border-y border-white/5">
        <p className="text-black font-display font-black text-sm md:text-base tracking-[0.08em] uppercase text-center md:text-left">
          LIMITED RUN: HEAVYWEIGHT ACID-WASH OVERSIZED SILHOUETTES OUT NOW
        </p>
        <Link 
          href="/shop" 
          className="text-black font-body font-bold text-xs uppercase tracking-widest underline decoration-2 hover:opacity-85 transition-opacity"
        >
          EXPLORE MORE
        </Link>
      </section>



      {/* ═══════════════════════════════════════════
          5. EDITORIAL BANNER — Philosophy Promise
          ═══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden border-t border-brand-graphite/40 w-full z-10"
        aria-label="Brand philosophy"
      >
        <div className="relative h-72 md:h-96">
          <Image
            src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1600&auto=format&fit=crop&q=80"
            alt="DRFTN premium fabric detail"
            fill
            sizes="100vw"
            loading="lazy"
            className="object-cover grayscale opacity-20"
          />
          <div className="absolute inset-0 bg-brand-black/80" aria-hidden="true" />
          <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
            <div className="space-y-4 max-w-3xl">
              <p className="text-white/60 text-[10px] tracking-[0.45em] uppercase font-body font-bold">
                Our Material Promise
              </p>
              <blockquote className="text-white font-display uppercase tracking-wider leading-tight" style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.6rem)' }}>
                &ldquo;Every thread is chosen with intention. Every cut is deliberate. Every garment is a statement.&rdquo;
              </blockquote>
              <p className="text-brand-stone text-[10px] tracking-[0.3em] uppercase font-body">
                — DRFTN CLOTHING
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          6. LOOKBOOK GALLERY — Instagram collage
          ═══════════════════════════════════════════ */}
      <section
        ref={igRef}
        className="py-16 md:py-24 px-6 md:px-12 w-full relative z-10 border-t border-brand-graphite/40"
        aria-labelledby="lookbook-heading"
      >
        <div className="max-w-screen-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0.3, filter: 'blur(4px)', y: 16 }}
            whileInView={{
              opacity: 1,
              filter: 'blur(0px)',
              y: 0,
              textShadow: [
                '0 0 0px rgba(255,255,255,0)',
                '0 0 15px rgba(255,255,255,0.4)',
                '0 0 0px rgba(255,255,255,0)',
              ],
            }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{
              opacity: { type: 'spring', stiffness: 100, damping: 15 },
              y: { type: 'spring', stiffness: 100, damping: 15 },
              filter: { duration: 0.5 },
              textShadow: { duration: 0.4, delay: 0.35 }
            }}
            className="text-center mb-14 space-y-3"
          >
            <span className="block w-6 h-[2px] bg-white mx-auto mb-3" aria-hidden="true" />
            <h2
              id="lookbook-heading"
              className="text-white font-display uppercase text-3xl md:text-5xl tracking-tight"
            >
              Drift With Us
            </h2>
            <a
              href="https://instagram.com/drftnclothing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] text-brand-stone hover:text-white tracking-[0.25em] uppercase transition-colors font-body font-bold"
              aria-label="Follow DRFTN on Instagram @drftnclothing"
            >
              @drftnclothing
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </motion.div>

          {/* Asymmetric Photo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { url: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500', alt: 'DRFTN streetwear hoodie details' },
              { url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500', alt: 'DRFTN graphic tee look' },
              { url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500', alt: 'DRFTN streetwear silhouette' },
              { url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500', alt: 'DRFTN heavy custom hoodie' },
              { url: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=500', alt: 'DRFTN techwear jacket display' },
              { url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500', alt: 'DRFTN minimal industrial aesthetic fit' },
            ].map((img, i) => (
              <div
                key={i}
                className="relative overflow-hidden aspect-[4/5] rounded-[var(--radius-md)] bg-brand-charcoal border border-white/5 group"
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, 16vw"
                  loading="lazy"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
