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

    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    // Initialize Lenis smooth scroll engine
    const lenis = new Lenis({
      duration: isTouch ? 0.9 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2,
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

    return () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
