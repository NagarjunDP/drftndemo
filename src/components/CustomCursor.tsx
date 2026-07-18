'use client';

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

export default function CustomCursor() {
  const [cursorType, setCursorType] = useState<'view' | 'plus' | null>(null);
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth lag configuration
  const springConfig = { damping: 32, stiffness: 350, mass: 0.35 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Media query to ensure fine pointing hover device only
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!mediaQuery.matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Offset by half of 48px to center on pointer
      mouseX.set(e.clientX - 24);
      mouseY.set(e.clientY - 24);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-cursor]');
      if (target) {
        const type = target.getAttribute('data-cursor');
        if (type === 'banner') {
          setCursorType('plus');
        } else {
          setCursorType('view');
        }
      } else {
        setCursorType(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [mouseX, mouseY]);

  return (
    <AnimatePresence>
      {cursorType && (
        <motion.div
          style={{
            x: cursorX,
            y: cursorY,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.85 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed top-0 left-0 w-12 h-12 rounded-full border border-[#F0F0F0] bg-black/20 backdrop-blur-[1.5px] pointer-events-none z-[99999] flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.06)]"
        >
          <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-[#F0F0F0] select-none leading-none">
            {cursorType === 'plus' ? '+' : 'VIEW'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
