'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

export default function DesktopHeroParallax() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const { scrollY } = useScroll();

  // Parallax translation definitions
  // Alley background plate - slowest, subtle drift
  const yL1 = useTransform(scrollY, [0, 1000], [0, 40]);

  // Smoke - fast scroll drift + translateX
  const yL2 = useTransform(scrollY, [0, 1000], [0, 120]);
  const xL2 = useTransform(scrollY, [0, 1000], [0, 30]);

  // Figure - mid scroll + subtle scale zoom
  const yL3 = useTransform(scrollY, [0, 1000], [0, 70]);
  const scaleL3 = useTransform(scrollY, [0, 1000], [1, 1.05]);

  // Drift in Style - parallax + horizontal drift
  const yDrift = useTransform(scrollY, [0, 1000], [0, -38.5]);
  const xDrift = useTransform(scrollY, [0, 1000], [0, 320]);
  const opacityDrift = useTransform(scrollY, [0, 500], [1, 0]);

  // Text layer - translateY exit + fade
  const yText = useTransform(scrollY, [0, 500], [0, -30]);
  const opacityText = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <section
      className="
        relative w-full overflow-hidden bg-black
        h-[95vh] min-h-[600px]
        max-w-[1920px] mx-auto
        flex items-center justify-start
      "
      aria-label="DRFTN Desktop Hero — Control The Chaos"
    >
      {/* ── LAYER 1: Full-bleed alley background plate (z-10) ─────────────── */}
      <motion.div
        style={shouldReduceMotion ? {} : { y: yL1 }}
        className="absolute inset-0 z-10 select-none pointer-events-none"
      >
        <Image
          src="/hero/hero-layer-1-alley.jpg"
          alt="Dark urban alley — DRFTN backdrop"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-[1.08] grayscale contrast-[1.1] brightness-[0.8]"
        />
      </motion.div>

      {/* ── LAYER 2: Smoke overlay — right-of-center (z-20) ──────────────── */}
      <motion.div
        style={shouldReduceMotion ? {
          top: '10%',
          right: '-5%',
          width: '65%',
          height: '80%',
          opacity: 0.5,
          mixBlendMode: 'screen' as const,
        } : {
          top: '10%',
          right: '-5%',
          width: '65%',
          height: '80%',
          y: yL2,
          x: xL2,
          mixBlendMode: 'screen' as const,
        }}
        className="absolute z-20 select-none pointer-events-none animate-smoke-parallax"
      >
        <Image
          src="/hero/hero-layer-2-smoke.png"
          alt=""
          fill
          loading="lazy"
          sizes="65vw"
          className="object-contain object-center"
        />
      </motion.div>

      {/* ── LAYER 3: Hooded figure — left-of-center (z-30) ───────────────── */}
      <motion.div
        style={shouldReduceMotion ? {
          bottom: '0',
          left: '8%',
          width: '42%',
          height: '92%',
        } : {
          bottom: '0',
          left: '8%',
          width: '42%',
          height: '92%',
          y: yL3,
          scale: scaleL3,
          transformOrigin: 'center bottom',
        }}
        className="absolute z-30 select-none pointer-events-none"
      >
        <Image
          src="/hero/hero-layer-3-figure.png"
          alt="Hooded figure in DRFTN streetwear"
          fill
          priority
          sizes="42vw"
          className="object-contain object-bottom grayscale contrast-[1.1] brightness-[0.9]"
        />
      </motion.div>

      {/* ── Vignette & gradients ────────────────────── */}
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
      <motion.div
        style={shouldReduceMotion ? {} : { y: yText, opacity: opacityText }}
        className="relative flex flex-col z-50 pl-[7%] pr-[5%] max-w-[50%] pointer-events-none"
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
                <div
                  className="absolute left-8 rounded-full pointer-events-none bg-white/[0.12] blur-[50px] animate-glow-pulse"
                  style={{ width: '55%', height: '55%', opacity: 0.12 }}
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
      </motion.div>

      {/* ── DRIFT IN STYLE — side text (right side, z-50) ─────────────────── */}
      <motion.div
        style={shouldReduceMotion ? {} : { y: yDrift, x: xDrift, opacity: opacityDrift }}
        className="absolute z-50 right-[18%] top-[30%] text-right flex flex-col items-end select-none pointer-events-none"
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
      </motion.div>

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
