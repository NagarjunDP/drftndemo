'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function RevealSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scroll progress relative to this pinned section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Mask radial gradient calculations
  const radius = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const maskImage = useTransform(radius, (r) => `radial-gradient(circle at 50% 45%, black ${r}%, transparent ${r + 20}%)`);

  // Parallax translation drift on scroll
  const yArtwork = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const yBgText = useTransform(scrollYProgress, [0, 1], [0, -25]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[180vh] bg-black"
    >
      <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center bg-black animate-hero-resolve">
        {/* ── Section Background Texture (bg.png with overlay) ── */}
        <div className="absolute inset-0 z-0 opacity-35 pointer-events-none">
          <Image
            src="/bg.png"
            alt="Textured Background"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Soft edge-blending gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
        </div>

        {/* ── Background Typography (Scroll-reactive & Sync-masked) ── */}
        <motion.div
          style={{ y: yBgText }}
          className="absolute inset-0 z-[5] overflow-hidden flex flex-col justify-center items-center pointer-events-none select-none"
        >
          {/* Base Layer: Outline/White treatment */}
          <div className="absolute w-full h-[52vh] sm:h-full top-[24vh] sm:top-0 sm:inset-0 flex flex-col justify-between py-0 sm:py-16 md:py-24 items-center">
            <div
              className="font-display font-black text-[14vw] sm:text-[15vw] md:text-[16vw] leading-[0.8] text-transparent uppercase tracking-tighter whitespace-nowrap"
              style={{ WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.12)' }}
            >
              BUILT
            </div>
            <div
              className="font-display font-black text-[14vw] sm:text-[15vw] md:text-[16vw] leading-[0.8] text-transparent uppercase tracking-tighter whitespace-nowrap"
              style={{ WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.12)' }}
            >
              DRFTN
            </div>
            <div
              className="font-display font-black text-[8.5vw] sm:text-[9.5vw] md:text-[10vw] leading-[0.8] text-transparent uppercase tracking-tighter whitespace-nowrap"
              style={{ WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.12)' }}
            >
              DIFFERENT
            </div>
          </div>

          {/* Top Layer: Solid white fill treatment (revealed by mask) */}
          <motion.div
            style={{
              maskImage,
              WebkitMaskImage: maskImage,
            }}
            className="absolute w-full h-[52vh] sm:h-full top-[24vh] sm:top-0 sm:inset-0 flex flex-col justify-between py-0 sm:py-16 md:py-24 items-center transition-opacity duration-75"
          >
            <div className="font-display font-black text-[14vw] sm:text-[15vw] md:text-[16vw] leading-[0.8] text-white uppercase tracking-tighter whitespace-nowrap">
              BUILT
            </div>
            <div className="font-display font-black text-[14vw] sm:text-[15vw] md:text-[16vw] leading-[0.8] text-white uppercase tracking-tighter whitespace-nowrap">
              DRFTN
            </div>
            <div className="font-display font-black text-[8.5vw] sm:text-[9.5vw] md:text-[10vw] leading-[0.8] text-white uppercase tracking-tighter whitespace-nowrap">
              DIFFERENT
            </div>
          </motion.div>
        </motion.div>

        {/* ── Stacked Artwork Visual (Vertically centered, drifts on scrub) ── */}
        <motion.div
          style={{ y: yArtwork }}
          className="relative w-full max-w-[280px] h-[320px] sm:max-w-[360px] sm:h-[410px] md:max-w-[440px] md:h-[500px] z-10"
        >
          {/* Base Layer: Cream/Off-white original Stitch Hoodie (ori1.png) */}
          <div className="absolute inset-0 w-full h-full">
            <Image
              src="/ori1.png"
              alt="DRFTN Stitch Hoodie - Light Edition"
              fill
              priority
              sizes="(max-width: 768px) 280px, 440px"
              className="object-contain"
            />
          </div>

          {/* Top Masked Layer: Black original Stitch Hoodie (ori2.png) */}
          <motion.div
            style={{
              maskImage,
              WebkitMaskImage: maskImage,
            }}
            className="absolute inset-0 w-full h-full transition-opacity duration-75"
          >
            <Image
              src="/ori2.png"
              alt="DRFTN Stitch Hoodie - Dark Edition"
              fill
              priority
              sizes="(max-width: 768px) 280px, 440px"
              className="object-contain"
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
