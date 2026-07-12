'use client';

/**
 * DesktopHeroParallax
 * -------------------
 * Rendered ONLY at md+ breakpoints (≥768px) alongside the mobile HeroSection.
 * Uses GSAP ScrollTrigger for scroll-driven parallax across 4 photographic
 * layers + text. All GSAP animations are scoped to this section via gsap.context()
 * and cleaned up on unmount.
 *
 * GSAP / ScrollTrigger is already registered globally — do NOT call
 * gsap.registerPlugin() here to avoid duplicate registration warnings.
 */

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, useReducedMotion } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────
interface LayerRef {
  el: HTMLDivElement | null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function DesktopHeroParallax() {
  const sectionRef = useRef<HTMLElement>(null);
  const layer1Ref = useRef<HTMLDivElement>(null);
  const layer2Ref = useRef<HTMLDivElement>(null);
  const layer3Ref = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    // ── Reduced-motion guard ─────────────────────────────────────────────────
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // If reduced motion preference is on, render static composition — no GSAP
    if (prefersReducedMotion) return;

    const section = sectionRef.current;
    const l1 = layer1Ref.current;
    const l2 = layer2Ref.current;
    const l3 = layer3Ref.current;
    const drift = driftRef.current;
    const text = textRef.current;

    if (!section || !l1 || !l2 || !l3 || !drift || !text) return;

    // All tweens scoped to this section — auto-killed on unmount via ctx.revert()
    const ctx = gsap.context(() => {

      // ── Helper: Toggle will-change only during active scroll ───────────────
      const scrollLayers = [l1, l2, l3, drift, text];
      const enableWillChange = () => {
        scrollLayers.forEach((el) => {
          if (el) el.style.willChange = 'transform, opacity';
        });
      };
      const disableWillChange = () => {
        scrollLayers.forEach((el) => {
          if (el) el.style.willChange = 'auto';
        });
      };

      // ── Master scroll progress tracker (shared trigger) ───────────────────
      // All scroll-driven tweens reference the same trigger section so they
      // stay perfectly synchronized.
      const baseScrollTriggerConfig = {
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onEnter: enableWillChange,
        onLeave: disableWillChange,
        onLeaveBack: disableWillChange,
      };

      // ── Layer 1: Alley plate — slowest, subtle drift ───────────────────────
      // translateY: 0 → 40px
      gsap.to(l1, {
        scrollTrigger: { ...baseScrollTriggerConfig },
        y: 40,
        ease: 'none',
        force3D: true,
      });

      // ── Layer 2: Smoke — fast scroll drift + translateX ────────────────────
      // translateY: 0 → 120px, translateX: 0 → 30px
      gsap.to(l2, {
        scrollTrigger: { ...baseScrollTriggerConfig },
        y: 120,
        x: 30,
        ease: 'none',
        force3D: true,
      });

      // ── Layer 3: Figure — mid scroll + subtle scale zoom ──────────────────
      // translateY: 0 → 70px, scale: 1 → 1.05
      gsap.to(l3, {
        scrollTrigger: { ...baseScrollTriggerConfig },
        y: 70,
        scale: 1.05,
        ease: 'none',
        force3D: true,
        transformOrigin: 'center bottom',
      });

      // ── Drift in Style: scroll parallax + horizontal drift ────────────────
      // translateY: 0 → -38.5px (depth 0.35 * 110), translateX: 0 → 320px
      // opacity: 1 → 0 by 50% scroll
      gsap.to(drift, {
        scrollTrigger: {
          ...baseScrollTriggerConfig,
          end: '50% top',
        },
        y: -38.5,
        x: 320,
        opacity: 0,
        ease: 'power1.out',
        force3D: true,
      });

      // ── Text layer: translateY exit + fade ────────────────────────────────
      // Matches the existing hero's scroll-exit easing convention (power1.out)
      gsap.to(text, {
        scrollTrigger: {
          ...baseScrollTriggerConfig,
          end: '50% top',
        },
        y: -30,
        opacity: 0,
        ease: 'power1.out',
        force3D: true,
      });

      // ── Smoke idle ambient animation (independent of scroll) ──────────────
      // Continuous yoyo drift that runs regardless of scroll position.
      // Created AFTER ScrollTrigger setup so it doesn't interfere.
      const smokeTl = gsap.timeline({
        repeat: -1,
        yoyo: true,
        defaults: { ease: 'sine.inOut' },
      });

      smokeTl
        .to(l2, { y: '+=12', x: '+=8', rotation: 1, duration: 3.5 })
        .to(l2, { opacity: 0.6, duration: 2 }, '<')
        .to(l2, { y: '-=8', x: '-=5', rotation: -0.5, duration: 4 })
        .to(l2, { opacity: 0.45, duration: 2 }, '<');

    }, section); // ← scope gsap.context to the section element

    return () => {
      ctx.revert(); // kills all tweens + ScrollTriggers scoped to this context
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="
        relative w-full overflow-hidden bg-black
        h-[95vh] min-h-[600px]
        max-w-[1920px] mx-auto
        flex items-center justify-start
      "
      aria-label="DRFTN Desktop Hero — Control The Chaos"
    >
      {/* ── LAYER 1: Full-bleed alley background plate (z-10) ─────────────── */}
      <div
        ref={layer1Ref}
        className="absolute inset-0 z-10 select-none pointer-events-none"
        style={{ willChange: 'auto' }}
      >
        <Image
          src="/hero/hero-layer-1-alley.jpg"
          alt="Dark urban alley — DRFTN backdrop"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-[1.08] grayscale contrast-[1.1] brightness-[0.8]"
        />
      </div>

      {/* ── LAYER 2: Smoke overlay — right-of-center (z-20) ──────────────── */}
      {/*    mix-blend-mode: screen makes black areas transparent               */}
      <div
        ref={layer2Ref}
        className="absolute z-20 select-none pointer-events-none"
        style={{
          // Right-of-center positioning in % so it scales with viewport
          top: '10%',
          right: '-5%',
          width: '65%',
          height: '80%',
          opacity: 0.5,
          mixBlendMode: 'screen',
          willChange: 'auto',
        }}
      >
        <Image
          src="/hero/hero-layer-2-smoke.png"
          alt=""
          fill
          loading="lazy"
          sizes="65vw"
          className="object-contain object-center"
        />
      </div>

      {/* ── LAYER 3: Hooded figure — left-of-center (z-30) ───────────────── */}
      <div
        ref={layer3Ref}
        className="absolute z-30 select-none pointer-events-none"
        style={{
          bottom: '0',
          left: '8%',
          width: '42%',
          height: '92%',
          willChange: 'auto',
        }}
      >
        <Image
          src="/hero/hero-layer-3-figure.png"
          alt="Hooded figure in DRFTN streetwear"
          fill
          priority
          sizes="42vw"
          className="object-contain object-bottom grayscale contrast-[1.1] brightness-[0.9]"
        />
      </div>



      {/* ── Vignette & gradients (same as mobile hero) ────────────────────── */}
      <div
        className="absolute inset-0 z-45 pointer-events-none"
        style={{
          zIndex: 45,
          background:
            'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.9) 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 45,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.85) 85%, rgba(0,0,0,1) 100%)',
        }}
      />

      {/* ── Cinematic film grain ─────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 pointer-events-none opacity-[0.045] mix-blend-overlay w-full h-full"
        style={{ zIndex: 46 }}
        aria-hidden="true"
      >
        <filter id="dph-noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#dph-noiseFilter)" />
      </svg>

      {/* ── LAYER 5: Text / CTA (z-50) ────────────────────────────────────── */}
      <div
        ref={textRef}
        className="relative flex flex-col z-50 pl-[7%] pr-[5%] max-w-[50%] pointer-events-none"
        style={{ willChange: 'auto' }}
      >
        <div className="flex flex-col pointer-events-auto">

          {/* Eyebrow label */}
          <span className="text-white/60 text-sm font-bold tracking-[0.25em] uppercase block font-body mb-4">
            DRFTN ORIGINALS — MID-SEASON 02
          </span>

          {/* Desktop headline — three lines */}
          <h1 className="text-white font-black tracking-tighter uppercase leading-[0.82] font-display flex flex-col mb-6 select-none"
            style={{ fontSize: 'clamp(4.5rem, 8vw, 7.2rem)' }}
          >
            <span className="inline-block overflow-hidden py-1">
              {shouldReduceMotion ? (
                <span className="inline-block">CONTROL</span>
              ) : (
                <motion.span
                  initial={{ y: 24, filter: 'blur(8px)', opacity: 0 }}
                  animate={{ y: 0, filter: 'blur(0px)', opacity: 1 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-block"
                >
                  CONTROL
                </motion.span>
              )}
            </span>
            <span className="inline-block overflow-hidden py-1">
              {shouldReduceMotion ? (
                <span className="inline-block">THE</span>
              ) : (
                <motion.span
                  initial={{ y: 24, filter: 'blur(8px)', opacity: 0 }}
                  animate={{ y: 0, filter: 'blur(0px)', opacity: 1 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  className="inline-block"
                >
                  THE
                </motion.span>
              )}
            </span>

            {/* "CHAOS." — outlined SVG stroke trace (matches mobile hero pattern) */}
            <div className="relative mt-2 flex items-center" style={{ width: 'clamp(320px, 45vw, 620px)', height: 'clamp(80px, 10vw, 140px)' }}>
              {/* Ambient glow pulse */}
              {!shouldReduceMotion && (
                <motion.div
                  className="absolute left-8 rounded-full pointer-events-none bg-white/[0.12] blur-[50px]"
                  style={{ width: '55%', height: '55%' }}
                  initial={{ opacity: 0.12 }}
                  animate={{ opacity: [0.12, 0.28, 0.12] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.3 }}
                />
              )}
              {shouldReduceMotion ? (
                <span
                  className="text-transparent font-display font-black tracking-tighter uppercase"
                  style={{ fontSize: 'clamp(72px, 9vw, 120px)', WebkitTextStroke: '2px rgba(255,255,255,0.8)' }}
                >
                  CHAOS.
                </span>
              ) : (
                <svg viewBox="0 0 580 135" className="w-full h-full overflow-visible z-10">
                  <defs>
                    <linearGradient id="dph-glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                      <stop offset="50%" stopColor="rgba(255,255,255,1)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
                    </linearGradient>
                  </defs>
                  <motion.text
                    x="0"
                    y="108"
                    fill="none"
                    stroke="url(#dph-glowGrad)"
                    strokeWidth="2.2"
                    className="font-display font-black tracking-tighter uppercase"
                    style={{ fontSize: '108px', fontFamily: 'var(--font-display, Oxanium, sans-serif)', fontWeight: 900 }}
                    initial={{ strokeDashoffset: 950, strokeDasharray: '120 830' }}
                    animate={{ strokeDashoffset: 0, strokeDasharray: '950 0' }}
                    transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.25 }}
                  >
                    CHAOS.
                  </motion.text>
                </svg>
              )}
            </div>
          </h1>

          {/* Subcopy */}
          <p className="text-brand-stone text-sm font-semibold tracking-widest uppercase font-body max-w-md leading-relaxed mb-8">
            TAILORED FOR VELOCITY. ENGINEERED FOR STABILITY.<br />
            HEAVYWEIGHT GARMENTS SHAPED BY THE STREETS.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <motion.a
              href="/shop"
              whileTap={shouldReduceMotion ? {} : { textShadow: '0 0 12px rgba(255,255,255,0.6)', scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="btn-primary-accent transition-all duration-200 active:scale-95"
            >
              SHOP COLLECTION
            </motion.a>
            <motion.a
              href="#story"
              whileTap={shouldReduceMotion ? {} : { textShadow: '0 0 12px rgba(255,255,255,0.6)', scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="btn-secondary-dark transition-all duration-200 active:scale-95"
            >
              OUR ORIGINS
            </motion.a>
          </div>
        </div>
      </div>

      {/* ── DRIFT IN STYLE — side text (right side, z-50) ─────────────────── */}
      {/*    Positioned right-of-center between figure and hand layers          */}
      <div
        ref={driftRef}
        className="absolute z-50 right-[18%] top-[30%] text-right flex flex-col items-end select-none pointer-events-none"
        style={{ zIndex: 50 }}
      >
        {!shouldReduceMotion ? (
          <>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="block uppercase leading-[0.82] tracking-[-0.02em]"
              style={{
                fontFamily: 'var(--font-display, Oxanium, sans-serif)',
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
                color: '#ffffff',
                textShadow: '0 0 30px rgba(255,255,255,0.4), 0 0 10px rgba(255,255,255,0.2)',
              }}
            >
              Drift
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="block uppercase"
              style={{
                fontFamily: 'var(--font-mono, Space Mono, monospace)',
                fontWeight: 800,
                fontStyle: 'normal',
                fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                color: '#ffffff',
                textShadow: '0 0 30px rgba(255,255,255,0.4)',
                letterSpacing: '0.25em',
                margin: '0.3rem 0',
              }}
            >
              in
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="block uppercase leading-[0.82]"
              style={{
                fontFamily: 'var(--font-display, Oxanium, sans-serif)',
                fontWeight: 900,
                fontStyle: 'normal',
                fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
                color: '#ffffff',
                textShadow: '0 0 50px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.2)',
                letterSpacing: '-0.02em',
              }}
            >
              Style
            </motion.span>
          </>
        ) : (
          <>
            <span className="block uppercase leading-[0.82] tracking-[-0.02em]"
              style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', color: '#ffffff' }}>
              Drift
            </span>
            <span className="block uppercase"
              style={{ fontFamily: 'Space Mono, monospace', fontWeight: 800, fontSize: 'clamp(1rem, 2vw, 1.5rem)', color: '#ffffff', letterSpacing: '0.25em', margin: '0.3rem 0' }}>
              in
            </span>
            <span className="block uppercase leading-[0.82]"
              style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 900, fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', color: '#ffffff' }}>
              Style
            </span>
          </>
        )}
      </div>

      {/* ── Telemetry anchor line (matches existing mobile hero HUD) ─────── */}
      <div className="absolute bottom-14 right-6 z-50 flex items-center gap-2">
        <span className="text-[10px] text-brand-stone font-bold tracking-widest font-mono">
          DRFT // C-01
        </span>
        <div className="w-12 h-[1px] bg-brand-graphite" />
      </div>

      {/* ── Bottom marquee ticker strip (same as mobile hero) ────────────── */}
      <div className="absolute bottom-0 left-0 w-full bg-[#121212]/90 backdrop-blur-sm border-t border-b border-white/5 py-2.5 overflow-hidden flex select-none pointer-events-none z-50">
        <div className="flex whitespace-nowrap min-w-full shrink-0 items-center justify-around gap-4 animate-marquee">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">BUILT DIFFERENT</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">CONTROL THE CHAOS</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">ZERO COMPROMISE</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">MID-SEASON 02</span>
          <span className="text-zinc-800">•</span>
        </div>
        <div className="flex whitespace-nowrap min-w-full shrink-0 items-center justify-around gap-4 animate-marquee" aria-hidden="true">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">BUILT DIFFERENT</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">CONTROL THE CHAOS</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">ZERO COMPROMISE</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">MID-SEASON 02</span>
          <span className="text-zinc-800">•</span>
        </div>
      </div>

    </section>
  );
}
