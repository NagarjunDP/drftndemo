'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, X, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useCartStore } from '@/lib/cartStore';

const NAV_LINKS = [
  { href: '/shop', label: 'Collection' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export default function MobileNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const isCartOpen = useCartStore((state) => state.isOpen);
  const setIsOpen = useCartStore((state) => state.setIsOpen);
  const cartCount = useCartStore((state) => state.items.reduce((acc, i) => acc + i.quantity, 0));

  const [activePanel, setActivePanel] = useState<'menu' | 'search' | null>(null);
  const [isSettled, setIsSettled] = useState(false);
  const [sweepActive, setSweepActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clickedLinkIdx, setClickedLinkIdx] = useState<number | null>(null);
  const [clickedSug, setClickedSug] = useState<string | null>(null);
  const [searchRotate, setSearchRotate] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isOpen = activePanel !== null;

  const searchSuggestions = [
    'HEAVYWEIGHT TEES',
    'ACID-WASH HOODIES',
    'CARGO JOGGERS',
    'TECHWEAR ACCESSORIES'
  ];

  // Trigger the light-sweep sweep effect and manage settling state
  useEffect(() => {
    if (isOpen) {
      setSweepActive(true);
      const sweepTimer = setTimeout(() => setSweepActive(false), 500);
      const settleTimer = setTimeout(() => setIsSettled(true), 120);
      return () => {
        clearTimeout(sweepTimer);
        clearTimeout(settleTimer);
      };
    } else {
      setIsSettled(false);
    }
  }, [isOpen]);

  // Rotate search icon whenever search query is modified (simulating action)
  useEffect(() => {
    if (searchQuery.trim() !== '') {
      setSearchRotate(true);
      const timer = setTimeout(() => setSearchRotate(false), 400);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  // Focus input automatically once panel finishes morphing
  useEffect(() => {
    if (activePanel === 'search' && isSettled && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activePanel, isSettled]);

  // Lock scrolling when floating panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handlePillClick = (panelType: 'menu' | 'search') => {
    if (activePanel === panelType) {
      setActivePanel(null); // toggle close
    } else {
      setActivePanel(panelType);
    }
  };

  const handleLinkClick = (e: React.MouseEvent, href: string, idx: number) => {
    e.preventDefault();
    setClickedLinkIdx(idx);
    setTimeout(() => {
      setActivePanel(null);
      setClickedLinkIdx(null);
      router.push(href);
    }, 280);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      setSearchQuery('');
      setActivePanel(null);
      router.push(`/shop?search=${encodeURIComponent(query)}`);
    }
  };

  const handleSuggestionClick = (term: string) => {
    setClickedSug(term);
    setTimeout(() => {
      setClickedSug(null);
      setActivePanel(null);
      router.push(`/shop?search=${encodeURIComponent(term.toLowerCase())}`);
    }, 250);
  };

  if (pathname?.startsWith('/admin') || isCartOpen) return null;

  return (
    <>
      {/* ── BACKGROUND SCRIM OVERLAY — single CSS-transition layer, no separate Framer mount/unmount to prevent flicker ── */}
      <div
        className="fixed inset-0 z-[2400] md:hidden"
        style={{
          backgroundColor: 'rgba(0,0,0,0.72)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.28s cubic-bezier(0.22,1,0.36,1)',
          willChange: 'opacity',
        }}
        onClick={() => setActivePanel(null)}
      />

      {/* ── FLOATING MORPHING CAPSULE ── */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2500] w-full max-w-[480px] px-4 flex justify-center pointer-events-none md:hidden">
        <motion.div
          layout
          className={`bg-black/80 backdrop-blur-[32px] saturate-[180%] overflow-hidden flex flex-col justify-between pointer-events-auto ${
            isOpen ? 'w-full h-[60vh] rounded-[28px] p-0' : 'w-[230px] h-[52px] rounded-full px-0.5'
          }`}
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: isOpen
              ? '0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 20px rgba(255,255,255,0.05)',
          }}
          animate={
            !isOpen
              ? {
                  scale: [1, 1.012, 1],
                  boxShadow: [
                    '0 0 20px rgba(255,255,255,0.06), 0 0 16px rgba(239,68,68,0.08)',
                    '0 0 26px rgba(255,255,255,0.12), 0 0 22px rgba(239,68,68,0.18)',
                    '0 0 20px rgba(255,255,255,0.06), 0 0 16px rgba(239,68,68,0.08)',
                  ],
                }
              : {}
          }
          transition={{
            layout: {
              type: 'spring',
              stiffness: 220,
              damping: 32,
              mass: 0.9,
            },
            scale: { repeat: isOpen ? 0 : Infinity, duration: 4, ease: 'easeInOut' },
            boxShadow: { repeat: isOpen ? 0 : Infinity, duration: 4, ease: 'easeInOut' },
          }}
          onLayoutAnimationStart={() => setIsAnimating(true)}
          onLayoutAnimationComplete={() => setIsAnimating(false)}
          style={{ willChange: isAnimating ? 'transform' : 'auto' }}
        >
          {/* Light Sweep / Glass Sheen Overlay during morph */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[30deg] pointer-events-none z-30"
            initial={{ left: '-150%' }}
            animate={sweepActive ? { left: '150%' } : { left: '-150%' }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />

          {/* ── PANEL CONTENTS (Staggered cascading entrance after container settles) ── */}
          <div className="flex-1 overflow-hidden flex flex-col relative w-full">
            <AnimatePresence mode="wait">
              {isOpen && isSettled && (
                <motion.div
                  key={activePanel}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                  className="flex-1 flex flex-col p-6 overflow-y-auto"
                >
                  {/* Close button inside sheet */}
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">
                      {activePanel === 'menu' ? 'Navigation' : 'Search Engine'}
                    </span>
                    <button
                      onClick={() => setActivePanel(null)}
                      className="p-1.5 border border-white/5 bg-white/5 active:scale-90 text-white rounded-full transition-all"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* MENU CONTENT */}
                  {activePanel === 'menu' && (
                    <motion.nav
                      initial="hidden"
                      animate="show"
                      variants={{
                        show: { transition: { staggerChildren: 0.04 } },
                        hidden: {}
                      }}
                      className="flex flex-col space-y-5 pt-4 flex-grow justify-center"
                    >
                      {NAV_LINKS.map((link, idx) => {
                        const isLinkActive = pathname === link.href;
                        const isLinkSelected = clickedLinkIdx === idx;
                        return (
                          <motion.div
                            key={link.href}
                            variants={{
                              hidden: { opacity: 0, y: 15 },
                              show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150 } },
                            }}
                          >
                            <Link
                              href={link.href}
                              onClick={(e) => handleLinkClick(e, link.href, idx)}
                              className="relative group text-2xl font-display font-black uppercase tracking-widest text-zinc-200 hover:text-white transition-colors py-1.5 block w-max select-none"
                            >
                              <motion.span
                                whileTap={shouldReduceMotion ? {} : {
                                  skewX: -10,
                                  scale: 0.96,
                                  textShadow: '0 0 12px rgba(255,255,255,0.65)'
                                }}
                                transition={{ type: 'spring', stiffness: 450, damping: 12 }}
                                className="flex items-center text-left"
                              >
                                <span className={`text-[10px] font-mono mr-3 tracking-normal transition-all duration-200 ${
                                  isLinkSelected
                                    ? 'text-white text-shadow-[0_0_8px_rgba(255,255,255,0.7)] font-bold scale-110'
                                    : 'text-white/60'
                                }`}>
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                {link.label}
                              </motion.span>

                              {/* Drawing Active Underline with leading-edge blur trailing glow */}
                              <div className="absolute bottom-0 left-0 w-full h-[1.5px] pointer-events-none">
                                <motion.div
                                  initial={{ scaleX: 0 }}
                                  animate={(isLinkSelected || isLinkActive) ? { scaleX: 1 } : { scaleX: 0 }}
                                  transition={{ duration: 0.38, ease: 'easeOut' }}
                                  style={{ originX: 0 }}
                                  className="w-full h-full bg-white/70"
                                />
                                {!shouldReduceMotion && (
                                  <motion.div
                                    initial={{ left: '0%', opacity: 0 }}
                                    animate={
                                      (isLinkSelected || isLinkActive)
                                        ? { left: '100%', opacity: [0, 1, 1, 0] }
                                        : { left: '0%', opacity: 0 }
                                    }
                                    transition={{ duration: 0.38, ease: 'easeOut' }}
                                    style={{ translateX: '-50%' }}
                                    className="absolute top-1/2 -translate-y-1/2 w-6 h-[4px] bg-white blur-[2px]"
                                  />
                                )}
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}

                      {/* BAG button — opens cart drawer */}
                      <motion.div
                        variants={{
                          hidden: { opacity: 0, y: 15 },
                          show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150 } },
                        }}
                      >
                        <button
                          onClick={() => {
                            setActivePanel(null);
                            setTimeout(() => setIsOpen(true), 200);
                          }}
                          className="relative group text-2xl font-display font-black uppercase tracking-widest text-zinc-200 hover:text-white transition-colors py-1.5 flex items-center gap-3 w-max select-none"
                        >
                          <span className="text-[10px] font-mono tracking-normal text-white/60">
                            {String(NAV_LINKS.length + 1).padStart(2, '0')}
                          </span>
                          Bag
                          {cartCount > 0 && (
                            <span className="ml-1 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono">
                              {cartCount}
                            </span>
                          )}
                        </button>
                      </motion.div>
                    </motion.nav>
                  )}

                  {/* SEARCH CONTENT */}
                  {activePanel === 'search' && (
                    <div className="flex-grow flex flex-col justify-start pt-2">
                      <form onSubmit={handleSearchSubmit} className="w-full relative">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-2">
                          Search catalog
                        </label>
                        <div className="relative flex items-center">
                          <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="TYPE SEARCH KEYWORD..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#181818]/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-display font-black text-white uppercase tracking-wider placeholder-zinc-700 transition-all duration-300 focus:outline-none focus:border-white/35 focus:shadow-[0_0_12px_rgba(255,255,255,0.18)] focus-scanline"
                          />
                          <button
                            type="submit"
                            className="absolute right-4 text-zinc-500 hover:text-white p-1"
                            aria-label="Search"
                          >
                            <motion.div
                              animate={searchRotate ? { rotate: 360 } : { rotate: 0 }}
                              transition={{ duration: 0.4, ease: 'easeInOut' }}
                            >
                              <Search className="w-4 h-4" />
                            </motion.div>
                          </button>
                        </div>
                      </form>

                      {/* Suggested keywords */}
                      <div className="mt-8 flex flex-col">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-4">
                          Popular keywords
                        </span>
                        <div className="flex flex-col space-y-3">
                          {searchSuggestions.map((term, i) => {
                            const isSugClicked = clickedSug === term;
                            return (
                              <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.05 + i * 0.04 }}
                                key={term}
                                onClick={() => handleSuggestionClick(term)}
                                className="text-left py-1.5 text-xs font-display font-extrabold uppercase tracking-widest text-zinc-400 hover:text-white hover:text-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all border-b border-white/[0.03] flex items-center justify-between group"
                              >
                                <span>{term}</span>
                                <motion.span
                                  animate={isSugClicked ? { x: 3 } : { x: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="text-[9px] font-mono text-zinc-600 group-hover:text-white"
                                >
                                  ➔
                                </motion.span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── CAPSULE CONTROL TABS (Always visible at the bottom) ── */}
          <div
            className={`w-full flex items-center border-t border-white/5 select-none transition-all duration-300 ${
              isOpen ? 'h-[56px] px-6 justify-between' : 'h-full justify-center'
            }`}
          >
            {/* Left: WhatsApp Quick Contact (Open state only) */}
            <AnimatePresence>
              {isOpen && (
                <motion.a
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  href="https://wa.me/917406164512?text=Hey%20DRFTN%20CLOTHING!%20I'm%20interested%20in%20your%20streetwear%20collection."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all duration-200 pointer-events-auto"
                  aria-label="WhatsApp Contact"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.447 5.362 1.448 5.483 0 9.942-4.437 9.945-9.897.002-2.643-1.02-5.129-2.88-6.99C17.206 1.85 14.727 1.83 12.01 1.83c-5.49 0-9.953 4.439-9.957 9.899-.001 2.124.57 4.197 1.651 5.86l-.99 3.618 3.733-.974zM17.8 14.18c-.319-.16-1.884-.93-2.176-1.037-.291-.107-.503-.16-.715.16-.211.32-.821 1.037-1.006 1.25-.186.213-.372.24-.69.08-.319-.16-1.348-.497-2.567-1.583-.948-.847-1.59-1.893-1.776-2.213-.186-.32-.02-.492.14-.651.143-.143.32-.373.48-.56.16-.186.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.715-1.724-.979-2.36-.258-.62-.52-.536-.715-.546-.185-.01-.397-.01-.61-.01-.212 0-.556.08-.847.4-.29.32-1.111 1.087-1.111 2.65 0 1.563 1.139 3.076 1.297 3.29.159.213 2.24 3.42 5.426 4.792.758.326 1.35.521 1.812.667.76.241 1.453.207 2.002.125.612-.092 1.884-.77 2.148-1.478.265-.707.265-1.314.185-1.438-.079-.124-.291-.186-.61-.346z" />
                  </svg>
                </motion.a>
              )}
            </AnimatePresence>

            {/* Right Side: MENU | SEARCH Tabs */}
            <div className={`flex items-center ${isOpen ? 'gap-1' : 'w-full'}`}>
              <button
                onClick={() => handlePillClick('menu')}
                className={`flex-1 px-2.5 py-2.5 rounded-full flex items-center justify-center gap-1.5 text-[10px] font-mono tracking-widest uppercase transition-[transform,background-color,color,box-shadow] duration-350 ease-streetwear pointer-events-auto active:scale-95 active:bg-white/5 active:text-white ${
                  activePanel === 'menu'
                    ? 'text-white bg-white/5 font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                    : 'text-zinc-400 md:hover:text-white'
                }`}
              >
                {/* Morphing Hamburger Icon */}
                <svg width="12" height="12" viewBox="0 0 14 14" className="stroke-current flex-shrink-0">
                  <motion.path
                    fill="transparent"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    d="M 2 3 L 12 3"
                    animate={activePanel === 'menu' ? { d: 'M 2 2 L 12 12' } : { d: 'M 2 3 L 12 3' }}
                    transition={{ duration: 0.25 }}
                  />
                  <motion.path
                    fill="transparent"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    d="M 2 7 L 12 7"
                    animate={activePanel === 'menu' ? { opacity: 0 } : { opacity: 1 }}
                    transition={{ duration: 0.25 }}
                  />
                  <motion.path
                    fill="transparent"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    d="M 2 11 L 12 11"
                    animate={activePanel === 'menu' ? { d: 'M 2 12 L 12 2' } : { d: 'M 2 11 L 12 11' }}
                    transition={{ duration: 0.25 }}
                  />
                </svg>
                <span>MENU</span>
              </button>

              {/* Tab Divider */}
              <div className="w-[1px] h-4 bg-white/10 flex-shrink-0" />

              <button
                onClick={() => handlePillClick('search')}
                className={`flex-1 px-2.5 py-2.5 rounded-full flex items-center justify-center gap-1.5 text-[10px] font-mono tracking-widest uppercase transition-[transform,background-color,color,box-shadow] duration-350 ease-streetwear pointer-events-auto active:scale-95 active:bg-white/5 active:text-white ${
                  activePanel === 'search'
                    ? 'text-white bg-white/5 font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                    : 'text-zinc-400 md:hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5 stroke-[2.2] flex-shrink-0" />
                <span>SEARCH</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
