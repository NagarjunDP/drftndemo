'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Product } from '@/types';
import { getOptimizedImageUrl } from '@/lib/cloudinary';

interface ProductScrollShowcaseProps {
  products: Product[];
}

export default function ProductScrollShowcase({ products }: ProductScrollShowcaseProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  const leftCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rightCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const row1CardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const row2CardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [reducedMotion, setReducedMotion] = useState(false);

  // Take up to 10 products
  const showcaseProducts = products.slice(0, 10);
  
  // Split products for the two vertical desktop columns
  const leftProducts = showcaseProducts.filter((_, idx) => idx % 2 === 0);
  const rightProducts = showcaseProducts.filter((_, idx) => idx % 2 !== 0);

  // Split products for the mobile/tablet dual rows
  const row1Products = leftProducts;
  const row2Products = rightProducts;

  // Check user preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // GSAP animation logic
  useEffect(() => {
    if (typeof window === 'undefined' || reducedMotion || showcaseProducts.length === 0) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.matchMedia();

    // ──────────────────────────────────────────
    // DESKTOP SCREEN RESOLUTION (min-width: 1024px)
    // ──────────────────────────────────────────
    ctx.add('(min-width: 1024px)', () => {
      const vh = window.innerHeight;
      const leftColEl = leftColRef.current;
      const rightColEl = rightColRef.current;
      const sectionEl = sectionRef.current;
      if (!leftColEl || !rightColEl || !sectionEl) return;

      const leftHeight = leftColEl.offsetHeight;
      const rightHeight = rightColEl.offsetHeight;

      // Calculate vertical translation ranges
      const maxTranslateL = Math.max(0, leftHeight - vh + 140);
      const maxTranslateR = Math.max(0, rightHeight - vh + 140);
      const maxScrollLength = Math.max(maxTranslateL, maxTranslateR);

      const leftCards = leftCardRefs.current.filter(Boolean) as HTMLDivElement[];
      const rightCards = rightCardRefs.current.filter(Boolean) as HTMLDivElement[];

      // Initial state
      gsap.set(leftColEl, { y: -maxTranslateL });
      gsap.set(rightColEl, { y: -maxTranslateR });

      leftCards.concat(rightCards).forEach((card) => {
        gsap.set(card, { scale: 1, opacity: 0.6 });
      });

      // Master Desktop ScrollTrigger & Timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionEl,
          start: 'top top',
          end: () => `+=${maxScrollLength * 1.5}`,
          pin: true,
          scrub: 1,
          onEnter: () => {
            gsap.set([leftColEl, rightColEl, ...leftCards, ...rightCards], { willChange: 'transform, opacity' });
          },
          onEnterBack: () => {
            gsap.set([leftColEl, rightColEl, ...leftCards, ...rightCards], { willChange: 'transform, opacity' });
          },
          onLeave: () => {
            gsap.set([leftColEl, rightColEl, ...leftCards, ...rightCards], { clearProps: 'willChange' });
          },
          onLeaveBack: () => {
            gsap.set([leftColEl, rightColEl, ...leftCards, ...rightCards], { clearProps: 'willChange' });
          },
        },
      });

      // Left column moves downward (translates from -maxTranslateL to 0)
      tl.to(leftColEl, { y: 0, ease: 'none' }, 0);

      // Right column moves downward at slightly offset speed (starts with small offset)
      tl.fromTo(rightColEl, { y: -maxTranslateR + 100 }, { y: -100, ease: 'none' }, 0);

      const W = 0.22; // Focus window width

      // Left Column card focal animations
      leftCards.forEach((card) => {
        const cardCenterY = card.offsetTop + card.offsetHeight / 2;
        // Viewport centering target scroll position
        const T_i = cardCenterY - vh / 2;
        const P_i = gsap.utils.clamp(0, 1, (T_i + maxTranslateL) / maxTranslateL);

        const enterStart = P_i - W / 2;
        const exitStart = P_i;

        tl.to(card, { scale: 1.03, opacity: 1, duration: W / 2, ease: 'sine.out' }, Math.max(0, enterStart));
        tl.to(card, { scale: 1, opacity: 0.6, duration: W / 2, ease: 'sine.in' }, exitStart);
      });

      // Right Column card focal animations
      rightCards.forEach((card) => {
        const cardCenterY = card.offsetTop + card.offsetHeight / 2;
        // Viewport centering target for offset translation
        const T_j = cardCenterY - vh / 2;
        const P_j = gsap.utils.clamp(0, 1, (T_j + maxTranslateR - 100) / maxTranslateR);

        const enterStart = P_j - W / 2;
        const exitStart = P_j;

        tl.to(card, { scale: 1.03, opacity: 1, duration: W / 2, ease: 'sine.out' }, Math.max(0, enterStart));
        tl.to(card, { scale: 1, opacity: 0.6, duration: W / 2, ease: 'sine.in' }, exitStart);
      });
    });

    // ──────────────────────────────────────────
    // MOBILE / TABLET RESOLUTION (max-width: 1023px)
    // ──────────────────────────────────────────
    ctx.add('(max-width: 1023px)', () => {
      const vw = window.innerWidth;
      const row1El = row1Ref.current;
      const row2El = row2Ref.current;
      const sectionEl = sectionRef.current;
      if (!row1El || !row2El || !sectionEl) return;

      const row1Width = row1El.scrollWidth;
      const row2Width = row2El.scrollWidth;

      const maxTranslateX1 = Math.max(0, row1Width - vw);
      const maxTranslateX2 = Math.max(0, row2Width - vw);

      const r1Cards = row1CardRefs.current.filter(Boolean) as HTMLDivElement[];
      const r2Cards = row2CardRefs.current.filter(Boolean) as HTMLDivElement[];
      const mobileCards = [...r1Cards, ...r2Cards];

      // Set initial state
      gsap.set(row1El, { x: 0 });
      gsap.set(row2El, { x: -maxTranslateX2 });
      mobileCards.forEach((card) => {
        gsap.set(card, { scale: 0.98, opacity: 0.6 });
      });

      const maxScrollLength = Math.max(maxTranslateX1, maxTranslateX2);

      // Master Mobile ScrollTrigger & Timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionEl,
          start: 'top top',
          end: () => `+=${maxScrollLength * 1.5}`,
          pin: true,
          scrub: 1,
          onEnter: () => {
            gsap.set([row1El, row2El, ...mobileCards], { willChange: 'transform, opacity' });
          },
          onEnterBack: () => {
            gsap.set([row1El, row2El, ...mobileCards], { willChange: 'transform, opacity' });
          },
          onLeave: () => {
            gsap.set([row1El, row2El, ...mobileCards], { clearProps: 'willChange' });
          },
          onLeaveBack: () => {
            gsap.set([row1El, row2El, ...mobileCards], { clearProps: 'willChange' });
          },
        },
      });

      // Row 1 translations (right to left)
      tl.to(row1El, { x: -maxTranslateX1, ease: 'none' }, 0);
      // Row 2 translations (left to right)
      tl.fromTo(row2El, { x: -maxTranslateX2 }, { x: 0, ease: 'none' }, 0);

      const W = 0.25;

      // Row 1 Card animations
      r1Cards.forEach((card) => {
        const cardCenterX = card.offsetLeft + card.offsetWidth / 2;
        const T_i = cardCenterX - vw / 2;
        const P_i = gsap.utils.clamp(0, 1, T_i / maxTranslateX1);

        const enterStart = P_i - W / 2;
        const exitStart = P_i;

        tl.to(card, { scale: 1.02, opacity: 1, duration: W / 2, ease: 'sine.out' }, Math.max(0, enterStart));
        tl.to(card, { scale: 0.98, opacity: 0.6, duration: W / 2, ease: 'sine.in' }, exitStart);
      });

      // Row 2 Card animations
      r2Cards.forEach((card) => {
        const cardCenterX = card.offsetLeft + card.offsetWidth / 2;
        const T_j = vw / 2 + maxTranslateX2 - cardCenterX;
        const P_j = gsap.utils.clamp(0, 1, T_j / maxTranslateX2);

        const enterStart = P_j - W / 2;
        const exitStart = P_j;

        tl.to(card, { scale: 1.02, opacity: 1, duration: W / 2, ease: 'sine.out' }, Math.max(0, enterStart));
        tl.to(card, { scale: 0.98, opacity: 0.6, duration: W / 2, ease: 'sine.in' }, exitStart);
      });
    });

    return () => {
      ctx.revert();
    };
  }, [reducedMotion, showcaseProducts.length]);

  // Debounced ScrollTrigger refresh helper
  useEffect(() => {
    if (reducedMotion) return;

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [reducedMotion]);

  // Static Fallback for reduced motion preference
  if (reducedMotion) {
    return (
      <section className="relative w-full bg-brand-black text-white py-16 px-6 md:px-12 border-t border-brand-graphite/40">
        <div className="max-w-screen-2xl mx-auto w-full grid grid-cols-2 gap-16 px-6 justify-between">
          {/* Left Column */}
          <div className="flex flex-col gap-24 w-[200px] xl:w-[240px]">
            {leftProducts.map((prod) => (
              <div key={prod.id} className="relative flex flex-col items-center">
                <Link href={`/shop/${prod.slug}`} className="w-full relative group">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-brand-charcoal border border-brand-graphite/40">
                    <Image
                      src={getOptimizedImageUrl(prod.images[0], 500)}
                      alt={prod.name}
                      fill
                      loading="lazy"
                      sizes="240px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col text-left space-y-1">
                      <h4 className="text-xs font-display uppercase font-bold text-white tracking-[0.08em] line-clamp-1">{prod.name}</h4>
                      <span className="text-[10px] font-mono text-white/80">₹{(prod.price / 100).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-24 w-[200px] xl:w-[240px] ml-auto">
            {rightProducts.map((prod) => (
              <div key={prod.id} className="relative flex flex-col items-center">
                <Link href={`/shop/${prod.slug}`} className="w-full relative group">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-brand-charcoal border border-brand-graphite/40">
                    <Image
                      src={getOptimizedImageUrl(prod.images[0], 500)}
                      alt={prod.name}
                      fill
                      loading="lazy"
                      sizes="240px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col text-left space-y-1">
                      <h4 className="text-xs font-display uppercase font-bold text-white tracking-[0.08em] line-clamp-1">{prod.name}</h4>
                      <span className="text-[10px] font-mono text-white/80">₹{(prod.price / 100).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      ref={sectionRef} 
      className="relative w-full bg-brand-black text-white min-h-screen py-16 md:py-24 overflow-hidden border-t border-brand-graphite/40 select-none z-10"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}
    >
      {/* Dissolve top/bottom shadows for columns */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand-black to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-brand-black to-transparent z-20 pointer-events-none" />

      {/* ──────────────────────────────────────────
          DESKTOP LAYOUT (Left and Right Rails)
          ────────────────────────────────────────── */}
      <div className="hidden lg:block max-w-screen-2xl mx-auto w-full h-full relative">
        
        {/* Left Column container */}
        <div className="absolute left-8 xl:left-12 top-0 w-[200px] xl:w-[240px] flex justify-center z-10">
          <div 
            ref={leftColRef} 
            className="flex flex-col items-center w-full relative"
          >
            {leftProducts.map((prod, idx) => (
              <div 
                key={prod.id} 
                ref={(el) => { leftCardRefs.current[idx] = el; }} 
                className="flex flex-col items-center relative group w-full"
              >
                <Link href={`/shop/${prod.slug}`} className="w-full flex flex-col">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-brand-charcoal border border-brand-graphite/40 group-hover:border-white/20 transition-colors duration-300">
                    <Image
                      src={getOptimizedImageUrl(prod.images[0], 500)}
                      alt={prod.name}
                      fill
                      loading="lazy"
                      sizes="240px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col text-left space-y-1">
                      <h4 className="text-xs font-display uppercase font-bold text-white tracking-[0.08em] line-clamp-1">{prod.name}</h4>
                      <span className="text-[10px] font-mono text-white/80">₹{(prod.price / 100).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </Link>

                {/* Hairline Divider separator inside gap */}
                {idx < leftProducts.length - 1 && (
                  <div className="w-[40px] h-[1px] bg-white/10 my-16 self-center block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column container */}
        <div className="absolute right-8 xl:right-12 top-0 w-[200px] xl:w-[240px] flex justify-center z-10">
          <div 
            ref={rightColRef} 
            className="flex flex-col items-center w-full relative"
          >
            {rightProducts.map((prod, idx) => (
              <div 
                key={prod.id} 
                ref={(el) => { rightCardRefs.current[idx] = el; }} 
                className="flex flex-col items-center relative group w-full"
              >
                <Link href={`/shop/${prod.slug}`} className="w-full flex flex-col">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-brand-charcoal border border-brand-graphite/40 group-hover:border-white/20 transition-colors duration-300">
                    <Image
                      src={getOptimizedImageUrl(prod.images[0], 500)}
                      alt={prod.name}
                      fill
                      loading="lazy"
                      sizes="240px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col text-left space-y-1">
                      <h4 className="text-xs font-display uppercase font-bold text-white tracking-[0.08em] line-clamp-1">{prod.name}</h4>
                      <span className="text-[10px] font-mono text-white/80">₹{(prod.price / 100).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </Link>

                {/* Hairline Divider separator inside gap */}
                {idx < rightProducts.length - 1 && (
                  <div className="w-[40px] h-[1px] bg-white/10 my-16 self-center block" />
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ──────────────────────────────────────────
          MOBILE / TABLET LAYOUT (Horizontal scrubbing)
          ────────────────────────────────────────── */}
      <div className="lg:hidden w-full flex flex-col justify-center items-center gap-10">
        
        {/* Outer scrolling container */}
        <div className="w-full flex flex-col gap-8 overflow-hidden">
          
          {/* Row 1 (Right to Left translation) */}
          <div className="w-full overflow-hidden relative">
            <div className="absolute left-0 inset-y-0 w-16 bg-gradient-to-r from-brand-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 inset-y-0 w-16 bg-gradient-to-l from-brand-black to-transparent z-10 pointer-events-none" />

            <div 
              ref={row1Ref} 
              className="flex gap-4 w-max px-[30vw] py-2"
            >
              {row1Products.map((prod, idx) => (
                <div 
                  key={prod.id} 
                  ref={(el) => { row1CardRefs.current[idx] = el; }} 
                  className="flex flex-col relative w-[180px] flex-shrink-0"
                >
                  <Link href={`/shop/${prod.slug}`} className="w-full flex flex-col">
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-brand-charcoal border border-brand-graphite/40">
                      <Image
                        src={getOptimizedImageUrl(prod.images[0], 400)}
                        alt={prod.name}
                        fill
                        loading="lazy"
                        sizes="180px"
                        className="object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/45 to-transparent flex flex-col text-left space-y-1">
                        <h4 className="text-[10px] font-display uppercase font-bold text-white tracking-[0.08em] line-clamp-1">{prod.name}</h4>
                        <span className="text-[9px] font-mono text-white/85">₹{(prod.price / 100).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2 (Left to Right translation) */}
          <div className="w-full overflow-hidden relative">
            <div className="absolute left-0 inset-y-0 w-16 bg-gradient-to-r from-brand-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 inset-y-0 w-16 bg-gradient-to-l from-brand-black to-transparent z-10 pointer-events-none" />

            <div 
              ref={row2Ref} 
              className="flex gap-4 w-max px-[30vw] py-2"
            >
              {row2Products.map((prod, idx) => (
                <div 
                  key={prod.id} 
                  ref={(el) => { row2CardRefs.current[idx] = el; }} 
                  className="flex flex-col relative w-[180px] flex-shrink-0"
                >
                  <Link href={`/shop/${prod.slug}`} className="w-full flex flex-col">
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-brand-charcoal border border-brand-graphite/40">
                      <Image
                        src={getOptimizedImageUrl(prod.images[0], 400)}
                        alt={prod.name}
                        fill
                        loading="lazy"
                        sizes="180px"
                        className="object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/45 to-transparent flex flex-col text-left space-y-1">
                        <h4 className="text-[10px] font-display uppercase font-bold text-white tracking-[0.08em] line-clamp-1">{prod.name}</h4>
                        <span className="text-[9px] font-mono text-white/85">₹{(prod.price / 100).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
