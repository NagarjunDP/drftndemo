'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, useReducedMotion } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  variant?: string;
  imagesLeft?: string[];
  imagesRight?: string[];
}

export default function HeroSection(props: HeroSectionProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      gsap.set('.hero-fade-in', { opacity: 1, y: 0 });
      return;
    }

    const hero = heroRef.current;
    if (!hero) return;

    // 1. Desktop cursor-reactive parallax
    const cursorLayers = hero.querySelectorAll('.hero-cursor-layer');
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const handleMouseMove = (e: MouseEvent) => {
      const { width, height } = hero.getBoundingClientRect();
      const x = (e.clientX - width / 2) / (width / 2); // -1 to 1
      const y = (e.clientY - height / 2) / (height / 2); // -1 to 1

      cursorLayers.forEach((layer) => {
        const depth = parseFloat(layer.getAttribute('data-depth') || '0');
        const moveX = -x * depth * 22; // max 22px translation
        const moveY = -y * depth * 22;
        gsap.to(layer, {
          x: moveX,
          y: moveY,
          duration: 0.8,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });
    };

    if (!isTouchDevice) {
      hero.addEventListener('mousemove', handleMouseMove);
    }

    // 2. Mobile/scroll-driven vertical parallax
    const scrollLayers = hero.querySelectorAll('.hero-scroll-layer');
    const scrollTriggersList: ScrollTrigger[] = [];

    scrollLayers.forEach((layer) => {
      const depth = parseFloat(layer.getAttribute('data-depth') || '0');
      const maxShift = isTouchDevice ? depth * 40 : depth * 110;
      const tween = gsap.to(layer, {
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: isTouchDevice ? 1.8 : 1, // smooth liquid interpolation on touch
        },
        y: -maxShift, // vertical shift
        ease: 'power1.out',
        force3D: true, // GPU acceleration
      });
      if (tween.scrollTrigger) {
        scrollTriggersList.push(tween.scrollTrigger);
      }
    });

    // 3. Neon signage light flicker on Layer 2
    const neonLayer = hero.querySelector('.hero-layer-neon');
    let neonTween: gsap.core.Timeline | null = null;
    let flickerTimeout: NodeJS.Timeout | null = null;

    if (neonLayer) {
      const triggerFlicker = () => {
        neonTween = gsap.timeline({
          onComplete: () => {
            flickerTimeout = setTimeout(triggerFlicker, gsap.utils.random(4000, 9000));
          }
        });
        neonTween.to(neonLayer, {
          filter: 'brightness(1.25) contrast(1.15) grayscale(1)',
          duration: 0.04,
          yoyo: true,
          repeat: 3,
          ease: 'power1.inOut'
        }).to(neonLayer, {
          filter: 'brightness(0.8) contrast(1.1) grayscale(1)',
          duration: 0.08
        });
      };
      
      flickerTimeout = setTimeout(triggerFlicker, 3000);
    }

    // GSAP staggered headline animation removed (now handled by Framer Motion)

    // 5. Fade + slide up for eyebrow, subcopy, and CTA buttons
    gsap.fromTo('.hero-fade-in', 
      { opacity: 0, y: 10 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        delay: 0.45,
        stagger: 0.1,
        ease: 'power3.out' 
      }
    );

    // Drift in Style load-in staggered fade + slide up
    gsap.fromTo('.hero-drift-word',
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 0.6,
        stagger: 0.1,
        ease: 'power3.out'
      }
    );

    // Drift in Style container rightward (outward) drift on scroll
    const driftContainer = hero.querySelector('.hero-drift-container');
    if (driftContainer) {
      const isMobile = window.innerWidth < 768;
      const driftX = isTouchDevice ? 160 : 320;
      const driftTween = gsap.fromTo(driftContainer,
        { x: 0, opacity: 1 },
        {
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: isMobile ? '+=180' : '+=400', // completes very quickly on mobile (180px)
            scrub: isMobile ? 0.2 : 0.5, // immediate responsiveness, no lag on mobile
          },
          x: driftX, // slide rightward (outward to the right)
          opacity: 0, // fades out as it slides out of the hero boundary
          ease: 'power1.out',
          force3D: true, // GPU acceleration
        }
      );
      if (driftTween.scrollTrigger) {
        scrollTriggersList.push(driftTween.scrollTrigger);
      }
    }

    return () => {
      if (!isTouchDevice && hero) {
        hero.removeEventListener('mousemove', handleMouseMove);
      }
      scrollTriggersList.forEach((st) => st.kill());
      if (flickerTimeout) {
        clearTimeout(flickerTimeout);
      }
      if (neonTween) {
        neonTween.kill();
      }
    };
  }, []);

  return (
    <div 
      ref={heroRef}
      className="relative w-full h-[80vh] sm:h-[95vh] min-h-[500px] sm:min-h-[600px] bg-black overflow-hidden flex items-center justify-start px-7 md:px-16 lg:px-24"
    >
      {/* ── Soft Drifting Ambient background glow (no color hues) ── */}
      {!shouldReduceMotion && (
        <motion.div
          className="absolute left-[15%] top-[25%] w-[320px] h-[320px] rounded-full bg-white/[0.07] blur-[110px] pointer-events-none z-10"
          animate={{
            x: [0, 35, -20, 0],
            y: [0, -40, 25, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      
      {/* ── Background Photographic Asset & Filters (5 Parallax Layers) ── */}
      <div className="absolute inset-0 z-0 overflow-hidden select-none pointer-events-none">
        
        {/* Layer 1 (Backmost - Skyline silhouette) */}
        <div className="absolute inset-0 w-full h-full hero-scroll-layer" data-depth="0.1" style={{ willChange: 'transform' }}>
          <div className="absolute inset-0 w-full h-full hero-cursor-layer" data-depth="0.1" style={{ willChange: 'transform' }}>
            <Image
              src="/layer1.png"
              alt="DRFTN Hero Layer 1 - Skyline"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center scale-[1.05] grayscale contrast-[1.1] brightness-[0.75]"
            />
          </div>
        </div>

        {/* Layer 2 (Street environment/signage) */}
        <div className="absolute inset-0 w-full h-full hero-scroll-layer" data-depth="0.25" style={{ willChange: 'transform' }}>
          <div className="absolute inset-0 w-full h-full hero-cursor-layer hero-layer-neon" data-depth="0.25" style={{ willChange: 'transform' }}>
            <Image
              src="/layer2.png"
              alt="DRFTN Hero Layer 2 - Street"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center scale-[1.07] grayscale contrast-[1.1] brightness-[0.8]"
            />
          </div>
        </div>

        {/* ── Transitional Beat: Drift in Style (Layer 2.5: Physically behind Layer 3 model) ── */}
        <div className="absolute inset-0 w-full h-full hero-scroll-layer" data-depth="0.35" style={{ willChange: 'transform' }}>
          <div className="absolute inset-0 w-full h-full hero-cursor-layer" data-depth="0.35" style={{ willChange: 'transform' }}>
            <div className="absolute top-[28%] md:top-[32%] right-[6%] sm:right-[8%] md:right-[10%] lg:right-[12%] z-10 pointer-events-none hero-drift-container text-right flex flex-col items-end select-none">
              <span className="hero-drift-word opacity-0 block font-body font-light italic text-zinc-400 text-[clamp(2.5rem,11vw,3.5rem)] sm:text-[clamp(3rem,8vw,4rem)] lg:text-[clamp(3.8rem,5.5vw,4.8rem)] leading-[0.8] tracking-tighter uppercase">
                Drift
              </span>
              <span className="hero-drift-word opacity-0 block font-mono text-zinc-500 font-bold not-italic tracking-[0.2em] uppercase my-1 md:my-2 text-[clamp(1.5rem,5vw,2rem)] sm:text-[clamp(1.8rem,4vw,2.4rem)] lg:text-[clamp(2.2rem,2.8vw,2.8rem)]">
                in
              </span>
              <span className="hero-drift-word opacity-0 block font-display font-black text-white text-[clamp(2.5rem,11vw,3.5rem)] sm:text-[clamp(3rem,8vw,4rem)] lg:text-[clamp(3.8rem,5.5vw,4.8rem)] leading-[0.8] tracking-tighter uppercase">
                Style
              </span>
            </div>
          </div>
        </div>

        {/* Layer 3 (Model - Subject) */}
        <div className="absolute inset-0 w-full h-full hero-scroll-layer" data-depth="0.45" style={{ willChange: 'transform' }}>
          <div className="absolute inset-0 w-full h-full hero-cursor-layer" data-depth="0.45" style={{ willChange: 'transform' }}>
            <Image
              src="/layer3.png"
              alt="DRFTN Hero Layer 3 - Model"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center scale-[1.09] grayscale contrast-[1.15] brightness-[0.85]"
            />
          </div>
        </div>

        {/* Layer 4 (Atmospheric particles - chains/mist) */}
        <div className="absolute inset-0 w-full h-full hero-scroll-layer" data-depth="0.7" style={{ willChange: 'transform' }}>
          <div 
            className="absolute inset-0 w-full h-full hero-cursor-layer" 
            data-depth="0.7"
            style={{ mixBlendMode: 'screen', opacity: 0.2, willChange: 'transform' }}
          >
            <Image
              src="/layer4.png"
              alt="DRFTN Hero Layer 4 - Particles"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center scale-[1.11] grayscale contrast-[1.1] brightness-[0.85]"
            />
          </div>
        </div>

        {/* Layer 5 (Foreground rain/bokeh) */}
        <div className="absolute inset-0 w-full h-full hero-scroll-layer" data-depth="1.0" style={{ willChange: 'transform' }}>
          <div 
            className="absolute inset-0 w-full h-full hero-cursor-layer" 
            data-depth="1.0"
            style={{ mixBlendMode: 'screen', opacity: 0.25, willChange: 'transform' }}
          >
            <Image
              src="/layer5.png"
              alt="DRFTN Hero Layer 5 - Rain Bokeh"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center scale-[1.13] grayscale contrast-[1.1] brightness-[0.9]"
            />
          </div>
        </div>

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
          <span className="hero-fade-in opacity-0 text-white/60 text-xs md:text-sm font-bold tracking-[0.25em] uppercase block font-body mb-2 md:mb-4">
            DRFTN ORIGINALS — MID-SEASON 02
          </span>
          
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
                <motion.div
                  className="absolute left-6 w-[180px] h-[30px] bg-white/20 blur-[28px] rounded-full pointer-events-none"
                  initial={{ opacity: 0.15 }}
                  animate={{ opacity: [0.15, 0.35, 0.15] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1.2,
                  }}
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
                <motion.div
                  className="absolute left-10 w-[350px] h-[60px] bg-white/15 blur-[45px] rounded-full pointer-events-none"
                  initial={{ opacity: 0.15 }}
                  animate={{ opacity: [0.15, 0.3, 0.15] }}
                  transition={{
                    duration: 4.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1.3,
                  }}
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
                    strokeWidth="2.2"
                    className="font-display font-black tracking-tighter uppercase text-[105px]"
                    initial={{ strokeDashoffset: 900, strokeDasharray: '120 780' }}
                    animate={{ strokeDashoffset: 0, strokeDasharray: '900 0' }}
                    transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.25 }}
                  >
                    CHAOS.
                  </motion.text>
                </svg>
              )}
            </div>
          </h1>

          {/* Subcopy (margin: 32px to CTA) */}
          <p className="hidden sm:block hero-fade-in opacity-0 text-brand-stone text-xs sm:text-sm md:text-base font-semibold tracking-widest uppercase font-body max-w-md leading-relaxed mb-8">
            TAILORED FOR VELOCITY. ENGINEERED FOR STABILITY. HEAVYWEIGHT GARMENTS SHAPED BY THE STREETS.
          </p>

          {/* CTA Buttons */}
          <div className="hero-fade-in opacity-0 flex flex-wrap gap-4">
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
          </div>
        </div>
      </div>

      {/* Speedometer line anchor for design consistency (shifted up to clear ticker) */}
      <div className="absolute bottom-14 right-6 z-20 hidden md:flex items-center gap-2">
        <span className="text-[10px] text-brand-stone font-bold tracking-widest font-mono">DRFT // C-01</span>
        <div className="w-12 h-[1px] bg-brand-graphite" />
      </div>

      {/* ── Infinite Ticker Strip (Steps 1 & 2: Bottom persistent motion strip) ── */}
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
