'use client';

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowDown } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Product } from '@/types';
import DRFTNButton from '@/components/DRFTNButton';

interface HeroHoodieSceneProps {
  products?: Product[];
}

interface Milestone {
  label: string;
  contrastMode: 'light' | 'dark';
  bgHex: string;
}

const MILESTONES: Milestone[] = [
  {
    label: 'RAW SILHOUETTE',
    contrastMode: 'dark',
    bgHex: '#000000',
  },
  {
    label: 'ON-GRID STEALTH',
    contrastMode: 'dark',
    bgHex: '#060606',
  },
  {
    label: 'ACID WASH STUDIO',
    contrastMode: 'dark',
    bgHex: '#0A0A0A',
  },
  {
    label: 'BUILT DIFFERENT',
    contrastMode: 'dark',
    bgHex: '#000000',
  },
];

const DEFAULT_MARQUEE_IMAGES = [
  'https://ik.imagekit.io/nu87ftsgv/WhatsApp_Image_2026-07-16_at_8.39.44_PM-removebg-preview.png',
  'https://ik.imagekit.io/nu87ftsgv/WhatsApp_Image_2026-07-16_at_8.33.17_PM-removebg-preview.png',
  'https://ik.imagekit.io/nu87ftsgv/WhatsApp_Image_2026-07-16_at_8.38.40_PM-removebg-preview.png',
  'https://ik.imagekit.io/nu87ftsgv/WhatsApp_Image_2026-07-16_at_8.32.58_PM-removebg-preview.png',
];

export default function HeroHoodieScene({ products }: HeroHoodieSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroWrapperRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const hoodieLightRef = useRef<HTMLDivElement>(null);
  const hoodieDarkRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const textFillRef = useRef<HTMLDivElement>(null);
  const builtDifferentFillRef = useRef<HTMLDivElement>(null);
  const headlineBlockRef = useRef<HTMLDivElement>(null);
  const marqueeColsRef = useRef<(HTMLDivElement | null)[]>([]);

  const [activeBucket, setActiveBucket] = useState<number>(0);
  const currentBucketRef = useRef<number>(0);
  const [isLowEndDevice, setIsLowEndDevice] = useState<boolean>(false);

  const marqueeCols = React.useMemo(() => {
    const cols: string[][] = [[], [], [], []];
    for (let colIdx = 0; colIdx < 4; colIdx++) {
      for (let imgIdx = 0; imgIdx < 3; imgIdx++) {
        const itemIdx = (colIdx * 2 + imgIdx) % DEFAULT_MARQUEE_IMAGES.length;
        cols[colIdx].push(DEFAULT_MARQUEE_IMAGES[itemIdx]);
      }
    }
    return cols;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const concurrency = navigator.hardwareConcurrency || 4;
      const navConn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
      const effectiveType = navConn?.effectiveType || '4g';
      if (concurrency <= 4 || effectiveType === '2g' || effectiveType === '3g') {
        setIsLowEndDevice(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.config({ ignoreMobileResize: true });

    const containerEl = containerRef.current;
    const pinnedEl = pinnedRef.current;
    const hoodieLightEl = hoodieLightRef.current;
    const hoodieDarkEl = hoodieDarkRef.current;
    const scrollIndEl = scrollIndicatorRef.current;
    const textFillEl = textFillRef.current;
    const builtDiffFillEl = builtDifferentFillRef.current;
    const headlineBlockEl = headlineBlockRef.current;

    if (!containerEl || !pinnedEl || !hoodieLightEl || !hoodieDarkEl) return;

    const mm = gsap.matchMedia();

    const updateContrastBucket = (progress: number) => {
      let bucket = 0;
      if (progress > 0.75) bucket = 3;
      else if (progress > 0.5) bucket = 2;
      else if (progress > 0.25) bucket = 1;

      if (bucket !== currentBucketRef.current) {
        currentBucketRef.current = bucket;
        setActiveBucket(bucket);

        if (heroWrapperRef.current) {
          const milestone = MILESTONES[bucket] || MILESTONES[0];
          heroWrapperRef.current.setAttribute('data-contrast-mode', milestone.contrastMode);
          heroWrapperRef.current.style.setProperty(
            '--hero-contrast-bg',
            milestone.bgHex
          );
        }
      }
    };

    // DESKTOP TIMELINE (≥768px)
    mm.add('(min-width: 768px)', () => {
      const initialMask = 'radial-gradient(ellipse 70% 85% at 50% 50%, black 0%, transparent 0%)';
      gsap.set(hoodieLightEl, { opacity: 1, scale: 1, yPercent: 0 });
      gsap.set(hoodieDarkEl, {
        opacity: 1,
        scale: 1,
        yPercent: 0,
        maskImage: initialMask,
        webkitMaskImage: initialMask,
      });
      if (textFillEl) {
        gsap.set(textFillEl, {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
          webkitClipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
        });
      }
      if (builtDiffFillEl) {
        gsap.set(builtDiffFillEl, {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
          webkitClipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
        });
      }

      const maskObj = { inner: 0, outer: 0 };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerEl,
          start: 'top top',
          end: 'bottom bottom',
          pin: pinnedEl,
          scrub: 0.8,
          fastScrollEnd: true,
          onEnter: () => {
            gsap.set([hoodieLightEl, hoodieDarkEl, textFillEl, builtDiffFillEl, headlineBlockEl].filter(Boolean), {
              willChange: 'transform, opacity, clip-path',
            });
          },
          onEnterBack: () => {
            gsap.set([hoodieLightEl, hoodieDarkEl, textFillEl, builtDiffFillEl, headlineBlockEl].filter(Boolean), {
              willChange: 'transform, opacity, clip-path',
            });
          },
          onLeave: () => {
            gsap.set([hoodieLightEl, hoodieDarkEl, textFillEl, builtDiffFillEl, headlineBlockEl].filter(Boolean), {
              clearProps: 'willChange',
            });
          },
          onLeaveBack: () => {
            gsap.set([hoodieLightEl, hoodieDarkEl, textFillEl, builtDiffFillEl, headlineBlockEl].filter(Boolean), {
              clearProps: 'willChange',
            });
          },
          onUpdate: (self) => {
            updateContrastBucket(self.progress);
            if (scrollIndEl) {
              const op = Math.max(0, 1 - self.progress * 5);
              scrollIndEl.style.opacity = op.toString();
            }
          },
        },
      });

      tl.to(maskObj, {
        inner: 130,
        outer: 160,
        duration: 0.6,
        ease: 'none',
        onUpdate: () => {
          if (hoodieDarkEl) {
            const grad = `radial-gradient(ellipse 70% 85% at 50% 50%, black ${maskObj.inner}%, transparent ${maskObj.outer}%)`;
            hoodieDarkEl.style.maskImage = grad;
            hoodieDarkEl.style.webkitMaskImage = grad;
          }
        },
      }, 0.0)
        .to(hoodieLightEl, { opacity: 0.15, scale: 0.95, duration: 0.6, ease: 'none' }, 0.0);

      if (builtDiffFillEl) {
        tl.to(builtDiffFillEl, {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          webkitClipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          duration: 0.45,
          ease: 'none',
        }, 0.0);
      }

      if (textFillEl) {
        tl.to(textFillEl, {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          webkitClipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          duration: 0.70,
          ease: 'none',
        }, 0.0);
      }

      if (headlineBlockEl) {
        tl.to(headlineBlockEl, { yPercent: -10, ease: 'none', duration: 1.0 }, 0.0);
      }

      marqueeColsRef.current.forEach((col, idx) => {
        if (!col) return;
        const scrollUp = idx % 2 === 0;
        gsap.to(col, {
          yPercent: scrollUp ? -20 : 20,
          ease: 'none',
          scrollTrigger: {
            trigger: containerEl,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          },
        });
      });
    });

    // MOBILE TIMELINE (<768px)
    mm.add('(max-width: 767px)', () => {
      const initialMask = 'radial-gradient(ellipse 70% 85% at 50% 50%, black 0%, transparent 0%)';
      gsap.set(hoodieLightEl, { opacity: 1, scale: 1, yPercent: 0 });
      gsap.set(hoodieDarkEl, {
        opacity: 1,
        scale: 1,
        yPercent: 0,
        maskImage: initialMask,
        webkitMaskImage: initialMask,
      });
      if (textFillEl) {
        gsap.set(textFillEl, {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
          webkitClipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
        });
      }
      if (builtDiffFillEl) {
        gsap.set(builtDiffFillEl, {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
          webkitClipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
        });
      }

      const scrubSpeed = isLowEndDevice ? 0.3 : 0.5;
      const maskObj = { inner: 0, outer: 0 };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerEl,
          start: 'top top',
          end: 'bottom bottom',
          pin: pinnedEl,
          scrub: scrubSpeed,
          fastScrollEnd: true,
          onEnter: () => {
            gsap.set([hoodieLightEl, hoodieDarkEl, textFillEl, builtDiffFillEl, headlineBlockEl].filter(Boolean), {
              willChange: 'transform, opacity, clip-path',
            });
          },
          onEnterBack: () => {
            gsap.set([hoodieLightEl, hoodieDarkEl, textFillEl, builtDiffFillEl, headlineBlockEl].filter(Boolean), {
              willChange: 'transform, opacity, clip-path',
            });
          },
          onLeave: () => {
            gsap.set([hoodieLightEl, hoodieDarkEl, textFillEl, builtDiffFillEl, headlineBlockEl].filter(Boolean), {
              clearProps: 'willChange',
            });
          },
          onLeaveBack: () => {
            gsap.set([hoodieLightEl, hoodieDarkEl, textFillEl, builtDiffFillEl, headlineBlockEl].filter(Boolean), {
              clearProps: 'willChange',
            });
          },
          onUpdate: (self) => {
            updateContrastBucket(self.progress);
            if (scrollIndEl) {
              const op = Math.max(0, 1 - self.progress * 5);
              scrollIndEl.style.opacity = op.toString();
            }
          },
        },
      });

      tl.to(maskObj, {
        inner: 130,
        outer: 160,
        duration: 0.6,
        ease: 'none',
        onUpdate: () => {
          if (hoodieDarkEl) {
            const grad = `radial-gradient(ellipse 70% 85% at 50% 50%, black ${maskObj.inner}%, transparent ${maskObj.outer}%)`;
            hoodieDarkEl.style.maskImage = grad;
            hoodieDarkEl.style.webkitMaskImage = grad;
          }
        },
      }, 0.0)
        .to(hoodieLightEl, { opacity: 0.15, scale: 0.96, duration: 0.6, ease: 'none' }, 0.0);

      if (builtDiffFillEl) {
        tl.to(builtDiffFillEl, {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          webkitClipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          duration: 0.45,
          ease: 'none',
        }, 0.0);
      }

      if (textFillEl) {
        tl.to(textFillEl, {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          webkitClipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          duration: 0.7,
          ease: 'none',
        }, 0.0);
      }

      if (headlineBlockEl) {
        tl.to(headlineBlockEl, { yPercent: -4, ease: 'none', duration: 1.0 }, 0.0);
      }
    });

    return () => {
      mm.revert();
    };
  }, [isLowEndDevice]);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black select-none h-[160vh] md:h-[180vh]"
      id="hero-scene"
    >
      <div
        ref={pinnedRef}
        className="sticky top-0 w-full h-screen overflow-hidden bg-black"
      >
        {/* Main contrast wrapper container — Atmospheric Spotlight Background */}
        <div
          ref={heroWrapperRef}
          data-contrast-mode="dark"
          className="hero-contrast-wrapper relative w-full h-full flex flex-col justify-between items-center px-4 sm:px-8 md:px-12 pt-12 pb-6 sm:pb-8 md:py-8 transition-colors duration-300 overflow-hidden bg-black"
        >
          {/* ── ATMOSPHERIC STUDIO SPOTLIGHT BACKGROUND (NO PITCH BLACK VOID) (z-0) ── */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Multi-radial gradient ambient spotlight */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,255,255,0.16)_0%,rgba(35,35,45,0.55)_45%,rgba(0,0,0,1)_92%)]" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] md:w-[700px] h-[320px] sm:h-[500px] md:h-[700px] rounded-full bg-white/15 blur-[120px] pointer-events-none" />

            {/* Architectural noise texture */}
            <Image
              src="/bg.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-35 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />
          </div>

          {/* ── Desktop Background Product Marquee Grid (Desktop only, z-[1]) ── */}
          <div className="absolute inset-0 z-[1] hidden md:grid grid-cols-4 gap-8 px-16 overflow-hidden opacity-25 select-none pointer-events-none">
            {marqueeCols.map((colImages, colIdx) => (
              <div
                key={colIdx}
                ref={(el) => {
                  marqueeColsRef.current[colIdx] = el;
                }}
                className="flex flex-col gap-8 transition-transform duration-700"
              >
                {colImages.map((src, i) => (
                  <div key={i} className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-white/10">
                    <Image src={src} alt="" fill sizes="25vw" className="object-cover filter grayscale contrast-125" />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ── CENTRAL HOODIE HERO VIEWPORT ZONE (z-10) ── */}
          <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center pointer-events-none py-2">
            {/* Ambient Backlight Glow Disc */}
            <div
              className="absolute w-[340px] sm:w-[460px] md:w-[600px] h-[340px] sm:h-[460px] md:h-[600px] rounded-full blur-[110px] opacity-35 transition-colors duration-500"
              style={{ background: activeBucket === 2 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.22)' }}
            />

            {/* Dominant Hoodie Visual Container — Enlarged for Mobile (~88vw) */}
            <div className="relative w-[88vw] sm:w-[84vw] md:w-[520px] lg:w-[580px] max-w-[460px] md:max-w-none h-[46vh] sm:h-[50vh] md:h-full flex items-center justify-center">
              {/* Hoodie 1: Light / Cream Edition */}
              <div
                ref={hoodieLightRef}
                className="absolute inset-0 w-full h-full flex items-center justify-center"
              >
                <Image
                  src="/hero/hoodie-light-mobile.png"
                  alt="DRFTN Stitch Hoodie - Light Edition"
                  fill
                  priority
                  sizes="(max-width: 768px) 88vw, 580px"
                  className="object-contain filter drop-shadow-[0_24px_60px_rgba(0,0,0,0.9)]"
                />
              </div>

              {/* Hoodie 2: Dark / Stealth Edition */}
              <div
                ref={hoodieDarkRef}
                className="absolute inset-0 w-full h-full flex items-center justify-center"
              >
                <Image
                  src="/hero/hoodie-dark-mobile.png"
                  alt="DRFTN Stitch Hoodie - Dark Edition"
                  fill
                  priority
                  sizes="(max-width: 768px) 88vw, 580px"
                  className="object-contain filter drop-shadow-[0_24px_60px_rgba(0,0,0,0.95)]"
                />
              </div>
            </div>
          </div>

          {/* ── HERO COPY, OVERSIZED HEADLINE & CTA BUTTONS (z-20) ── */}
          <div className="relative z-20 w-full max-w-screen-2xl mx-auto flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 md:gap-6">
            {/* Copy & Headline Block */}
            <div ref={headlineBlockRef} className="max-w-2xl text-left space-y-1 sm:space-y-2">
              {/* ── OVERSIZED DISPLAY HEADLINE: "DRIFT IN STYLE." ── */}
              <div className="flex flex-col space-y-0 text-left">
                {/* "BUILT DIFFERENT" Badge with Top-to-Bottom White Fill Wipe */}
                <div className="relative inline-block overflow-hidden py-0.5 mb-1 select-none">
                  <span className="text-[11px] sm:text-xs md:text-sm font-mono font-bold uppercase tracking-[0.22em] text-stroke-hollow block">
                    {"// 01 • BUILT DIFFERENT"}
                  </span>

                  <div
                    ref={builtDifferentFillRef}
                    className="absolute inset-0 pointer-events-none z-10 py-0.5"
                    style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' }}
                  >
                    <span className="text-[11px] sm:text-xs md:text-sm font-mono font-bold uppercase tracking-[0.22em] text-white block">
                      {"// 01 • BUILT DIFFERENT"}
                    </span>
                  </div>
                </div>

                <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-black uppercase tracking-tighter text-white leading-[0.88] drop-shadow-md">
                  DRIFT IN
                </h1>

                {/* Mixed stroke & scroll-driven fill overlay */}
                <div className="relative inline-block overflow-hidden py-0.5">
                  {/* Underlay: hollow outline stroke */}
                  <span className="text-4xl sm:text-6xl md:text-8xl font-display font-black uppercase tracking-tighter text-stroke-hollow leading-[0.88] block">
                    STYLE.
                  </span>

                  {/* Overlay: solid white fill revealed on scroll scrub (Top-to-Bottom Wipe) */}
                  <div
                    ref={textFillRef}
                    className="absolute inset-0 pointer-events-none z-10 py-0.5"
                    style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' }}
                  >
                    <span className="text-4xl sm:text-6xl md:text-8xl font-display font-black uppercase tracking-tighter text-white leading-[0.88] block">
                      STYLE.
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs md:text-sm font-body font-medium tracking-wide uppercase max-w-md opacity-85 leading-relaxed hero-dynamic-text pt-0.5">
                HEAVYWEIGHT D2C STREETWEAR • BORN IN YELAHANKA
              </p>

              {/* Sitewide Premium DRFTN CTA Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <DRFTNButton href="/shop" variant="primary" fullWidth className="sm:w-auto">
                  SHOP COLLECTION
                </DRFTNButton>

                <DRFTNButton href="#collections" variant="secondary" fullWidth className="sm:w-auto" icon={null}>
                  EXPLORE DROPS
                </DRFTNButton>
              </div>
            </div>

            {/* ── ROTATING CIRCULAR SCROLL BADGE (z-20) ── */}
            <div
              ref={scrollIndicatorRef}
              className="flex flex-col items-center md:items-end gap-1.5 hero-dynamic-text transition-opacity duration-300 pointer-events-auto self-center md:self-end pt-2 md:pt-0"
            >
              <a
                href="#collections"
                className="relative flex items-center justify-center group"
                aria-label="Scroll to explore collection"
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 animate-spin-slow pointer-events-none"
                >
                  <path
                    id="circlePath"
                    d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                    fill="none"
                  />
                  <text className="text-[7.2px] font-mono font-bold uppercase tracking-[0.22em] fill-current">
                    <textPath href="#circlePath" startOffset="0%">
                      DRFTN CLOTHING • SCROLL TO EXPLORE •
                    </textPath>
                  </text>
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full border border-current flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
