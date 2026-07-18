'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';

interface HeroSectionProps {
  variant?: string;
  imagesLeft?: string[];
  imagesRight?: string[];
}

export default function HeroSection(props: HeroSectionProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion() ?? false;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 40, stiffness: 200 });
  const springY = useSpring(mouseY, { damping: 40, stiffness: 200 });

  const { scrollY } = useScroll();

  const handleMouseMove = (e: React.MouseEvent) => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    const hero = heroRef.current;
    if (!hero) return;
    const { width, height } = hero.getBoundingClientRect();
    const x = (e.clientX - width / 2) / (width / 2); // -1 to 1
    const y = (e.clientY - height / 2) / (height / 2); // -1 to 1
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const useParallax = (depth: number) => {
    // Scroll translation uses depth * 88
    const yScroll = useTransform(scrollY, [0, 800], [0, -depth * 88]);
    const xCursor = useTransform(springX, (val) => val * depth * -22);
    const yCursor = useTransform(springY, (val) => val * depth * -22);
    const x = xCursor;
    const y = useTransform(() => yScroll.get() + yCursor.get());
    return { x, y };
  };

  const p1 = useParallax(0.1);
  const p2 = useParallax(0.25);
  const pDrift = useParallax(0.35);
  const p3 = useParallax(0.45);
  const p4 = useParallax(0.7);
  const p5 = useParallax(1.0);

  // Drift in Style scrolling transition
  const driftScrollX = useTransform(scrollY, [0, 400], [0, 320]);
  const driftCombinedX = useTransform(() => pDrift.x.get() + driftScrollX.get());
  const driftCombinedY = pDrift.y;
  const driftOpacity = useTransform(scrollY, [0, 200], [1, 0]);

  // Entrance animations variants
  const fadeInVariants = {
    initial: { opacity: 0, y: 10 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.45 + i * 0.15,
        ease: [0.25, 1, 0.5, 1] as const
      }
    })
  };

  const driftWordVariants = {
    initial: { opacity: 0, y: 20 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.6 + i * 0.15,
        ease: [0.25, 1, 0.5, 1] as const
      }
    })
  };

  return (
    <div
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[80vh] sm:h-[95vh] min-h-[500px] sm:min-h-[600px] bg-black overflow-hidden flex items-center justify-start px-7 md:px-16 lg:px-24"
    >
      {/* ── Soft Drifting Ambient background glow (no color hues) ── */}
      {!shouldReduceMotion && (
        <div
          className="absolute left-[15%] top-[25%] w-[320px] h-[320px] rounded-full bg-white/[0.07] blur-[110px] pointer-events-none z-10 animate-ambient-drift"
        />
      )}

      {/* ── Background Photographic Asset & Filters (5 Parallax Layers) ── */}
      <div className="absolute inset-0 z-0 overflow-hidden select-none pointer-events-none">

        {/* Layer 1 (Backmost - Skyline silhouette) */}
        <motion.div
          style={shouldReduceMotion ? {} : p1}
          className="absolute inset-0 w-full h-full"
        >
          <Image
            src="/layer1.png"
            alt="DRFTN Hero Layer 1 - Skyline"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center scale-[1.05] grayscale contrast-[1.1] brightness-[0.75]"
          />
        </motion.div>

        {/* Layer 2 (Street environment/signage) */}
        <motion.div
          style={shouldReduceMotion ? {} : p2}
          className="absolute inset-0 w-full h-full animate-neon-flicker"
        >
          <Image
            src="/layer2.png"
            alt="DRFTN Hero Layer 2 - Street"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center scale-[1.07] grayscale contrast-[1.1] brightness-[0.8]"
          />
        </motion.div>

        {/* ── Transitional Beat: Drift in Style (Layer 2.5: Physically behind Layer 3 model) ── */}
        <motion.div
          style={shouldReduceMotion ? {} : { x: driftCombinedX, y: driftCombinedY, opacity: driftOpacity }}
          className="absolute top-[44%] md:top-[32%] right-[6%] sm:right-[8%] md:right-[10%] lg:right-[12%] z-10 pointer-events-none hero-drift-container text-right flex flex-col items-end select-none"
        >
          <motion.span
            variants={driftWordVariants}
            custom={0}
            initial="initial"
            animate="animate"
            className="block uppercase leading-[0.82] tracking-[-0.02em]"
            style={{
              fontFamily: 'var(--font-display, inherit)',
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: 'clamp(2.8rem, 12vw, 4rem)',
              color: '#ffffff',
              textShadow: '0 0 30px rgba(255,255,255,0.4), 0 0 10px rgba(255,255,255,0.2)',
              letterSpacing: '-0.02em',
            }}
          >
            Drift
          </motion.span>
          <motion.span
            variants={driftWordVariants}
            custom={1}
            initial="initial"
            animate="animate"
            className="block uppercase"
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 800,
              fontStyle: 'normal',
              fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
              color: '#ffffff',
              textShadow: '0 0 30px rgba(255,255,255,0.4), 0 0 10px rgba(255,255,255,0.2)',
              letterSpacing: '0.25em',
              margin: '0.4rem 0',
            }}
          >
            in
          </motion.span>
          <motion.span
            variants={driftWordVariants}
            custom={2}
            initial="initial"
            animate="animate"
            className="block uppercase leading-[0.82]"
            style={{
              fontFamily: 'var(--font-display, inherit)',
              fontWeight: 900,
              fontStyle: 'normal',
              fontSize: 'clamp(2.8rem, 12vw, 4rem)',
              color: '#ffffff',
              textShadow: '0 0 50px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.2)',
              letterSpacing: '-0.02em',
            }}
          >
            Style
          </motion.span>
        </motion.div>

        {/* Layer 3 (Model - Subject) */}
        <motion.div
          style={shouldReduceMotion ? {} : p3}
          className="absolute inset-0 w-full h-full"
        >
          <Image
            src="/layer3.png"
            alt="DRFTN Hero Layer 3 - Model"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center scale-[1.09] grayscale contrast-[1.15] brightness-[0.85]"
          />
        </motion.div>

        {/* Layer 4 (Atmospheric particles - chains/mist) */}
        <motion.div
          style={shouldReduceMotion ? { mixBlendMode: 'screen', opacity: 0.2 } : { x: p4.x, y: p4.y, mixBlendMode: 'screen' as const, opacity: 0.2 }}
          className="absolute inset-0 w-full h-full"
        >
          <Image
            src="/layer4.png"
            alt="DRFTN Hero Layer 4 - Particles"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center scale-[1.11] grayscale contrast-[1.1] brightness-[0.85]"
          />
        </motion.div>

        {/* Layer 5 (Foreground rain/bokeh) */}
        <motion.div
          style={shouldReduceMotion ? { mixBlendMode: 'screen', opacity: 0.25 } : { x: p5.x, y: p5.y, mixBlendMode: 'screen' as const, opacity: 0.25 }}
          className="absolute inset-0 w-full h-full"
        >
          <Image
            src="/layer5.png"
            alt="DRFTN Hero Layer 5 - Rain Bokeh"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center scale-[1.13] grayscale contrast-[1.1] brightness-[0.9]"
          />
        </motion.div>

        {/* 1. Vignette Overlay (Radial corner darkening) */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.6) 70%, rgba(0, 0, 0, 1) 100%)' }}
        />

        {/* 2. Linear Legibility Gradient (Transparent top third to dark bottom third) */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,1) 100%)' }}
        />

        {/* 3. Cinematic Film Grain Overlay (Repeating SVG noise at 4% opacity) */}
        <svg className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay z-20 w-full h-full" aria-hidden="true">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* ── Text Copy & CTA Block ── */}
      <div className="relative z-20 max-w-4xl text-left pr-7 md:pr-12 pointer-events-none -translate-y-10 sm:translate-y-0">
        <div className="flex flex-col pointer-events-auto">

          {/* Eyebrow Label (margin: 16px to headline) */}
          <motion.span
            custom={0}
            variants={fadeInVariants}
            initial="initial"
            animate="animate"
            className="text-white/60 text-xs md:text-sm font-bold tracking-[0.25em] uppercase block font-body mb-2 md:mb-4"
          >
            DRFTN ORIGINALS — MID-SEASON 02
          </motion.span>

          {/* Integrated Typography: Large font with outline middle word overlapping the model subject */}
          {/* Mobile version (two stacked lines, tighter spacing) */}
          <h1 className="text-white text-[clamp(2.3rem,11vw,4rem)] font-black tracking-tighter uppercase leading-[0.95] font-display flex flex-col mb-3 select-none md:hidden">
            <span className="inline-block overflow-hidden py-0.5">
              <motion.span
                initial={shouldReduceMotion ? { opacity: 1 } : { y: 24, filter: 'blur(8px)', opacity: 0 }}
                animate={{ y: 0, filter: 'blur(0px)', opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block"
              >
                CONTROL THE
              </motion.span>
            </span>
            <div className="relative mt-1 w-full h-[54px] flex items-center">
              {/* Ambient Glow Pulse behind outlined text */}
              {!shouldReduceMotion && (
                <div
                  className="absolute left-6 w-[180px] h-[30px] bg-white/20 blur-[28px] rounded-full pointer-events-none animate-hero-glow-pulse"
                  style={{ opacity: 0.15 }}
                />
              )}
              {shouldReduceMotion ? (
                <span className="text-transparent font-display font-black tracking-tighter uppercase text-[50px] leading-none" style={{ WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.8)' }}>
                  CHAOS.
                </span>
              ) : (
                <svg viewBox="0 0 350 70" className="w-full h-full overflow-visible z-10">
                  <defs>
                    <linearGradient id="glowGradMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                      <stop offset="50%" stopColor="rgba(255,255,255,1)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.45)" />
                    </linearGradient>
                  </defs>
                  <motion.text
                    x="0"
                    y="55"
                    fill="none"
                    stroke="url(#glowGradMobile)"
                    strokeWidth="1.6"
                    className="font-display font-black tracking-tighter uppercase text-[50px]"
                    initial={{ strokeDashoffset: 600, strokeDasharray: '80 520' }}
                    animate={{ strokeDashoffset: 0, strokeDasharray: '600 0' }}
                    transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.15 }}
                  >
                    CHAOS.
                  </motion.text>
                </svg>
              )}
            </div>
          </h1>

          {/* Desktop version (three lines, untouched style except outline text tracing) */}
          <h1 className="hidden md:flex text-white text-[clamp(4.5rem,10vw,6.5rem)] lg:text-[clamp(5.5rem,8.5vw,7.2rem)] font-black tracking-tighter uppercase leading-[0.8] font-display flex-col mb-5 md:mb-8 select-none">
            <span className="inline-block overflow-hidden py-1">
              <motion.span
                initial={shouldReduceMotion ? { opacity: 1 } : { y: 24, filter: 'blur(8px)', opacity: 0 }}
                animate={{ y: 0, filter: 'blur(0px)', opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block"
              >
                CONTROL
              </motion.span>
            </span>
            <span className="inline-block overflow-hidden py-1">
              <motion.span
                initial={shouldReduceMotion ? { opacity: 1 } : { y: 24, filter: 'blur(8px)', opacity: 0 }}
                animate={{ y: 0, filter: 'blur(0px)', opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="inline-block"
              >
                THE
              </motion.span>
            </span>
            <div className="relative mt-2 w-[550px] h-[130px] flex items-center">
              {/* Ambient Glow Pulse behind outlined text */}
              {!shouldReduceMotion && (
                <div
                  className="absolute left-10 w-[350px] h-[60px] bg-white/15 blur-[45px] rounded-full pointer-events-none animate-hero-glow-pulse-desktop"
                  style={{ opacity: 0.15 }}
                />
              )}
              {shouldReduceMotion ? (
                <span className="text-transparent font-display font-black tracking-tighter uppercase text-[105px]" style={{ WebkitTextStroke: '2.2px rgba(255, 255, 255, 0.8)' }}>
                  CHAOS.
                </span>
              ) : (
                <svg viewBox="0 0 550 130" className="w-full h-full overflow-visible z-10">
                  <defs>
                    <linearGradient id="glowGradDesktop" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                      <stop offset="50%" stopColor="rgba(255,255,255,1)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
                    </linearGradient>
                  </defs>
                  <motion.text
                    x="0"
                    y="105"
                    fill="none"
                    stroke="url(#glowGradDesktop)"
                    strokeWidth="2.5"
                    className="font-display font-black tracking-tighter uppercase text-[105px]"
                    initial={{ strokeDashoffset: 950, strokeDasharray: '120 830' }}
                    animate={{ strokeDashoffset: 0, strokeDasharray: '950 0' }}
                    transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.2 }}
                  >
                    CHAOS.
                  </motion.text>
                </svg>
              )}
            </div>
          </h1>

          {/* Subcopy (margin: 32px to CTA) */}
          <motion.p
            custom={1}
            variants={fadeInVariants}
            initial="initial"
            animate="animate"
            className="hidden sm:block text-brand-stone text-xs sm:text-sm md:text-base font-semibold tracking-widest uppercase font-body max-w-md leading-relaxed mb-8"
          >
            TAILORED FOR VELOCITY. ENGINEERED FOR STABILITY. HEAVYWEIGHT GARMENTS SHAPED BY THE STREETS.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            custom={2}
            variants={fadeInVariants}
            initial="initial"
            animate="animate"
            className="flex flex-wrap gap-4"
          >
            <motion.a
              href="/shop"
              whileTap={shouldReduceMotion ? {} : {
                textShadow: '0 0 12px rgba(255,255,255,0.6)',
                scale: 0.98
              }}
              transition={{ duration: 0.15 }}
              className="btn-primary-accent transition-all duration-200 active:scale-95"
            >
              SHOP COLLECTION
            </motion.a>
            <motion.a
              href="#story"
              whileTap={shouldReduceMotion ? {} : {
                textShadow: '0 0 12px rgba(255,255,255,0.6)',
                scale: 0.98
              }}
              transition={{ duration: 0.15 }}
              className="btn-secondary-dark transition-all duration-200 active:scale-95"
            >
              OUR ORIGINS
            </motion.a>
          </motion.div>
        </div>
      </div>

      {/* Speedometer line anchor for design consistency (shifted up to clear ticker) */}
      <div className="absolute bottom-14 right-6 z-20 hidden md:flex items-center gap-2">
        <span className="text-[10px] text-brand-stone font-bold tracking-widest font-mono">DRFT // C-01</span>
        <div className="w-12 h-[1px] bg-brand-graphite" />
      </div>

      {/* ── Infinite Ticker Strip (Bottom persistent motion strip) ── */}
      <div className="absolute bottom-0 left-0 w-full bg-[#121212]/90 backdrop-blur-sm border-t border-b border-white/5 py-2.5 overflow-hidden flex select-none pointer-events-none z-30">
        <div className="flex whitespace-nowrap min-w-full shrink-0 items-center justify-around gap-4 animate-marquee">
          <span className="text-[9px] md:text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">BUILT DIFFERENT</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[9px] md:text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">CONTROL THE CHAOS</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[9px] md:text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">ZERO COMPROMISE</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[9px] md:text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">MID-SEASON 02</span>
          <span className="text-zinc-800">•</span>
        </div>
        <div className="flex whitespace-nowrap min-w-full shrink-0 items-center justify-around gap-4 animate-marquee" aria-hidden="true">
          <span className="text-[9px] md:text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">BUILT DIFFERENT</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[9px] md:text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">CONTROL THE CHAOS</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[9px] md:text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">ZERO COMPROMISE</span>
          <span className="text-zinc-800">•</span>
          <span className="text-[9px] md:text-[10px] uppercase font-mono font-bold tracking-widest text-brand-stone">MID-SEASON 02</span>
          <span className="text-zinc-800">•</span>
        </div>
      </div>

    </div>
  );
}
