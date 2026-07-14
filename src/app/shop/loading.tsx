import React from 'react';
import { ProductCardSkeleton } from '@/components/Skeletons';

export default function ShopLoading() {
  return (
    <div className="w-full flex flex-col min-h-screen bg-brand-black">
      {/* ── Page Header Skeleton ── */}
      <div className="border-b border-brand-graphite bg-brand-black">
        <div className="max-w-screen-2xl mx-auto px-8 md:px-12 pt-16 pb-12">
          <span className="eyebrow mb-3 block">The Archive</span>
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-brand-offwhite leading-none font-display uppercase" style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)' }}>
              Collection
            </h1>
            <div className="h-4 bg-zinc-900/60 rounded w-16 animate-pulse mb-1" />
          </div>
        </div>
      </div>

      {/* ── Category Pill Bar Skeleton ── */}
      <div className="sticky top-16 bg-brand-black/95 backdrop-blur-md border-b border-brand-graphite py-3 z-40">
        <div className="max-w-screen-2xl mx-auto px-8 md:px-12">
          <div className="flex gap-3.5 pb-px px-1 justify-start md:justify-center overflow-x-auto scrollbar-none py-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center shrink-0 space-y-2">
                <div className="w-[72px] h-[72px] md:w-[86px] md:h-[86px] rounded-full bg-zinc-900/60 animate-pulse" />
                <div className="h-3 bg-zinc-900/60 rounded w-10 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Product Grid Skeleton ── */}
      <div className="max-w-screen-2xl mx-auto px-8 md:px-12 py-16 md:py-24 w-full flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-[8px] md:gap-6 lg:gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
