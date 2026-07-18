import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center bg-brand-black" role="main">
      <div className="relative w-36 h-10 select-none mb-8">
        <Image
          src="/logo.png?v=3"
          alt="DRFTN"
          fill
          unoptimized
          priority
          className="object-contain object-center"
        />
      </div>

      <div className="space-y-6 max-w-md flex flex-col items-center">
        <h2 className="text-xl md:text-2xl font-display font-black uppercase tracking-widest text-brand-offwhite">
          NOTHING HERE.
        </h2>
        <div className="pt-2">
          <Link href="/shop" className="btn-primary text-[10px] py-3 px-8 tracking-widest uppercase rounded-sm border border-white/20 hover:bg-white hover:text-black transition-all">
            <span>Back to Shop</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
