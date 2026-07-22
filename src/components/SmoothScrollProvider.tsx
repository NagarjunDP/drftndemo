'use client';

import React, { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export default function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis smooth scroll engine with damped feel
    const lenis = new Lenis({
      duration: 1.2,
      lerp: 0.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    // Synchronize Lenis scroll updates with GSAP ScrollTrigger and emit sitewide scroll events
    lenis.on('scroll', (e) => {
      ScrollTrigger.update();
      window.dispatchEvent(
        new CustomEvent('drftn-scroll', {
          detail: { scrollY: e.scroll, direction: e.direction },
        })
      );
    });

    // Drive Lenis RAF loop via GSAP ticker for frame-perfect sync
    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    // Smooth scroll for anchor links (#collections, #hero-scene, etc.)
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.hash && anchor.hash.startsWith('#')) {
        const targetEl = document.querySelector(anchor.hash);
        if (targetEl) {
          e.preventDefault();
          lenis.scrollTo(targetEl as HTMLElement, { offset: 0, duration: 1.2 });
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);

    return () => {
      document.removeEventListener('click', handleAnchorClick);
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
