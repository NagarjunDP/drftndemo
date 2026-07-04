'use client';

/**
 * HeroSection — Option A: Kinetic Masked-Typography Hero
 *
 * LAYOUT ZONES (no overlap possible):
 *   ┌──────────────────────────────────────────┐
 *   │  [top: 16%]  GIANT MASKED HEADLINE        │  ← Layer 3, z-4
 *   │              "DRIFT IN STYLE."            │
 *   │                                          │
 *   │  [decorative accent shapes]               │  ← Layer 4, z-5
 *   │                                          │
 *   │  [bottom-0]  eyebrow                     │  ← Layer 5, z-6
 *   │              subline                     │
 *   │              CTA buttons                 │
 *   └──────────────────────────────────────────┘
 *
 * The headline lives at `top:16%` and the bottom content block is
 * `position:absolute; bottom:0` — the two zones are spatially exclusive.
 * On 360px mobile the headline is ~22vw (~80px) tall and the bottom block
 * starts roughly at the bottom 28vh, so they never visually collide.
 */

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

/* ─── Types ─────────────────────────────────── */
export type HeroVariant = 'kinetic';

interface HeroSectionProps {
  variant?: HeroVariant;
  imagesLeft: string[];
  imagesRight: string[];
}

/* ─── Word-by-word clip-path reveal ─────────── */
const WORDS = ['DRIFT', 'IN', 'STYLE.'];

const wordVariants = {
  hidden: { clipPath: 'inset(0 100% 0 0)', opacity: 1 as number },
  visible: (i: number) => ({
    clipPath: 'inset(0 0% 0 0)',
    opacity: 1,
    transition: {
      clipPath: {
        duration: 0.75,
        delay: 0.25 + i * 0.2,
        ease: 'easeInOut' as const,
      },
    },
  }),
};

/* ─── Main Component ─────────────────────────── */
export default function HeroSection({
  imagesLeft,
  imagesRight,
}: HeroSectionProps) {
  const [heroIdx, setHeroIdx] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  /* Cycle hero images */
  useEffect(() => {
    const t = setInterval(() => {
      setHeroIdx((p) => (p + 1) % imagesLeft.length);
    }, 5500);
    return () => clearInterval(t);
  }, [imagesLeft.length]);

  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* Scroll-linked parallax */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '6%']);

  const finalBgY = isMobile ? '0%' : bgY;
  const finalTextY = isMobile ? '0%' : textY;

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden border-b border-brand-graphite hero-section-height noise-overlay"
      aria-label="New Season Lookbook Drop"
    >

      {/* ══════════════════════════════════════════
          LAYER 1 — Background images (parallax)
          z-index: 1
          ══════════════════════════════════════════ */}
      <motion.div
        className="absolute inset-0 flex h-full w-full z-[1]"
        style={{ y: finalBgY }}
      >
        {/* Left panel — full width on mobile, 60% on desktop */}
        <div className="relative w-full md:w-[60%] h-full overflow-hidden">
          {imagesLeft.map((img, i) => (
            <div
              key={img}
              className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out ${
                i === heroIdx
                  ? 'opacity-100 scale-105'
                  : 'opacity-0 scale-100'
              }`}
            >
              {i === 0 ? (
                <>
                  {/* Mobile portrait responsive image: centers model concrete backdrop */}
                  <div className="block md:hidden absolute inset-0">
                    <Image
                      src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=1000&auto=format&fit=crop&q=80"
                      alt="DRFTN Campaign lookbook visual mobile"
                      fill
                      priority
                      sizes="100vw"
                      className="object-cover object-[center_35%]"
                    />
                  </div>
                  {/* Desktop landscape image: original grid wallpaper */}
                  <div className="hidden md:block absolute inset-0">
                    <Image
                      src={img}
                      alt={`DRFTN Campaign lookbook visual ${i + 1}`}
                      fill
                      priority
                      sizes="60vw"
                      className="object-cover object-center"
                    />
                  </div>
                </>
              ) : (
                <Image
                  src={img}
                  alt={`DRFTN Campaign lookbook visual ${i + 1}`}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover object-center"
                />
              )}
            </div>
          ))}
          {/*
            Strong bottom scrim: covers the focal-subject zone so text
            placed at the bottom never competes with image detail.
            Top scrim: keeps the headline readable from above.
          */}
          <div
            className="absolute inset-0 z-[2]"
            style={{
              background:
                'linear-gradient(to top, hsl(0,0%,5%) 0%, hsl(0,0%,5%,0.82) 22%, hsl(0,0%,5%,0.35) 55%, hsl(0,0%,5%,0.18) 100%)',
            }}
            aria-hidden="true"
          />
          {/* Side scrim */}
          <div
            className="absolute inset-0 z-[2]"
            style={{
              background:
                'linear-gradient(to right, hsl(0,0%,5%,0.65) 0%, transparent 55%)',
            }}
            aria-hidden="true"
          />
        </div>

        {/* Right panel — desktop only */}
        <div className="relative hidden md:block md:w-[40%] h-full overflow-hidden border-l border-brand-graphite/40">
          {imagesRight.map((img, i) => (
            <div
              key={img}
              className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out ${
                i === heroIdx ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
              }`}
            >
              <Image
                src={img}
                alt={`DRFTN lookbook detail ${i + 1}`}
                fill
                priority={i === 0}
                sizes="40vw"
                className="object-cover object-center"
              />
            </div>
          ))}
          <div
            className="absolute inset-0 z-[2]"
            style={{
              background:
                'linear-gradient(to top, hsl(0,0%,5%) 0%, hsl(0,0%,5%,0.3) 45%, transparent 100%)',
            }}
            aria-hidden="true"
          />
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════
          LAYER 2 — Amber vertical seam (desktop)
          z-index: 3
          ══════════════════════════════════════════ */}
      <div
        className="absolute top-0 bottom-0 hidden md:block z-[3] w-px"
        style={{ left: '60%', background: 'rgba(201,123,58,0.3)' }}
        aria-hidden="true"
      />

      {/* ══════════════════════════════════════════
          LAYER 3 — GIANT MASKED HEADLINE
          z-index: 4
          Position: top 16% → stays in upper half, never reaches bottom CTA zone.
          ══════════════════════════════════════════ */}
      <motion.div
        className="absolute inset-x-0 z-[4] flex justify-start pointer-events-none select-none px-6 md:px-12 lg:px-24 top-[15%] md:top-[20%]"
        style={{ y: finalTextY }}
        aria-hidden="true"
      >
        <div className="max-w-4xl">
          <p className="hero-masked-words font-display uppercase text-left leading-none tracking-[-0.03em]">
            {WORDS.map((word, i) => (
              <motion.span
                key={word}
                className="hero-masked-word inline-block"
                style={{ marginRight: i < WORDS.length - 1 ? '0.12em' : 0 }}
                variants={wordVariants}
                initial="hidden"
                animate="visible"
                custom={i}
              >
                {word}
              </motion.span>
            ))}
          </p>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════
          LAYER 4 — Ambient decorative accents
          z-index: 5, desktop only
          ══════════════════════════════════════════ */}
      {/* Tilted season tag — top right */}
      <motion.div
        className="absolute top-20 right-10 hidden md:flex z-[5] pointer-events-none"
        initial={{ opacity: 0, rotate: -14, scale: 0.8 }}
        animate={{ opacity: 1, rotate: -5, scale: 1 }}
        transition={{ duration: 1.2, delay: 1.3, ease: 'easeOut' }}
        aria-hidden="true"
      >
        <div className="border border-brand-amber/45 px-3 py-1.5">
          <span className="text-brand-amber text-[8px] tracking-[0.35em] uppercase font-body font-bold">
            FW 2025 / DROP 01
          </span>
        </div>
      </motion.div>

      {/* Thin amber rule — bottom-left desktop */}
      <motion.div
        className="absolute hidden md:block z-[5] pointer-events-none"
        style={{ bottom: '30%', left: '3rem' }}
        initial={{ scaleX: 0, originX: '0%' }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, delay: 1.5, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <div className="w-20 h-px bg-brand-amber/55" />
      </motion.div>

      {/* Small amber dot accent */}
      <motion.div
        className="absolute top-1/3 right-[39%] hidden md:block z-[5] w-2 h-2 rounded-full border border-brand-amber/35 pointer-events-none"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.7 }}
        aria-hidden="true"
      />

      {/* ══════════════════════════════════════════
          LAYER 5 — READABLE CONTENT + CTAs
          z-index: 6
          Position: absolute bottom-0 → always anchored to base of section,
          guaranteed non-overlapping with Layer 3 headline above.
          ══════════════════════════════════════════ */}
      <div
        className="absolute inset-x-0 bottom-0 z-[6] px-8 md:px-12 pb-10 sm:pb-20 md:pb-24"
      >
        {/* Screen-reader h1 — visual version is the masked display text above */}
        <h1 className="sr-only">Drift In Style — New Season Drop by DRFTN Clothing</h1>

        <div className="max-w-xl">

          {/* Eyebrow pill */}
          <motion.div
            className="hidden md:inline-flex items-center gap-2.5 mb-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
          >
            <span className="block w-6 h-px bg-brand-amber flex-shrink-0" aria-hidden="true" />
            <span className="text-brand-stone text-[10px] font-semibold tracking-[0.38em] uppercase font-body leading-none">
              New Season Drop
            </span>
          </motion.div>

          {/* Subline */}
          <motion.p
            className="hidden md:block text-brand-stone/80 text-[11px] sm:text-xs md:text-sm tracking-widest leading-relaxed max-w-xs sm:max-w-sm md:max-w-md mb-6 font-body uppercase"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.5, ease: 'easeOut' }}
          >
            Heavyweight apparel designed to challenge gender constraints.
            Drop shoulder silhouettes. Raw minimalist industrial DNA.
          </motion.p>

          {/* CTA row */}
          <motion.div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.72, ease: 'easeOut' }}
          >
            <Link
              href="/shop"
              className="btn-primary px-8 py-3.5 text-[11px] tracking-[0.22em] justify-center text-center font-bold"
            >
              <span>Shop the Drop</span>
              <ArrowRight className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-brand-stone hover:text-brand-offwhite text-[10px] md:text-[11px] tracking-[0.22em] uppercase font-bold transition-colors duration-200 border-animate pb-0.5 font-body"
            >
              Our Philosophy <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SCROLL INDICATOR
          z-index: 6
          ══════════════════════════════════════════ */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[6] flex-col items-center gap-1.5 opacity-35 hidden md:flex"
        aria-hidden="true"
      >
        <div className="w-px h-12 bg-brand-offwhite/25 relative overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-brand-offwhite"
            animate={{ y: ['-100%', '100%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <span className="text-[8px] tracking-[0.35em] text-brand-stone uppercase font-body">Scroll</span>
      </div>
    </section>

  );
}
