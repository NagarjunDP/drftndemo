'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, ChevronRight, Plus } from 'lucide-react';
import { dbService } from '@/lib/db';
import { getOptimizedImageUrl } from '@/lib/cloudinary';
import SignatureGallery from '@/components/SignatureGallery';
import { Product, Category } from '@/types';
import { useCartStore } from '@/lib/cartStore';
import { useAnimationStore } from '@/lib/animationStore';
import { toast } from '@/lib/toast';
import HeroSection from '@/components/HeroSection';
import DesktopHeroParallax from '@/components/DesktopHeroParallax';
import RevealSection from '@/components/RevealSection';
import AnnouncementTicker from '@/components/AnnouncementTicker';
import { motion, AnimatePresence } from 'framer-motion';

/* ──────────────────────────────────────────
   PRODUCT CARD (Scrub gallery & visual polish)
   ────────────────────────────────────────── */
function ProductCard({
  prod,
  onQuickAdd,
  aspectClass = 'aspect-[4/5]',
  showActions = false,
  index = 0
}: {
  prod: Product;
  onQuickAdd: (e: React.MouseEvent, p: Product) => void;
  aspectClass?: string;
  showActions?: boolean;
  index?: number;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const animationFrameId = React.useRef<number | null>(null);

  const isOutOfStock = prod.sizes.every((s) => (prod.stock_quantity[s] || 0) === 0);

  // Restrict homepage teaser cards to max 3 images (hero + detail + texture)
  const displayImages = prod.images.slice(0, 3);
  const imageCount = displayImages.length;

  const handlePointerMove = (clientX: number) => {
    if (!cardRef.current || imageCount <= 1 || isOutOfStock) return;

    if (!hasInteracted) {
      setHasInteracted(true);
    }

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    animationFrameId.current = requestAnimationFrame(() => {
      const rect = cardRef.current!.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const nextIdx = Math.min(imageCount - 1, Math.floor(pct * imageCount));
      setActiveIdx(nextIdx);
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handlePointerMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX);
    }
  };

  const handlePointerLeave = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    setActiveIdx(0);
  };

  React.useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const handleQuickAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding || isOutOfStock) return;
    setIsAdding(true);
    setTimeout(() => setIsAdding(false), 900);
    onQuickAdd(e, prod);
  };

  // Stagger reveal on viewport entry
  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' as const, delay: index * 0.08 }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10%' }}
      className="w-full"
    >
      <Link
        href={`/shop/${prod.slug}`}
        className="group flex flex-col bg-transparent text-left w-full relative"
        aria-label={`View ${prod.name} — ₹${(prod.price / 100).toLocaleString('en-IN')}`}
      >
        <motion.div
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col w-full text-left"
        >
          {/* Image Container */}
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handlePointerLeave}
            data-cursor="product"
            className={`product-image-hoverable relative overflow-hidden rounded-sm bg-[--drftn-gray-900] ${aspectClass} w-full`}
          >
            <SignatureGallery
              images={displayImages}
              activeIndex={activeIdx}
              onChangeIndex={(idx) => setActiveIdx(idx)}
              aspectClass={aspectClass}
              sizes="(max-width: 768px) 50vw, 25vw"
              enableDrag={true}
              imageWidth={800}
              overlayLeft={
                isOutOfStock ? (
                  <span className="text-[10px] font-mono font-medium tracking-[0.12em] text-[--drftn-white]/50 uppercase">
                    GONE
                  </span>
                ) : prod.is_featured ? (
                  <span className="text-[10px] font-mono font-medium tracking-[0.16em] text-[--drftn-white]/85 uppercase">
                    NEW
                  </span>
                ) : null
              }
            />

            {/* Desktop Only Ghost Text Overlay */}
            <div className="absolute inset-0 pointer-events-none z-[12] flex items-center justify-center p-4 hidden md:flex">
              <span
                style={{
                  fontSize: 'clamp(1.2rem, 3.5vw, 2.5rem)',
                  WebkitTextStroke: '1px var(--drftn-white)',
                  color: 'transparent',
                }}
                className="text-center font-display font-black uppercase tracking-tighter text-transparent opacity-0 group-hover:opacity-85 transition-all duration-[300ms] ease-out select-none"
              >
                {prod.name}
              </span>
            </div>

            {/* Subtle bottom dark gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-[11]" />

            {/* Actions */}
            {showActions && !isOutOfStock && (
              <div className="absolute bottom-3 right-3 z-20">
                <button
                  onClick={handleQuickAddClick}
                  disabled={isAdding}
                  className={`w-8 h-8 rounded-none flex items-center justify-center transition-all duration-200 active:scale-90 border ${isAdding
                      ? 'bg-[--drftn-white] text-[--drftn-black] border-[--drftn-white]'
                      : 'bg-[--drftn-black]/60 hover:bg-[--drftn-black]/80 text-[--drftn-white] border-[--drftn-gray-700]'
                    }`}
                  id={`quick-add-${prod.id}`}
                  aria-label={`Quick add ${prod.name} to cart`}
                >
                  {isAdding ? (
                    <span className="text-[10px] font-mono">✓</span>
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Product Details with generous spacing and single baseline for pricing */}
          <div className="pt-3 pb-6 flex flex-col text-left space-y-1">
            <h3 className="text-xs font-display text-[--drftn-white] tracking-[0.08em] uppercase line-clamp-1">
              {prod.name}
            </h3>
            <div className="flex items-baseline gap-2 h-5 text-xs font-mono">
              <span className="text-[--drftn-white] font-medium">
                ₹{(prod.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </span>
              {prod.compare_price && prod.compare_price > prod.price && (
                <>
                  <span className="text-[10px] text-[--drftn-gray-500] line-through font-normal">
                    ₹{(prod.compare_price / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-[--drftn-gray-500] font-normal tracking-wide">
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

type HomeGridItem = 
  | { type: 'product'; product: Product; spanClass: string }
  | { type: 'banner'; id: string; title: string; subtitle: string; image: string; category: string; spanClass: string };

const getGridItems = (products: Product[]): HomeGridItem[] => {
  const items: HomeGridItem[] = [];
  let pIdx = 0;
  let i = 0;
  
  while (pIdx < products.length) {
    const pos = i % 6;
    if (pos === 5) {
      items.push({
        type: 'banner',
        id: `banner-${i}`,
        title: 'DROP 01 — BUILT DIFFERENT',
        subtitle: 'THE TECHWEAR MANIFESTO',
        image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200',
        category: 'sweatshirts',
        spanClass: 'col-span-2 md:col-span-4 w-full h-[320px] md:h-[480px]'
      });
    } else {
      const spanClass = pos === 2 
        ? 'col-span-2 md:col-span-2 md:row-span-2' 
        : 'col-span-1';
      items.push({
        type: 'product',
        product: products[pIdx++],
        spanClass
      });
    }
    i++;
  }
  return items;
};

const introContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    }
  }
};

const introLetterVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20 }
  }
};

/* ──────────────────────────────────────────
   MAIN PAGE — data logic unchanged, layout/styles upgraded
   ────────────────────────────────────────── */
export default function Homepage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem('drftn_intro_seen');
    if (!seen) {
      setShowIntro(true);
      sessionStorage.setItem('drftn_intro_seen', 'true');
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 420);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissIntro = () => {
    setShowIntro(false);
  };


  const categoryRef = useRef<HTMLElement>(null);
  const gridItems = getGridItems(featuredProducts.slice(0, 8));
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
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut' }}
            onClick={dismissIntro}
            className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center cursor-pointer select-none"
          >
            <motion.div
              variants={introContainerVariants}
              initial="hidden"
              animate="visible"
              className="flex gap-2 md:gap-4 items-center justify-center font-display font-black uppercase text-5xl md:text-8xl tracking-normal text-white"
            >
              {['D', 'R', 'F', 'T', 'N'].map((char, index) => (
                <motion.span
                  key={index}
                  variants={introLetterVariants}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



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
          className="flex items-baseline justify-between mb-12 md:mb-16 px-6 md:px-12 max-w-screen-2xl mx-auto w-full animate-telemetry-hud"
        >
          <div className="relative pl-6 py-2 text-left">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-white/20" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-white/20" />

            <h2
              id="categories-heading"
              className="text-white leading-none font-display uppercase text-4xl md:text-7xl tracking-tighter"
            >
              COLLECTIONS
            </h2>
          </div>

          <Link
            href="/shop"
            className="flex items-center gap-3 border border-[#2A2A2A] hover:border-white bg-[#121212]/50 hover:bg-white/5 px-4 py-2.5 rounded-sm transition-all duration-300 group"
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
            style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 650px' }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px] px-4 md:px-12 max-w-screen-2xl mx-auto w-full">
              {gridItems.map((item, idx) => {
                if (item.type === 'product') {
                  return (
                    <div key={item.product.id} className={item.spanClass}>
                      <ProductCard
                        prod={item.product}
                        index={idx}
                        onQuickAdd={handleQuickAdd}
                      />
                    </div>
                  );
                } else {
                  return (
                    <Link
                      key={item.id}
                      href={`/shop?category=${item.category}`}
                      data-cursor="banner"
                      className={`${item.spanClass} product-image-hoverable relative overflow-hidden group flex flex-col justify-end p-8 md:p-12 text-left`}
                    >
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.02] brightness-[0.45]"
                      />
                      {/* Typographic contrast title */}
                      <div className="relative z-10 space-y-2">
                        <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-brand-amber uppercase block">
                          {item.subtitle}
                        </span>
                        <h3 className="text-3xl md:text-6xl font-display font-black uppercase tracking-tighter text-white leading-none">
                          {item.title}
                        </h3>
                      </div>
                    </Link>
                  );
                }
              })}
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
