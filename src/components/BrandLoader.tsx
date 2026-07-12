'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function BrandLoader() {
  const [shouldPlay, setShouldPlay] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Safeguard cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleExitComplete = () => {
    document.body.style.overflow = '';
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {shouldPlay && (
        <motion.div
          id="brand-loader-overlay"
          initial={{ y: 0 }}
          exit={{ 
            y: '-100vh',
            transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] }
          }}
          className="fixed inset-0 bg-[#080808] z-[99999] flex flex-col items-center justify-center pointer-events-auto"
        >
          <div className="flex flex-col items-center justify-center gap-4">
            {/* Logo animation (DRFTN image sliding down) */}
            <div className="relative w-[180px] md:w-[240px] h-[180px] md:h-[240px] flex items-center justify-center overflow-hidden">
              <motion.div
                initial={{ y: -40, opacity: 0 }}
                animate={{ 
                  y: 0, 
                  opacity: 1,
                  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
                }}
                exit={{ 
                  y: -15,
                  opacity: 0,
                  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
                }}
                className="relative w-full h-full"
              >
                <Image
                  src="/logo.png?v=3"
                  alt="DRFTN Logo"
                  fill
                  priority
                  sizes="(max-width: 768px) 180px, 240px"
                  className="object-contain"
                />
              </motion.div>
            </div>

            {/* Sub-text animation (Clothing sliding up) */}
            <div className="overflow-hidden py-1">
              <motion.span
                initial={{ y: 30, opacity: 0 }}
                animate={{ 
                  y: 0, 
                  opacity: 0.8,
                  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.45 }
                }}
                exit={{ 
                  y: 10,
                  opacity: 0,
                  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
                }}
                onAnimationComplete={() => {
                  // Initiate page curtain slide-up 1.2s after clothing text completes
                  setTimeout(() => {
                    document.body.style.overflow = '';
                    setShouldPlay(false);
                  }, 1200);
                }}
                className="block text-[10px] md:text-[11px] tracking-[0.4em] text-brand-silver uppercase font-body font-bold"
              >
                UNISEX SILHOUETTES
              </motion.span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
