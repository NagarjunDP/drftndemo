'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function WhatsAppButton() {
  const pathname = usePathname();
  const isExcluded = pathname?.startsWith('/admin') || pathname === '/checkout';

  if (isExcluded) return null;

  return (
    <a
      href="https://wa.me/917406164512?text=Hey%20DRFTN%20CLOTHING!%20I'm%20interested%20in%20your%20streetwear%20collection."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-4 sm:bottom-8 sm:right-6 z-[2400] w-11 h-11 sm:w-12 sm:h-12 bg-[#0A0A0A] border border-zinc-800 hover:border-brand-amber text-brand-offwhite rounded-full shadow-md hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center group"
      aria-label="Chat on WhatsApp"
    >
      <svg
        className="w-5 h-5 fill-current"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.447 5.362 1.448 5.483 0 9.942-4.437 9.945-9.897.002-2.643-1.02-5.129-2.88-6.99C17.206 1.85 14.727 1.83 12.01 1.83c-5.49 0-9.953 4.439-9.957 9.899-.001 2.124.57 4.197 1.651 5.86l-.99 3.618 3.733-.974zM17.8 14.18c-.319-.16-1.884-.93-2.176-1.037-.291-.107-.503-.16-.715.16-.211.32-.821 1.037-1.006 1.25-.186.213-.372.24-.69.08-.319-.16-1.348-.497-2.567-1.583-.948-.847-1.59-1.893-1.776-2.213-.186-.32-.02-.492.14-.651.143-.143.32-.373.48-.56.16-.186.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.715-1.724-.979-2.36-.258-.62-.52-.536-.715-.546-.185-.01-.397-.01-.61-.01-.212 0-.556.08-.847.4-.29.32-1.111 1.087-1.111 2.65 0 1.563 1.139 3.076 1.297 3.29.159.213 2.24 3.42 5.426 4.792.758.326 1.35.521 1.812.667.76.241 1.453.207 2.002.125.612-.092 1.884-.77 2.148-1.478.265-.707.265-1.314.185-1.438-.079-.124-.291-.186-.61-.346z" />
      </svg>
    </a>
  );
}
