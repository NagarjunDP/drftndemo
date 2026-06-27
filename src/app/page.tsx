'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import { dbService } from '@/lib/db';
import { Product, Category } from '@/types';
import { useCartStore } from '@/lib/cartStore';
import { toast } from '@/lib/toast';

/* ──────────────────────────────────────────
   REVEAL-ON-SCROLL HOOK
   ────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

/* ──────────────────────────────────────────
   COUNTER ANIMATION
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
   PRODUCT CARD
   ────────────────────────────────────────── */
function ProductCard({ prod, onQuickAdd }: { prod: Product; onQuickAdd: (e: React.MouseEvent, p: Product) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/shop/${prod.slug}`}
      className="group product-card block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="product-card-image aspect-[3/4] bg-brand-graphite overflow-hidden relative">
        <Image
          src={prod.images[0] || 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800'}
          alt={prod.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />

        {/* Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-brand-black/70 via-transparent to-transparent transition-opacity duration-500 ${hovered ? 'opacity-100' : 'opacity-0'}`} />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {prod.compare_price && prod.compare_price > prod.price && (
            <span className="bg-brand-red text-brand-offwhite text-[9px] font-bold py-1 px-2 tracking-widest uppercase">
              Sale
            </span>
          )}
          {prod.is_featured && (
            <span className="bg-brand-gold text-brand-black text-[9px] font-bold py-1 px-2 tracking-widest uppercase">
              Featured
            </span>
          )}
        </div>

        {/* Quick Add */}
        <div
          className={`absolute bottom-0 inset-x-0 p-4 transition-all duration-400 ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
        >
          <button
            onClick={(e) => onQuickAdd(e, prod)}
            className="w-full bg-brand-offwhite text-brand-black text-[10px] tracking-[0.2em] font-bold py-3 uppercase hover:bg-brand-red hover:text-brand-offwhite transition-colors duration-200"
            id={`quick-add-${prod.id}`}
          >
            Add to Bag
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="pt-4 space-y-1">
        <p className="text-[10px] text-brand-gray tracking-[0.2em] uppercase font-medium">{prod.category}</p>
        <h3 className="text-sm font-semibold text-brand-offwhite tracking-wide line-clamp-1 group-hover:text-brand-cream transition-colors font-body">
          {prod.name}
        </h3>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-sm font-semibold text-brand-offwhite font-body">
            ₹{(prod.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </span>
          {prod.compare_price && prod.compare_price > prod.price && (
            <span className="text-xs text-brand-gray line-through">
              ₹{(prod.compare_price / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────
   MAIN PAGE COMPONENT
   ────────────────────────────────────────── */
export default function Homepage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  // Section refs for reveal
  const heroRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const categoryRef = useRef<HTMLElement>(null);
  const featuredRef = useRef<HTMLElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const igRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Intersection observer for section reveals
    const sections = [statsRef, categoryRef, featuredRef, storyRef, igRef];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
          }
        });
      },
      { threshold: 0.08 }
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
    toast.success(`${product.name} added to your bag`);
  };

  return (
    <div className="w-full flex flex-col bg-brand-black">

      {/* ════════════════════════════════════════
          1. HERO — CINEMATIC FULL-BLEED
          ════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative w-full h-[92vh] min-h-[600px] overflow-hidden flex items-end"
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/hero-clothing.png"
            alt="DRFTN Hero"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/50 to-brand-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-black/60 via-transparent to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-6 md:px-12 pb-16 md:pb-24">
          <div className="max-w-2xl">
            {/* Label */}
            <div className="flex items-center gap-3 mb-6 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both', opacity: 0 }}>
              <span className="block w-8 h-px bg-brand-gold" />
              <span className="text-brand-gold text-[10px] font-semibold tracking-[0.3em] uppercase font-body">
                Summer Drop 2025
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-brand-offwhite mb-6 animate-fade-up"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(3.5rem, 9vw, 8rem)',
                fontWeight: 700,
                lineHeight: 1.0,
                letterSpacing: '-0.02em',
                animationDelay: '0.4s',
                animationFillMode: 'both',
                opacity: 0,
              }}
            >
              Drift in
              <br />
              <em className="text-brand-cream italic">Style.</em>
            </h1>

            {/* Subline */}
            <p
              className="text-brand-silver text-sm md:text-base font-light leading-relaxed max-w-md mb-8 animate-fade-up font-body"
              style={{ animationDelay: '0.6s', animationFillMode: 'both', opacity: 0 }}
            >
              Premium streetwear rooted in Yelahanka, Bengaluru.
              Heavy fabrics. Unisex silhouettes. Zero compromise.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row items-start gap-4 animate-fade-up"
              style={{ animationDelay: '0.8s', animationFillMode: 'both', opacity: 0 }}
            >
              <Link href="/shop" className="btn-primary">
                <span>Shop Collection</span>
                <ArrowRight className="w-3.5 h-3.5 relative z-10" />
              </Link>
              <Link href="/about" className="btn-outline">
                <span>Our Story</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 right-8 md:right-12 z-10 flex flex-col items-center gap-2 opacity-40">
          <span className="text-[9px] tracking-[0.3em] text-brand-silver uppercase rotate-90 origin-center font-body">Scroll</span>
          <div className="w-px h-12 bg-brand-silver/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-silver animate-pulse-slow" />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          2. TRUST / STATS BAR
          ════════════════════════════════════════ */}
      <section ref={statsRef} className="border-y border-brand-graphite bg-brand-charcoal py-8 px-6 md:px-12">
        <div className="max-w-screen-2xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-brand-muted/40">
          {[
            { value: 5000, suffix: '+', label: 'Happy Customers' },
            { value: 100, suffix: '%', label: 'Premium Fabrics' },
            { value: 48, suffix: 'h', label: 'Dispatch Time' },
            { value: 4, suffix: '★', label: 'Avg. Rating' },
          ].map((stat, i) => (
            <div key={i} className={`reveal reveal-delay-${i + 1} text-center px-6 flex flex-col items-center gap-1.5`}>
              <span
                className="text-3xl md:text-4xl font-bold text-brand-offwhite"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                <AnimatedCounter to={stat.value} suffix={stat.suffix} />
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-brand-gray font-body font-medium">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          3. CATEGORIES — EDITORIAL GRID
          ════════════════════════════════════════ */}
      <section ref={categoryRef} className="py-24 md:py-32 px-6 md:px-12 max-w-screen-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14 gap-6 reveal">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="block w-6 h-px bg-brand-gold" />
              <span className="text-brand-gold text-[10px] font-semibold tracking-[0.3em] uppercase font-body">
                Departments
              </span>
            </div>
            <h2
              className="text-brand-offwhite leading-none"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 700,
              }}
            >
              Shop by Category
            </h2>
          </div>
          <Link
            href="/shop"
            className="group flex items-center gap-2 text-[11px] text-brand-silver hover:text-brand-offwhite tracking-[0.2em] uppercase font-semibold transition-colors font-body"
          >
            View All
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Category Grid */}
        {categories.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {categories.map((cat, i) => (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                className={`group reveal reveal-delay-${(i % 4) + 1} relative overflow-hidden bg-brand-graphite ${i === 0 ? 'row-span-1 md:col-span-2 aspect-[16/10] md:aspect-auto md:h-96' : 'aspect-[3/4]'
                  }`}
              >
                <Image
                  src={cat.image_url}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] filter grayscale group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black/90 via-brand-black/30 to-transparent" />

                <div className="absolute bottom-0 inset-x-0 p-6 md:p-8">
                  <h3
                    className="text-brand-offwhite text-lg md:text-2xl font-semibold mb-1 group-hover:text-brand-cream transition-colors"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {cat.name}
                  </h3>
                  <span className="flex items-center gap-1.5 text-[10px] text-brand-gold tracking-[0.2em] uppercase font-body font-medium">
                    Explore <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          // Fallback skeleton
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[3/4] shimmer" />
            ))}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════
          4. FEATURED PRODUCTS
          ════════════════════════════════════════ */}
      <section
        ref={featuredRef}
        className="py-24 md:py-32 px-6 md:px-12 border-t border-brand-graphite bg-brand-charcoal/30 w-full"
      >
        <div className="max-w-screen-2xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14 gap-6 reveal">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="block w-6 h-px bg-brand-gold" />
                <span className="text-brand-gold text-[10px] font-semibold tracking-[0.3em] uppercase font-body">
                  Exclusives
                </span>
              </div>
              <h2
                className="text-brand-offwhite leading-none"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                  fontWeight: 700,
                }}
              >
                Hottest Drops
              </h2>
            </div>
            <Link
              href="/shop"
              className="group flex items-center gap-2 text-[11px] text-brand-silver hover:text-brand-offwhite tracking-[0.2em] uppercase font-semibold transition-colors font-body"
            >
              View All Products
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Products */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[3/4] shimmer" />
                  <div className="h-3 shimmer w-2/3" />
                  <div className="h-4 shimmer w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {featuredProducts.map((prod, i) => (
                <div
                  key={prod.id}
                  className={`reveal reveal-delay-${(i % 4) + 1}`}
                >
                  <ProductCard prod={prod} onQuickAdd={handleQuickAdd} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════
          5. BRAND STORY — EDITORIAL SPLIT
          ════════════════════════════════════════ */}
      <section
        ref={storyRef}
        className="py-24 md:py-40 px-6 md:px-12 max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center"
      >
        {/* Text */}
        <div className="space-y-8">
          <div className="reveal space-y-4">
            <div className="flex items-center gap-3">
              <span className="block w-6 h-px bg-brand-gold" />
              <span className="text-brand-gold text-[10px] font-semibold tracking-[0.3em] uppercase font-body">
                The Brand
              </span>
            </div>
            <h2
              className="text-brand-offwhite leading-tight"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(2.2rem, 5vw, 4rem)',
                fontWeight: 700,
              }}
            >
              Born in Yelahanka.
              <br />
              <em className="italic text-brand-cream">Built for the World.</em>
            </h2>
          </div>

          <div className="reveal reveal-delay-2 space-y-4">
            <p className="text-brand-silver text-sm md:text-base leading-relaxed font-body font-light">
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
              <ArrowUpRight className="w-3.5 h-3.5 relative z-10" />
            </Link>
          </div>

          {/* Brand Values */}
          <div className="reveal reveal-delay-4 grid grid-cols-3 gap-6 pt-4 border-t border-brand-graphite">
            {['Heavyweight', 'Unisex Fit', 'D2C Direct'].map((val) => (
              <div key={val} className="space-y-1">
                <span className="block w-4 h-px bg-brand-gold mb-2" />
                <p className="text-[11px] tracking-[0.15em] text-brand-silver uppercase font-body font-medium">
                  {val}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Images Collage */}
        <div className="reveal reveal-delay-2 grid grid-cols-2 gap-3 h-[500px] md:h-[600px]">
          <div className="overflow-hidden relative h-full">
            <Image
              src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&auto=format&fit=crop&q=85"
              alt="Streetwear model"
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover hover:scale-105 transition-transform duration-700 ease-out grayscale hover:grayscale-0"
            />
          </div>
          <div className="overflow-hidden relative h-full mt-10">
            <Image
              src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=85"
              alt="Clothing detail"
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover hover:scale-105 transition-transform duration-700 ease-out grayscale hover:grayscale-0"
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          6. MATERIAL FEATURE — EDITORIAL BANNER
          ════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-b border-brand-graphite">
        <div className="relative h-64 md:h-80">
          <Image
            src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1600&auto=format&fit=crop&q=80"
            alt="DRFTN fabric detail"
            fill
            sizes="100vw"
            className="object-cover grayscale opacity-40"
          />
          <div className="absolute inset-0 bg-brand-black/70" />
          <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
            <div className="space-y-4">
              <p className="text-brand-gold text-[10px] tracking-[0.4em] uppercase font-body font-semibold">
                Our Material Promise
              </p>
              <blockquote
                className="text-brand-offwhite max-w-3xl mx-auto italic"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(1.4rem, 4vw, 2.8rem)',
                  fontWeight: 400,
                  lineHeight: 1.3,
                }}
              >
                &ldquo;Every thread is chosen with intention. Every cut is deliberate. Every garment is a statement.&rdquo;
              </blockquote>
              <p className="text-brand-gray text-xs tracking-[0.25em] uppercase font-body">
                — DRFTN CLOTHING
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          7. INSTAGRAM LOOKBOOK
          ════════════════════════════════════════ */}
      <section
        ref={igRef}
        className="py-24 md:py-32 px-6 md:px-12 w-full"
      >
        <div className="max-w-screen-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14 reveal space-y-3">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="block w-6 h-px bg-brand-gold" />
              <span className="text-brand-gold text-[10px] font-semibold tracking-[0.3em] uppercase font-body">
                Lookbook
              </span>
              <span className="block w-6 h-px bg-brand-gold" />
            </div>
            <h2
              className="text-brand-offwhite"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                fontWeight: 700,
              }}
            >
              Drift With Us
            </h2>
            <a
              href="https://instagram.com/drftnclothing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-brand-silver hover:text-brand-gold tracking-[0.2em] uppercase transition-colors font-body font-medium"
            >
              @drftnclothing
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
            {[
              'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500',
              'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500',
              'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=500',
              'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500',
              'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500',
              'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=500',
            ].map((url, i) => (
              <a
                key={i}
                href="https://instagram.com/drftnclothing"
                target="_blank"
                rel="noopener noreferrer"
                className={`reveal reveal-delay-${(i % 4) + 1} aspect-square overflow-hidden block group bg-brand-graphite relative`}
              >
                <Image
                  src={url}
                  alt={`Lookbook photo ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover transition-all duration-500 grayscale group-hover:grayscale-0 group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          8. EMAIL CAPTURE BANNER
          ════════════════════════════════════════ */}
      <section className="border-t border-brand-graphite bg-brand-charcoal py-20 px-6 md:px-12">
        <div className="max-w-screen-2xl mx-auto text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="block w-6 h-px bg-brand-gold" />
            <span className="text-brand-gold text-[10px] font-semibold tracking-[0.3em] uppercase font-body">
              Inner Circle
            </span>
            <span className="block w-6 h-px bg-brand-gold" />
          </div>
          <h2
            className="text-brand-offwhite mx-auto max-w-xl"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              fontWeight: 700,
            }}
          >
            Be First to the Drop
          </h2>
          <p className="text-brand-gray text-sm max-w-md mx-auto font-body font-light">
            Get early access to exclusive releases, behind-the-scenes content, and member-only offers.
          </p>
          <form
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("You're on the list! Welcome to the inner circle.");
              (e.target as HTMLFormElement).reset();
            }}
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              className="flex-1 px-4 py-3.5 text-sm bg-brand-graphite border border-brand-muted text-brand-offwhite placeholder-brand-gray focus:border-brand-gold focus:outline-none font-body"
              id="newsletter-email"
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
