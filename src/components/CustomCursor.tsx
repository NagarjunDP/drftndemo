'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState('');

  const dot = useRef({ x: -200, y: -200 });
  const ring = useRef({ x: -200, y: -200 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!mq.matches) return;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      ring.current.x = lerp(ring.current.x, dot.current.x, 0.16);
      ring.current.y = lerp(ring.current.y, dot.current.y, 0.16);

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dot.current.x}px, ${dot.current.y}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px)`;
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    const onMove = (e: MouseEvent) => {
      dot.current.x = e.clientX - 3;
      dot.current.y = e.clientY - 3;
    };

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const cursorEl = el.closest('[data-cursor]');
      const isLink = el.closest('a, button');
      if (cursorEl) {
        const type = cursorEl.getAttribute('data-cursor');
        setActive(true);
        setLabel(type === 'banner' ? '+' : 'VIEW');
      } else if (isLink) {
        setActive(true);
        setLabel('');
      } else {
        setActive(false);
        setLabel('');
      }
    };

    const onLeave = () => setActive(false);
    const onEnter = () => setActive(true);

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
    };
  }, []);

  return (
    <>
      {/* Inner dot — Always high-contrast white, never hidden */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-[6px] h-[6px] rounded-full bg-white
          pointer-events-none z-[99999] shadow-[0_0_10px_rgba(255,255,255,0.8)]
          will-change-transform"
        style={{
          marginLeft: 0,
          marginTop: 0,
          opacity: 1,
        }}
      />

      {/* Outer ring — Lerp lagged with high-contrast backdrop & crisp white border */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[99998] will-change-transform"
        style={{
          width: active ? (label ? 48 : 38) : 32,
          height: active ? (label ? 48 : 38) : 32,
          marginLeft: active ? (label ? -24 : -19) : -16,
          marginTop: active ? (label ? -24 : -19) : -16,
          borderRadius: '50%',
          border: '1.5px solid rgba(255, 255, 255, 0.9)',
          backgroundColor: active ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'width 0.2s ease-out, height 0.2s ease-out, margin 0.2s ease-out, background-color 0.2s ease-out',
        }}
      >
        {label && (
          <span
            className="text-[8px] font-mono font-bold tracking-[0.2em] text-white uppercase select-none drop-shadow-md"
            style={{ lineHeight: 1 }}
          >
            {label}
          </span>
        )}
      </div>
    </>
  );
}
