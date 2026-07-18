'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import NextImage from 'next/image';
import { getOptimizedImageUrl, getBlurPlaceholderUrl } from '@/lib/cloudinary';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SignatureGalleryProps {
  images: string[];
  activeIndex: number;
  onChangeIndex?: (index: number) => void;
  aspectClass?: string;
  sizes?: string;
  enableDrag?: boolean;
  enableHoverScrub?: boolean;
  overlayLeft?: React.ReactNode;
  overlayRight?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  layoutId?: string;
  imageWidth?: number;
}

interface OptimizedBlurImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageWidth: number;
}

function OptimizedBlurImage({
  src,
  alt,
  fill = true,
  priority = false,
  sizes,
  className,
  imageWidth,
}: OptimizedBlurImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const optimizedUrl = getOptimizedImageUrl(src, imageWidth);
  const blurUrl = getBlurPlaceholderUrl(src);

  // Hardcoded dark gray base64 SVG placeholder (zero network dependency)
  const instantPlaceholder = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='133' viewBox='0 0 100 133'><rect width='100%' height='100%' fill='%23121212'/></svg>";

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ 
        backgroundImage: `url("${instantPlaceholder}")`, 
        backgroundSize: 'cover',
        backgroundPosition: 'center' 
      }}
    >
      {/* 1. Low-res Blurred Cloudinary Image */}
      {blurUrl && (
        <img
          src={blurUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-opacity duration-300 ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ filter: 'blur(10px)' }}
        />
      )}

      {/* 2. High-res Main Image */}
      <NextImage
        src={optimizedUrl}
        alt={alt}
        fill={fill}
        priority={priority}
        sizes={sizes}
        onLoad={() => setIsLoaded(true)}
        className={`object-cover select-none pointer-events-none transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className || ''}`}
      />
    </div>
  );
}

export default function SignatureGallery({
  images,
  activeIndex,
  onChangeIndex,
  aspectClass = 'aspect-[3/4]',
  sizes = '(max-width: 768px) 50vw, 25vw',
  enableDrag = true,
  enableHoverScrub = false,
  overlayLeft,
  overlayRight,
  onClick,
  layoutId,
  imageWidth = 1200,
}: SignatureGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [localIndex, setLocalIndex] = useState(activeIndex);

  // Sync prop activeIndex to localIndex and scroll if they diverge
  useEffect(() => {
    if (activeIndex !== localIndex) {
      setLocalIndex(activeIndex);
      const activeSlide = slideRefs.current[activeIndex];
      if (activeSlide) {
        activeSlide.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }
  }, [activeIndex, localIndex]);

  // Set up IntersectionObserver to update activeIndex on horizontal swipe
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || images.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = slideRefs.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1 && index !== localIndex) {
              setLocalIndex(index);
              onChangeIndex?.(index);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6, // fire when 60% of the slide is in viewport
      }
    );

    slideRefs.current.forEach((slide) => {
      if (slide) observer.observe(slide);
    });

    return () => {
      observer.disconnect();
    };
  }, [images.length, localIndex, onChangeIndex]);

  if (images.length === 0) {
    return <div className={`w-full ${aspectClass} bg-brand-charcoal`} />;
  }

  return (
    <motion.div
      ref={containerRef}
      onClick={onClick}
      layoutId={layoutId}
      className={`relative w-full ${aspectClass} overflow-hidden bg-brand-charcoal group`}
    >
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* 1. Native Horizontally Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="w-full h-full flex overflow-x-auto scrollbar-none overscroll-x-contain"
        style={{
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {images.map((src, idx) => (
          <div
            key={idx}
            ref={(el) => { slideRefs.current[idx] = el; }}
            className="w-full h-full flex-shrink-0"
            style={{ scrollSnapAlign: 'center' }}
          >
            <OptimizedBlurImage
              src={src}
              alt={`Product image ${idx + 1}`}
              fill
              priority={idx === 0}
              sizes={sizes}
              imageWidth={imageWidth}
            />
          </div>
        ))}
      </div>

      {/* 2. Custom Pagination Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-black/45 backdrop-blur-[2px] px-2.5 py-1.5 rounded-full">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onChangeIndex?.(idx);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeIndex
                  ? 'bg-white scale-125'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* 3. Static Overlays */}
      {overlayLeft && (
        <div className="absolute top-3 left-3 z-20 pointer-events-none">
          {overlayLeft}
        </div>
      )}

      {overlayRight && (
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          {overlayRight}
        </div>
      )}

      {/* 4. Desktop Navigation Left Arrow */}
      {activeIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const prevIdx = activeIndex - 1;
            onChangeIndex?.(prevIdx);
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 bg-brand-black/60 border border-brand-muted/40 rounded-none flex items-center justify-center text-white hover:bg-brand-black hover:border-white transition-all cursor-pointer opacity-0 group-hover:opacity-100 hidden md:flex"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* 5. Desktop Navigation Right Arrow */}
      {activeIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const nextIdx = activeIndex + 1;
            onChangeIndex?.(nextIdx);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 bg-brand-black/60 border border-brand-muted/40 rounded-none flex items-center justify-center text-white hover:bg-brand-black hover:border-white transition-all cursor-pointer opacity-0 group-hover:opacity-100 hidden md:flex"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </motion.div>
  );
}
