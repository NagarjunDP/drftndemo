import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'About DRFTN',
  description: 'Learn about DRFTN Clothing, founded by Bharath. Drift in Style, Built for the Streets.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white pt-28 pb-20 px-4 md:px-8 select-none">
      <div className="max-w-6xl mx-auto space-y-16 md:space-y-24">

        {/* Title Section */}
        <div className="text-center md:text-left border-b border-zinc-900 pb-8 flex flex-col md:flex-row md:items-baseline md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest font-mono">
              About DRFTN
            </h1>
            <p className="text-zinc-550 text-sm mt-2 font-mono uppercase text-[10px] tracking-wider">
              Drift in Style. Built for the Streets of Bengaluru.
            </p>
          </div>
          <div className="text-zinc-650 text-xs font-mono uppercase tracking-wider">
            Established 2025
          </div>
        </div>

        {/* Founder & Store Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-6 font-body text-left order-2 lg:order-1">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-zinc-500 font-mono block">
              Founder&apos;s Note
            </span>

            <h2 className="text-2xl md:text-3.5xl font-black uppercase tracking-wide leading-tight text-white">
              Hi, I’m Bharath, <br />
              <span className="text-zinc-400">the founder of DRFTN Clothing.</span>
            </h2>

            <div className="space-y-5 text-sm text-zinc-400 leading-relaxed font-light">
              <p>
                DRFTN was built with one vision: to bring premium streetwear that combines quality, comfort, and individuality. What started as an idea has grown into a brand focused on helping people express themselves through fashion.
              </p>
              <p>
                As a founder, I’m involved in every step of the journey—from sourcing premium fabrics and developing collections to building the brand and creating the customer experience. My goal is to make DRFTN more than just a clothing label—it’s a community for those who appreciate modern streetwear and confidence in what they wear.
              </p>
              <p className="border-l border-white/20 pl-4 py-1 italic text-zinc-300 font-mono text-xs uppercase tracking-wider">
                &ldquo;We’re just getting started, and every collection reflects our commitment to quality, style, and continuous improvement.&rdquo;
              </p>
              <p className="text-white font-semibold uppercase tracking-widest text-xs pt-2">
                Welcome to DRFTN Clothing.
              </p>
            </div>
          </div>

          {/* Store Image */}
          <div className="lg:col-span-5 order-1 lg:order-2">
            <div className="relative group overflow-hidden border border-zinc-850 aspect-[4/5] bg-zinc-950">
              <Image
                src="/drftnoutsidepic.jpeg"
                alt="DRFTN Clothing Store Front"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 font-mono text-[9px] uppercase tracking-widest text-zinc-400 bg-black/60 px-3 py-1.5 border border-white/10 backdrop-blur-md">
                DRFTN Store &bull; Bengaluru
              </div>
            </div>
          </div>
        </div>

        {/* Brand Philosophy Section */}
        <div className="pt-12 border-t border-zinc-900">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-zinc-500 font-mono block mb-6 text-center md:text-left">
            Brand Philosophy
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-950/40 p-6 border border-zinc-850 hover:border-zinc-800 transition-colors space-y-3">
              <h3 className="text-white font-bold uppercase tracking-wider text-xs font-mono">Premium Quality</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                We source only the best imported materials. Heavyweight cottons, durable prints, and fits that actually make sense for a streetwear silhouette.
              </p>
            </div>
            <div className="bg-zinc-950/40 p-6 border border-zinc-850 hover:border-zinc-800 transition-colors space-y-3">
              <h3 className="text-white font-bold uppercase tracking-wider text-xs font-mono">Unisex by Default</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                Fashion has no boundaries. Our entire catalog is designed to look incredible on anyone, focusing on oversized and relaxed fits.
              </p>
            </div>
            <div className="bg-zinc-950/40 p-6 border border-zinc-850 hover:border-zinc-800 transition-colors space-y-3">
              <h3 className="text-white font-bold uppercase tracking-wider text-xs font-mono">Community First</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                We&apos;re building a culture in Bengaluru. DRFTN is for the skaters, the artists, the drifters, and everyone in between.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="pt-8 pb-4 text-center">
          <Link
            href="/shop"
            className="bg-white hover:bg-zinc-200 text-black px-10 py-4 font-bold uppercase tracking-widest text-xs transition-colors inline-block cursor-pointer"
          >
            Explore the Collection
          </Link>
        </div>

      </div>
    </main>
  );
}
