'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingBag, X, Menu } from 'lucide-react';
import { useCartStore } from '../lib/cartStore';
import { useAnimationStore } from '../lib/animationStore';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import AnnouncementTicker from './AnnouncementTicker';

const NAV_LINKS = [
  { href: '/shop', label: 'Collection' },
  { href: '/about', label: 'About' },
  { href: '/track', label: 'Track Order' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();
  const setIsOpen = useCartStore((state) => state.setIsOpen);
  const cartCount = useCartStore((state) => state.items.reduce((acc, item) => acc + item.quantity, 0));
  const cartPulseActive = useAnimationStore((state) => state.cartPulseActive);

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastScrollY = useRef(0);

  // Focus management for mobile menu
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstNavLinkRef = useRef<HTMLAnchorElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      if (y > lastScrollY.current && y > 80) {
        setHideNav(true);
      } else {
        setHideNav(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll-lock + focus-trap when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      // Lock body scroll (iOS Safari compatible)
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      // Focus the close button when menu opens
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [mobileMenuOpen]);

  // ESC key to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Focus trap inside mobile menu
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!mobileMenuOpen) return;
    if (e.key !== 'Tab') return;
    const focusable = menuRef.current?.querySelectorAll<HTMLElement>(
      'a, button, input, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [mobileMenuOpen]);

  const isAdminPage = pathname?.startsWith('/admin');
  const isCheckoutPage = pathname === '/checkout';
  const isShopPage = pathname?.startsWith('/shop');
  if (isAdminPage) return null;

  return (
    <>
      {/* ── Announcement Bar ── */}
      <AnnouncementTicker />

      {/* ── Main Navigation ── */}
      <header
        className={`w-full sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'glass-nav shadow-2xl shadow-black/50' : 'bg-transparent border-b border-transparent'
          } ${hideNav ? '-translate-y-full' : 'translate-y-0'}`}
        role="banner"
      >
        <nav
          className="max-w-screen-2xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* ── Logo — Increased by ~45% on mobile with entrance animation ── */}
          <Link
            href="/"
            className="flex items-center select-none group flex-shrink-0"
            aria-label="DRFTN Clothing — Home"
          >
            <div className="relative w-44 h-16 md:w-56 md:h-18 animate-[scaleIn_500ms_ease-out_forwards] origin-left">
              <Image
                src="/logo.png?v=3"
                alt="DRFTN Clothing"
                fill
                priority
                sizes="(max-width: 768px) 176px, 224px"
                className="object-contain object-left transition-opacity duration-300 group-hover:opacity-80"
              />
            </div>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="hidden lg:flex items-center gap-8" role="list">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="listitem"
                className={`text-[11px] font-medium tracking-[0.18em] uppercase transition-colors duration-200 border-animate pb-0.5 ${pathname === link.href || pathname?.startsWith(link.href + '?')
                  ? 'text-brand-offwhite'
                  : 'text-brand-silver hover:text-brand-offwhite'
                  }`}
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-4 md:gap-5">
            {/* Auth — Hidden on mobile, managed by bottom nav "Me" tab */}
            <div className="hidden lg:flex items-center">
              {isLoaded && !isSignedIn && (
                <SignInButton mode="modal">
                  <button
                    id="navbar-login-btn"
                    className="text-[10px] font-semibold tracking-[0.2em] uppercase text-brand-silver hover:text-brand-offwhite transition-colors duration-200"
                    aria-label="Sign in to your account"
                  >
                    Sign In
                  </button>
                </SignInButton>
              )}
              {isLoaded && isSignedIn && (
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox:
                        'w-7 h-7 border border-brand-muted hover:border-brand-amber transition-colors rounded-full',
                    },
                  }}
                />
              )}
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px h-4 bg-brand-muted/60" aria-hidden="true" />

            {/* Cart */}
            <button
              id="navbar-cart-btn"
              onClick={() => setIsOpen(true)}
              className={`relative flex items-center transition-all duration-200 group ${cartPulseActive ? 'scale-125 text-brand-red' : 'text-brand-silver hover:text-brand-offwhite'
                }`}
              aria-label={`Open cart${mounted && cartCount > 0 ? `, ${cartCount} items` : ''}`}
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              {mounted && cartCount > 0 && (
                <span
                  className="absolute -top-2 -right-2 bg-brand-red text-brand-offwhite text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-scale-in"
                  aria-hidden="true"
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              id="navbar-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-brand-silver hover:text-brand-offwhite transition-colors p-1"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </nav>

        {/* ── Category Strip — integrated second row of navigation (hidden on checkout/shop) ── */}
        {!isCheckoutPage && !isShopPage && (
          <div className="relative w-full border-t border-brand-graphite/40 bg-brand-black/90 backdrop-blur-md">
            {/* Left and Right Visual Fading Gradients for Scrolling indication */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-brand-black to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-brand-black to-transparent pointer-events-none z-10" />

            {/* Horizontal pills wrapper */}
            <div className="max-w-screen-2xl mx-auto px-6 md:px-12 py-3 flex gap-2.5 overflow-x-auto scrollbar-none items-center">
              {[
                { label: 'Hoodies', href: '/shop?category=hoodies' },
                { label: 'Jackets', href: '/shop?category=jackets' },
                { label: 'T-Shirts', href: '/shop?category=t-shirts' },
                { label: 'Denims', href: '/shop?category=denims' },
                { label: 'Accessories', href: '/shop?category=accessories' },
                { label: 'New Drops', href: '/shop' }
              ].map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className="px-3.5 py-1.5 rounded-full border border-brand-graphite bg-brand-charcoal/30 hover:border-brand-stone hover:bg-brand-muted/20 text-[9px] md:text-[10px] font-bold tracking-[0.15em] text-brand-stone hover:text-brand-offwhite uppercase transition-all duration-200 shrink-0 font-body"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Full-Screen Mobile Menu ── */}
      <div
        id="mobile-menu"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onKeyDown={handleMenuKeyDown}
        className={`mobile-menu-fullscreen lg:hidden ${mobileMenuOpen ? 'open' : ''}`}
        style={{ zIndex: 300 }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-graphite flex-shrink-0">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="relative w-20 h-10 block"
            aria-label="DRFTN Home"
          >
            <Image
              src="/logo.png?v=3"
              alt="DRFTN Clothing"
              fill
              sizes="80px"
              className="object-contain object-left"
            />
          </Link>
          <button
            ref={closeButtonRef}
            onClick={() => setMobileMenuOpen(false)}
            className="text-brand-silver hover:text-brand-offwhite transition-colors p-2 -mr-2"
            aria-label="Close navigation menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Nav Links — large Antonio display type */}
        <nav className="flex-1 flex flex-col justify-center px-8 py-8 space-y-1" aria-label="Mobile navigation">
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.href}
              ref={i === 0 ? firstNavLinkRef : undefined}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block font-display text-5xl uppercase font-bold leading-[1.1] py-3 border-b border-brand-graphite transition-colors duration-200 ${pathname === link.href
                ? 'text-brand-offwhite'
                : 'text-brand-muted hover:text-brand-offwhite'
                }`}
              aria-current={pathname === link.href ? 'page' : undefined}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className="text-brand-amber text-xl mr-2 font-body font-normal tracking-widest">
                {String(i + 1).padStart(2, '0')}
              </span>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Bottom strip */}
        <div className="px-8 py-6 border-t border-brand-graphite flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            {isLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <button
                  className="text-[11px] font-semibold tracking-[0.2em] uppercase text-brand-silver hover:text-brand-offwhite transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In / Register
                </button>
              </SignInButton>
            )}
            {isLoaded && isSignedIn && (
              <div className="flex items-center gap-2">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-6 h-6 border border-brand-muted rounded-full',
                    },
                  }}
                />
                <span className="text-[10px] tracking-[0.2em] uppercase text-brand-silver font-body">Account</span>
              </div>
            )}
          </div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-brand-graphite font-body">
            Born in Yelahanka
          </p>
        </div>
      </div>
    </>
  );
}
