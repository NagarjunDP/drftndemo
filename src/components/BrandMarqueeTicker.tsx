'use client';

import React from 'react';

const MARQUEE_ITEMS = [
  'HEAVYWEIGHT COTTON',
  'SMALL BATCH',
  'BUILT IN BENGALURU',
  'DROP 02',
  'LIMITED QUANTITIES',
  '300+ GSM FABRIC',
];

export default function BrandMarqueeTicker() {
  const repeatedItems = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className="w-full overflow-hidden border-y border-white/10 bg-zinc-950/90 py-3 relative z-20 backdrop-blur-md select-none">
      <div className="flex w-max animate-marquee-continuous whitespace-nowrap">
        {repeatedItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-4 px-4">
            <span className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.25em] uppercase text-zinc-300">
              {item}
            </span>
            <span className="text-zinc-600 text-xs">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}
