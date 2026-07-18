'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, Plus, Minus, ShoppingBag, CreditCard, Ruler, Info, X, Bell } from 'lucide-react';
import { dbService } from '@/lib/db';
import { getOptimizedImageUrl } from '@/lib/cloudinary';
import SignatureGallery from '@/components/SignatureGallery';
import { Product } from '@/types';
import { useCartStore } from '@/lib/cartStore';
import { useAnimationStore } from '@/lib/animationStore';
import { toast } from '@/lib/toast';
import { ProductDetailSkeleton } from '@/components/Skeletons';

interface ProductDetailPageProps {
  params: {
    slug: string;
  };
}

export default function ProductDetailClient({ params }: ProductDetailPageProps) {
  const router = useRouter();
  const slug = params.slug;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Gallery & Detail State
  const [activeImage, setActiveImage] = useState<string>('');
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'details' | 'shipping' | 'returns' | ''>('details');
  const [sizeChartOpen, setSizeChartOpen] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const mainButtonsRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Sticky Add to Bag Observer
  useEffect(() => {
    if (loading) return;
    const target = mainButtonsRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setShowStickyBar(scrolledPast);
      },
      { threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loading]);

  // Cart operations
  const addItem = useCartStore((state) => state.addItem);

  // Load product data
  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        const prod = await dbService.getProductBySlug(slug);
        if (!prod) {
          setProduct(null);
          return;
        }
        setProduct(prod);
        setActiveImage(prod.images[0] || '');

        // Fetch related products
        const allProds = await dbService.getProducts();
        const related = allProds
          .filter((p) => p.category === prod.category && p.id !== prod.id)
          .slice(0, 4);
        setRelatedProducts(related);
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [slug]);

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    setIsMobileDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const productImages = product?.images;
  const imagesStr = productImages?.join(',') || '';
  const productId = product?.id;
  const stockQuantity = product?.stock_quantity;

  // Preload all product images immediately on load with priority rules
  useEffect(() => {
    if (!productImages || productImages.length === 0) return;
    
    const targetWidth = isMobileDevice ? 800 : 1200;
    productImages.forEach((img, idx) => {
      const optimizedUrl = getOptimizedImageUrl(img, targetWidth);
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedUrl;
      if (idx > 1) {
        link.setAttribute('fetchpriority', 'low');
      } else {
        link.setAttribute('fetchpriority', 'high');
      }
      document.head.appendChild(link);
    });
  }, [imagesStr, productImages, isMobileDevice]);

  // Real-time stock polling: update PDP size badges every 10s, pause when tab is hidden
  useEffect(() => {
    if (!productId) return;
    let intervalId: ReturnType<typeof setInterval>;

    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/products/${productId}/stock`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.stock) {
          setProduct((prev) => prev ? { ...prev, stock_quantity: data.stock } : prev);
          // Clamp selected quantity if newly fetched stock is lower
          if (selectedSize) {
            const freshStock = data.stock[selectedSize] ?? 0;
            setQuantity((prev) => Math.max(1, Math.min(prev, freshStock)));
          }
        }
      } catch {
        // Non-critical — silently ignore polling errors
      }
    };

    intervalId = setInterval(poll, 10_000);
    document.addEventListener('visibilitychange', poll);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [productId, selectedSize]);

  // Clamp quantity stepper when size changes and new size has fewer units in stock
  useEffect(() => {
    if (!stockQuantity || !selectedSize) return;
    const newSizeStock = stockQuantity[selectedSize] ?? 0;
    setQuantity((prev) => Math.max(1, Math.min(prev, newSizeStock)));
  }, [selectedSize, stockQuantity]);

  if (loading) {
    return (
      <div className="py-12 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-6 space-y-4">
        <Info className="w-16 h-16 text-white/40 stroke-[1]" />
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-brand-offwhite">PRODUCT NOT FOUND</h2>
          <p className="text-zinc-500 text-xs mt-1">This drop might have ended or is currently archived.</p>
        </div>
        <Link
          href="/shop"
          className="btn-electric bg-brand-offwhite text-brand-black font-bold text-xs tracking-widest uppercase py-3.5 px-8 rounded shadow"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const isCompletelyOutOfStock = product ? product.sizes.every((s) => (product.stock_quantity[s] || 0) <= 0) : false;

  const handleNotifyMe = async () => {
    try {
      setIsSubscribing(true);
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const rawKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!rawKey) {
        throw new Error('VAPID public key not configured');
      }
      const { urlBase64ToUint8Array } = await import('@/lib/vapid');
      const applicationServerKey = urlBase64ToUint8Array(rawKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.toJSON().keys?.p256dh, auth: subscription.toJSON().keys?.auth },
          productId: product?.id,
        }),
      });

      if (!res.ok) throw new Error('Failed to subscribe');

      localStorage.setItem('push_alerts_subscribed', 'true');
      window.dispatchEvent(new Event('push-subscription-changed'));

      toast.success('You will be notified when this is back in stock!');
    } catch (e) {
      console.error(e);
      toast.error('Could not enable notifications.');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Stock check helpers
  const getStockForSize = (size: string) => {
    return product.stock_quantity[size] || 0;
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    if (!selectedSize) {
      toast.error('Please select a size first!');
      return;
    }

    const stock = getStockForSize(selectedSize);
    if (stock <= 0) {
      toast.error(`Size ${selectedSize} is out of stock!`);
      return;
    }

    setIsAdding(true);
    setTimeout(() => setIsAdding(false), 900);

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compare_price: product.compare_price,
      image: product.images[0] || '',
      size: selectedSize,
      stock_quantity: product.stock_quantity,
    }, quantity);

    // Trigger the flying image animation
    let cartEl = document.getElementById('navbar-cart-btn');
    if (!cartEl || cartEl.getBoundingClientRect().width === 0) {
      cartEl = document.getElementById('mobile-cart-trigger');
    }

    if (cartEl) {
      const cartRect = cartEl.getBoundingClientRect();
      const endX = cartRect.left + cartRect.width / 2;
      const endY = cartRect.top + cartRect.height / 2;

      // Find the main product image coordinates
      const imgEl = document.querySelector('.pdp-main-image img') || document.querySelector('img');
      const sourceRect = imgEl ? imgEl.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();

      const startX = sourceRect.left + sourceRect.width / 2;
      const startY = sourceRect.top + sourceRect.height / 2;

      useAnimationStore.getState().addFlyingItem({
        imageUrl: product.images[0] || '',
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
      });
    } else {
      useAnimationStore.getState().triggerCartPulse();
    }

    toast.cartSuccess(product.name, product.images[0] || '');
  };

  const handleBuyNow = () => {
    if (!selectedSize) {
      toast.error('Please select a size first!');
      return;
    }

    const stock = getStockForSize(selectedSize);
    if (stock <= 0) {
      toast.error(`Size ${selectedSize} is out of stock!`);
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compare_price: product.compare_price,
      image: product.images[0] || '',
      size: selectedSize,
      stock_quantity: product.stock_quantity,
    }, quantity);

    router.push('/checkout');
  };

  return (
    <div className="py-8 md:py-12 px-6 md:px-12 max-w-7xl mx-auto w-full flex-1 flex flex-col">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-8">
        <Link href="/" className="hover:text-brand-offwhite">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/shop" className="hover:text-brand-offwhite">Shop</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-400 line-clamp-1">{product.name}</span>
      </div>

      {/* Main product columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 mb-20">
        {/* Left: Image Gallery */}
        <div>
          {/* Mobile Carousel (Hidden on Desktop) */}
          <div className="block md:hidden relative w-full aspect-[3/4] bg-zinc-950 border border-zinc-900/60 overflow-hidden">
            <SignatureGallery
              images={product.images}
              activeIndex={carouselIndex}
              onChangeIndex={(idx) => {
                setCarouselIndex(idx);
                setActiveImage(product.images[idx]);
              }}
              aspectClass="aspect-[3/4]"
              sizes="(max-width: 768px) 100vw, 50vw"
              enableDrag={true}
              imageWidth={800}
              overlayLeft={
                product.compare_price && product.compare_price > product.price ? (
                  <span className="border border-brand-offwhite/30 text-brand-offwhite text-[9px] tracking-[0.2em] font-semibold py-1 px-2.5 uppercase bg-brand-black/60 backdrop-blur-sm">
                    Sale
                  </span>
                ) : null
              }
              overlayRight={
                product.images.length > 1 ? (
                  <div className="bg-brand-black/80 border border-zinc-800 text-[10px] font-mono text-brand-offwhite px-2.5 py-1 font-bold rounded tracking-widest uppercase">
                    {carouselIndex + 1} / {product.images.length}
                  </div>
                ) : null
              }
            />
          </div>

          {/* Desktop Layout (Hidden on Mobile) */}
          <div className="hidden md:flex flex-row gap-4 w-full">
            {/* Vertical thumbnail rail */}
            {product.images.length > 1 && (
              <div className="w-20 flex-shrink-0 flex flex-col gap-2.5 max-h-[500px] overflow-y-auto scrollbar-none pr-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`aspect-[3/4] w-full bg-zinc-950 rounded border overflow-hidden transition-all relative ${activeImage === img ? 'border-white' : 'border-zinc-900/60 hover:border-zinc-700'
                      }`}
                  >
                    <NextImage
                      src={getOptimizedImageUrl(img, 150)}
                      alt={`Thumbnail ${idx}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main active image frame */}
            <div className="pdp-main-image flex-1 aspect-[3/4] bg-zinc-950 rounded-none overflow-hidden border border-zinc-900/60 relative group">
              <SignatureGallery
                images={product.images}
                activeIndex={product.images.indexOf(activeImage) !== -1 ? product.images.indexOf(activeImage) : 0}
                onChangeIndex={(idx) => {
                  setActiveImage(product.images[idx]);
                  setCarouselIndex(idx);
                }}
                aspectClass="aspect-[3/4]"
                sizes="(max-width: 1024px) 100vw, 50vw"
                enableDrag={true}
                imageWidth={1200}
                layoutId={`product-image-${product.slug}`}
                overlayLeft={
                  product.compare_price && product.compare_price > product.price ? (
                    <span className="border border-brand-offwhite/30 text-brand-offwhite text-[9px] tracking-[0.2em] font-semibold py-1 px-2.5 uppercase bg-brand-black/60 backdrop-blur-sm">
                      Sale
                    </span>
                  ) : null
                }
              />
            </div>
          </div>
        </div>

        {/* Right: Info Details */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-xs text-white/60 font-bold uppercase tracking-[0.2em]">{product.category}</span>
              <h1 className="text-3xl md:text-4xl font-display uppercase tracking-wider text-brand-offwhite mt-1">
                {product.name}
              </h1>
            </div>

            {/* Pricing */}
            <div className="flex items-center gap-3">
              <span className="text-xl md:text-2xl font-bold text-brand-offwhite">₹{Math.round(product.price / 100).toLocaleString('en-IN')}</span>
              {product.compare_price && (
                <span className="text-sm md:text-base text-zinc-500 line-through">₹{Math.round(product.compare_price / 100).toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>

          {/* Size & Action Buttons block moved directly after Pricing */}
          <div className="space-y-6 pt-4">
            {/* Size Selector */}
            <div id="size-selector-anchor" className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                <span className="text-zinc-400">Select Size:</span>
                <button
                  onClick={() => setSizeChartOpen(true)}
                  className="text-brand-offwhite hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Ruler className="w-3.5 h-3.5 text-white/60" />
                  Sizing Guide
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const stock = getStockForSize(size);
                  const isOutOfStock = stock <= 0;

                  return (
                    /* Outer wrapper is the positioning context for the scarcity badge */
                    <div key={size} className="relative pt-2">
                      {stock > 0 && stock <= 3 && (
                        <span className="absolute top-0 left-0 right-0 text-center bg-amber-500 text-black text-[6px] font-black uppercase tracking-wider px-1 py-0.5 leading-none z-10 pointer-events-none whitespace-nowrap overflow-hidden">
                          {stock === 1 ? 'Only 1 left' : `Only ${stock} left`}
                        </span>
                      )}
                      <button
                        disabled={isOutOfStock}
                        onClick={() => {
                          setSelectedSize(size);
                          setQuantity(1);
                        }}
                        className={`min-w-[3rem] h-12 px-3 text-xs border uppercase font-bold flex items-center justify-center rounded-none transition-all ${isOutOfStock
                          ? 'border-zinc-900 text-zinc-700 bg-zinc-950 cursor-not-allowed line-through'
                          : selectedSize === size
                            ? 'border-white bg-white text-black'
                            : 'border-zinc-800 text-brand-offwhite hover:border-zinc-500'
                          }`}
                      >
                        {size}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quantity selector */}
            {selectedSize && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Quantity</span>
                <div className="flex items-center border border-zinc-800 rounded-none bg-zinc-950 max-w-[120px]">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="p-2.5 text-zinc-500 hover:text-brand-offwhite disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs px-2 text-brand-offwhite font-bold flex-1 text-center select-none">
                    {quantity}
                  </span>
                  <button
                    disabled={quantity >= getStockForSize(selectedSize)}
                    onClick={() => setQuantity((prev) => Math.min(getStockForSize(selectedSize), prev + 1))}
                    className="p-2.5 text-zinc-500 hover:text-brand-offwhite disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Actions Buttons with IntersectionObserver ref */}
            <div ref={mainButtonsRef}>
              {isCompletelyOutOfStock ? (
                <div className="pt-2">
                  <button
                    onClick={handleNotifyMe}
                    disabled={isSubscribing}
                    className="btn-primary w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black py-4 font-bold transition-colors"
                  >
                    <Bell className="w-4 h-4" />
                    <span>{isSubscribing ? 'Subscribing...' : 'Notify Me When Available'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className="btn-primary flex-1 relative overflow-hidden"
                  >
                    <span
                      className={`absolute inset-0 bg-white transition-transform duration-300 origin-left ${isAdding ? 'scale-x-100' : 'scale-x-0'
                        }`}
                    />
                    <span className={`relative z-10 flex items-center justify-center gap-2 ${isAdding ? 'text-black font-bold' : ''}`}>
                      {isAdding ? (
                        <span className="animate-scale-in">✓</span>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          <span className="tracking-[0.15em] font-bold">ADD</span>
                        </>
                      )}
                    </span>
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="btn-outline flex-1"
                  >
                    <span>Buy It Now</span>
                  </button>
                </div>
              )}
            </div>

            {/* Trust Strip */}
            <div className="trust-strip flex-wrap" aria-label="Purchase assurances">
              <div className="trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                Secure Checkout
              </div>
              <div className="trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                Free Shipping ₹999+
              </div>
              <div className="trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                7-Day Easy Returns
              </div>
              <div className="trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                Ships in 24 Hours
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-900 my-4"></div>

          {/* Description Summary (SEO chips removed) */}
          {(() => {
            const desc = product.description || '';
            const hasTags = desc.includes('\n\nTags: ');
            const cleanDesc = hasTags ? desc.split('\n\nTags: ')[0] : desc;

            return (
              <div className="space-y-4">
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed whitespace-pre-line">{cleanDesc}</p>
              </div>
            );
          })()}

          {/* Accordion — Details / Shipping / Returns */}
          <div className="pt-6 border-t border-brand-graphite space-y-0" role="list" aria-label="Product information">
            {(
              [
                {
                  id: 'details' as const,
                  label: 'Product Specs',
                  content: (
                    <ul className="space-y-2.5 text-brand-stone text-xs leading-relaxed">
                      <li className="flex items-start gap-2"><span className="text-brand-amber mt-0.5" aria-hidden="true">◆</span>Oversized, drop-shoulder streetwear fit</li>
                      <li className="flex items-start gap-2"><span className="text-brand-amber mt-0.5" aria-hidden="true">◆</span>Curated heavyweight organic knit fabrics</li>
                      <li className="flex items-start gap-2"><span className="text-brand-amber mt-0.5" aria-hidden="true">◆</span>High-density graphics / puff print details</li>
                      <li className="flex items-start gap-2"><span className="text-brand-amber mt-0.5" aria-hidden="true">◆</span>Double-stitched seams for shape retention</li>
                      <li className="flex items-start gap-2"><span className="text-brand-amber mt-0.5" aria-hidden="true">◆</span>Pre-shrunk and silicone softened</li>
                    </ul>
                  )
                },
                {
                  id: 'shipping' as const,
                  label: 'Shipping Info',
                  content: (
                    <p className="text-brand-stone text-xs leading-relaxed">
                      Express delivery across India. Orders processed in Bengaluru within 24 hours.
                      Estimated delivery: 2–3 days for Southern India / Metro Cities,
                      4–6 days for rest of India. <strong className="text-brand-offwhite">Free shipping above ₹999.</strong>
                    </p>
                  )
                },
                {
                  id: 'returns' as const,
                  label: 'Returns & Exchanges',
                  content: (
                    <p className="text-brand-stone text-xs leading-relaxed">
                      Easy 7-day returns & size exchange policy. Products must be returned in
                      original condition with swing tags attached. WhatsApp us at
                      <a href="tel:+917406164512" className="text-brand-amber ml-1 hover:underline">+91 74061 64512</a> to register returns.
                    </p>
                  )
                },
              ]
            ).map(({ id, label, content }) => (
              <div key={id} role="listitem">
                <button
                  onClick={() => setActiveTab(activeTab === id ? '' : (id as 'details' | 'shipping' | 'returns'))}
                  className={`accordion-trigger ${activeTab === id ? 'open' : ''}`}
                  aria-expanded={activeTab === id}
                  aria-controls={`accordion-${id}`}
                  id={`accordion-trigger-${id}`}
                >
                  {label}
                  <svg
                    className="accordion-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                  </svg>
                </button>
                <div
                  id={`accordion-${id}`}
                  role="region"
                  aria-labelledby={`accordion-trigger-${id}`}
                  className={`accordion-content ${activeTab === id ? 'open' : ''}`}
                >
                  <div className="py-4 pr-6">{content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related Products Grid */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-brand-graphite pt-16" aria-labelledby="related-heading">
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-2">
              <span className="eyebrow">You May Also Like</span>
              <h2 id="related-heading" className="text-xl md:text-2xl font-bold uppercase tracking-wide text-brand-offwhite font-display">
                Related Drops
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-[10px] font-bold text-brand-stone hover:text-brand-offwhite uppercase tracking-[0.2em] transition-colors border-animate pb-0.5"
              aria-label="Browse all products in the shop"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[8px] md:gap-5">
            {relatedProducts.map((p) => {
              const isOutOfStock = p.sizes.every((s) => (p.stock_quantity[s] || 0) === 0);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-10%' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="w-full"
                >
                  <Link
                    href={`/shop/${p.slug}`}
                    className="group flex flex-col product-card text-left"
                    aria-label={`View ${p.name} — ₹${(p.price / 100).toLocaleString('en-IN')}`}
                  >
                    <motion.div
                      whileTap={{ scale: 0.97, filter: 'brightness(1.08)' }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col w-full text-left"
                    >
                      {/* Image Container */}
                      <div className="relative overflow-hidden rounded-xl bg-brand-charcoal aspect-[4/5] w-full border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
                        <NextImage
                          src={getOptimizedImageUrl(p.images[0], 800) || 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600'}
                          alt={`${p.name} — ${p.category} by DRFTN Clothing`}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover transition-transform duration-[750ms] ease-out group-hover:scale-[1.01]"
                        />
                        {/* Bottom Gradient Legibility Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />

                        {/* Outlined sold out/sale tag badges */}
                        {isOutOfStock ? (
                          <div className="absolute top-3.5 left-3.5 z-20 border border-white/10 text-white/50 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-[2px]">
                            <span className="text-[9px] font-mono font-bold tracking-widest uppercase">
                              GONE
                            </span>
                          </div>
                        ) : p.compare_price && p.compare_price > p.price ? (
                          <div className="absolute top-3.5 left-3.5 z-20 border border-white/20 text-white/95 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-[2px]">
                            <span className="text-[9px] font-mono font-bold tracking-widest uppercase">
                              SALE
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* Details Block */}
                      <div className="pt-3 pb-1 flex flex-col text-left space-y-1">
                        <p className="text-[9px] text-brand-stone uppercase tracking-[0.2em] font-semibold">
                          {p.category}
                        </p>
                        <h3 className="text-xs font-semibold text-brand-offwhite tracking-wide uppercase line-clamp-1 group-hover:text-white transition-colors duration-200 font-body">
                          {p.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-brand-offwhite font-body">
                            ₹{(p.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                          </span>
                          {p.compare_price && p.compare_price > p.price && (
                            <>
                              <span className="text-[10px] text-brand-stone line-through font-body">
                                ₹{(p.compare_price / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                              </span>
                              <span className="text-[10px] font-mono text-white/50 tracking-wider">
                                -{Math.round(((p.compare_price - p.price) / p.compare_price) * 100)}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* SIZING CHART DIALOG */}
      {sizeChartOpen && (
        <>
          <div
            onClick={() => setSizeChartOpen(false)}
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm transition-opacity"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-lg w-[90%] z-50 bg-brand-black border border-zinc-900 rounded-md p-6 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-offwhite flex items-center gap-2">
                <Ruler className="w-4 h-4 text-white/60" />
                STREETWEAR SIZING CHART
              </h3>
              <button
                onClick={() => setSizeChartOpen(false)}
                className="text-zinc-500 hover:text-brand-offwhite transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-400 border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-brand-offwhite uppercase tracking-wider font-extrabold bg-zinc-950">
                    <th className="p-3">SIZE</th>
                    <th className="p-3">CHEST (INCHES)</th>
                    <th className="p-3">LENGTH (INCHES)</th>
                    <th className="p-3">SLEEVE (INCHES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  <tr className="hover:bg-zinc-950/40">
                    <td className="p-3 font-bold text-brand-offwhite">XS</td>
                    <td className="p-3">40&quot;</td>
                    <td className="p-3">26&quot;</td>
                    <td className="p-3">8&quot;</td>
                  </tr>
                  <tr className="hover:bg-zinc-950/40">
                    <td className="p-3 font-bold text-brand-offwhite">S</td>
                    <td className="p-3">42&quot;</td>
                    <td className="p-3">27&quot;</td>
                    <td className="p-3">8.5&quot;</td>
                  </tr>
                  <tr className="hover:bg-zinc-950/40 bg-zinc-950/20">
                    <td className="p-3 font-bold text-brand-offwhite">M</td>
                    <td className="p-3">44&quot;</td>
                    <td className="p-3">28&quot;</td>
                    <td className="p-3">9&quot;</td>
                  </tr>
                  <tr className="hover:bg-zinc-950/40">
                    <td className="p-3 font-bold text-brand-offwhite">L</td>
                    <td className="p-3">46&quot;</td>
                    <td className="p-3">29&quot;</td>
                    <td className="p-3">9.5&quot;</td>
                  </tr>
                  <tr className="hover:bg-zinc-950/40">
                    <td className="p-3 font-bold text-brand-offwhite">XL</td>
                    <td className="p-3">48&quot;</td>
                    <td className="p-3">30&quot;</td>
                    <td className="p-3">10&quot;</td>
                  </tr>
                  <tr className="hover:bg-zinc-950/40 bg-zinc-950/20">
                    <td className="p-3 font-bold text-brand-offwhite">XXL</td>
                    <td className="p-3">50&quot;</td>
                    <td className="p-3">31&quot;</td>
                    <td className="p-3">10.5&quot;</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-zinc-600 mt-6 leading-relaxed bg-zinc-950 p-3 rounded">
              * Note: Our garments are designed with a modern oversized/boxy drop shoulder silhouette. If you prefer a standard fit, we recommend ordering one size down from your usual choice.
            </p>
          </div>
        </>
      )}
      {/* Sticky Bottom Add-To-Bag Bar (Mobile Only) */}
      {product && (
        <div
          className={`fixed bottom-0 inset-x-0 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-zinc-900/60 px-6 py-4.5 flex items-center justify-between z-50 md:hidden transition-transform duration-300 ${
            showStickyBar ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider truncate max-w-[150px]">{product.name}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-white">₹{Math.round(product.price / 100).toLocaleString('en-IN')}</span>
              {selectedSize && (
                <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {selectedSize}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isAdding || isCompletelyOutOfStock}
            className="bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 disabled:cursor-not-allowed text-[10px] font-bold tracking-widest uppercase py-3 px-6 transition-all flex items-center gap-1.5"
          >
            {isCompletelyOutOfStock ? (
              'OUT OF STOCK'
            ) : isAdding ? (
              'ADDING...'
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>ADD TO BAG</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
