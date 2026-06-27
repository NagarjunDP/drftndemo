'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Search, X, Menu } from 'lucide-react';
import { useCartStore } from '../lib/cartStore';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

const NAV_LINKS = [
  { href: '/shop', label: 'Collection' },
  { href: '/about', label: 'About' },
  { href: '/track', label: 'Track Order' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();
  const getCartCount = useCartStore((state) => state.getCartCount);
  const setIsOpen = useCartStore((state) => state.setIsOpen);
  const cartCount = getCartCount();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const [hideNav, setHideNav] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      setAtTop(y < 5);
      // Hide on scroll down, show on scroll up
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

  const isAdminPage = pathname?.startsWith('/admin');
  if (isAdminPage) return null;

  return (
    <>
      {/* ── Announcement Bar ── */}
      <div className="bg-brand-charcoal border-b border-brand-muted/30 text-brand-silver text-[10px] font-medium py-2.5 px-6 text-center tracking-[0.2em] uppercase select-none overflow-hidden">
        <div className="marquee-track pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="flex items-center gap-8 mr-8">
              <span>Free Shipping Above ₹999</span>
              <span className="text-brand-gold">◆</span>
              <span>COD Available Across India</span>
              <span className="text-brand-gold">◆</span>
              <span>Born in Yelahanka · Built for the World</span>
              <span className="text-brand-gold">◆</span>
              <span>Premium D2C Streetwear</span>
              <span className="text-brand-gold">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Main Navigation ── */}
      <header
        className={`w-full sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'glass-nav shadow-2xl shadow-black/40' : 'bg-transparent border-b border-transparent'
          } ${hideNav ? '-translate-y-full' : 'translate-y-0'}`}
      >
        <nav className="max-w-screen-2xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">

          {/* ── Left: Nav Links (Desktop) ── */}
          <div className="hidden lg:flex items-center gap-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[11px] font-medium tracking-[0.18em] uppercase transition-colors duration-200 border-animate pb-0.5 ${pathname === link.href || pathname?.startsWith(link.href + '?')
                    ? 'text-brand-offwhite'
                    : 'text-brand-silver hover:text-brand-offwhite'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Center: Logo ── */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center select-none group"
            aria-label="DRFTN Home"
          >
            <span
              className="font-display text-xl md:text-2xl font-bold tracking-[0.45em] text-brand-offwhite group-hover:text-brand-cream transition-colors duration-300"
              style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.4em' }}
            >
              BOSS
            </span>
            <span className="text-[8px] font-body tracking-[0.3em] text-brand-gold uppercase font-medium mt-[-2px]">
              Clothing
            </span>
          </Link>

          {/* ── Right: Actions ── */}
          <div className="flex items-center gap-5 ml-auto">
            {/* Auth */}
            <div className="flex items-center">
              {isLoaded && !isSignedIn && (
                <SignInButton mode="modal">
                  <button
                    id="navbar-login-btn"
                    className="text-[10px] font-semibold tracking-[0.2em] uppercase text-brand-silver hover:text-brand-offwhite transition-colors duration-200"
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
                        'w-7 h-7 border border-brand-muted hover:border-brand-gold transition-colors rounded-full',
                    },
                  }}
                />
              )}
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-4 bg-brand-muted/60" />

            {/* Cart */}
            <button
              id="navbar-cart-btn"
              onClick={() => setIsOpen(true)}
              className="relative flex items-center text-brand-silver hover:text-brand-offwhite transition-colors duration-200 group"
              aria-label="Open Cart"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-red text-brand-offwhite text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-scale-in">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              id="navbar-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-brand-silver hover:text-brand-offwhite transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* ── Mobile Menu Dropdown ── */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-500 ease-in-out ${mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            } glass-panel border-t border-brand-muted/20`}
        >
          <div className="px-6 py-6 flex flex-col gap-5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm tracking-[0.15em] uppercase font-medium transition-colors ${pathname === link.href ? 'text-brand-offwhite' : 'text-brand-silver hover:text-brand-offwhite'
                  }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-brand-muted/30 pt-4 mt-1">
              {isLoaded && !isSignedIn && (
                <SignInButton mode="modal">
                  <button className="text-sm tracking-[0.15em] uppercase font-medium text-brand-gold">
                    Sign In / Register
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
