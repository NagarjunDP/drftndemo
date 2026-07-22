'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function BrandLoader() {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Animate progress bar
    const startTime = Date.now();
    const duration = 1600;
    const raf = requestAnimationFrame(function tick() {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(1, elapsed / duration));
      if (elapsed < duration) requestAnimationFrame(tick);
    });

    // Sequence: appear → hold → slide-out curtain
    const holdTimer = setTimeout(() => setPhase('out'), 1900);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(holdTimer);
    };
  }, []);

  const handleExitComplete = () => {
    document.body.style.overflow = '';
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {phase !== 'out' && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{
            clipPath: 'inset(0 0 100% 0)',
            transition: { duration: 0.9, ease: [0.76, 0, 0.24, 1] },
          }}
          className="fixed inset-0 z-[99999] bg-[#060606] flex flex-col items-center justify-center pointer-events-auto overflow-hidden"
        >
          {/* Subtle grain texture */}
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '200px',
            }}
          />

          {/* Center content */}
          <div className="relative flex flex-col items-center gap-6 z-10">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              className="relative w-[160px] md:w-[200px] h-[160px] md:h-[200px]"
            >
              <Image
                src="/logo.png?v=3"
                alt="DRFTN Logo"
                fill
                priority
                sizes="(max-width: 768px) 160px, 200px"
                className="object-contain"
              />
            </motion.div>

            {/* Sub-label */}
            <div className="overflow-hidden">
              <motion.span
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 0.65 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.55 }}
                className="block text-[9px] md:text-[10px] tracking-[0.5em] text-white/65 uppercase font-mono"
              >
                UNISEX SILHOUETTES
              </motion.span>
            </div>
          </div>

          {/* Bottom progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="absolute bottom-10 md:bottom-12 left-1/2 -translate-x-1/2 w-[120px] md:w-[160px]"
          >
            {/* Track */}
            <div className="w-full h-[1px] bg-white/10 overflow-hidden rounded-full">
              {/* Fill */}
              <motion.div
                className="h-full bg-white/60 rounded-full"
                style={{ width: `${progress * 100}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          </motion.div>

          {/* Corner accents — luxury editorial feel */}
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner, i) => (
            <motion.div
              key={corner}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 0.2, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute pointer-events-none"
              style={{
                top: corner.startsWith('t') ? 24 : undefined,
                bottom: corner.startsWith('b') ? 24 : undefined,
                left: corner.endsWith('l') ? 24 : undefined,
                right: corner.endsWith('r') ? 24 : undefined,
                width: 20,
                height: 20,
                borderTop: corner.startsWith('t') ? '1px solid rgba(255,255,255,0.5)' : undefined,
                borderBottom: corner.startsWith('b') ? '1px solid rgba(255,255,255,0.5)' : undefined,
                borderLeft: corner.endsWith('l') ? '1px solid rgba(255,255,255,0.5)' : undefined,
                borderRight: corner.endsWith('r') ? '1px solid rgba(255,255,255,0.5)' : undefined,
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
