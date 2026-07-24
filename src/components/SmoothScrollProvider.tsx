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

    // Initialize Lenis smooth scroll engine tuned for mobile lerp and touch inertia
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      syncTouch: true,
      syncTouchLerp: 0.1,
      touchInertiaExponent: 1.7,
      touchMultiplier: 1.2,
      wheelMultiplier: 1.0,
      infinite: false,
    });

    // Synchronize Lenis scroll updates with GSAP ScrollTrigger and dynamically smooth fast touch flicks
    lenis.on('scroll', (e) => {
      // Dynamic lerp dampening for velocity spikes on fast touch flicks
      if (Math.abs(e.velocity) > 2.5) {
        lenis.options.syncTouchLerp = 0.06;
      } else {
        lenis.options.syncTouchLerp = 0.1;
      }
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
