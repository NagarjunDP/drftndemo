// Server component — fetches product data at render time (SSR)
// so the client sees HTML with data already embedded — zero loading state.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dbService } from '@/lib/db';
import { getOptimizedImageUrl } from '@/lib/cloudinary';
import ProductDetailClient from './_ProductDetailClient';
import { Product } from '@/types';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await dbService.getProductBySlug(params.slug);

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'This product could not be found.',
    };
  }

  const priceFormatted = `₹${Math.round(product.price / 100).toLocaleString('en-IN')}`;
  const rawImage = product.images[0] ?? '';
  const ogImageUrl = rawImage ? getOptimizedImageUrl(rawImage, 1200) : '/og-default.jpg';

  const desc = product.description || '';
  const cleanDesc = desc.includes('\n\nTags: ') ? desc.split('\n\nTags: ')[0] : desc;
  const ogDescription = `${priceFormatted} — ${cleanDesc.slice(0, 120).trim()}${cleanDesc.length > 120 ? '…' : ''}`;
  const title = product.name;
  const pageUrl = `https://www.drftnclothing.in/shop/${product.slug}`;

  return {
    title,
    description: ogDescription,
    openGraph: {
      title,
      description: ogDescription,
      url: pageUrl,
      type: 'website',
      siteName: 'DRFTN CLOTHING',
      images: [{ url: ogImageUrl, width: 1200, height: 1600, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: ogDescription,
      images: [ogImageUrl],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  // Fetch product + all products in PARALLEL on the server.
  // This runs during SSR — the browser receives fully-rendered HTML,
  // no loading state, no client-side fetch waterfall.
  const [product, allProducts] = await Promise.all([
    dbService.getProductBySlug(params.slug),
    dbService.getProducts(),
  ]);

  if (!product) {
    notFound();
  }

  // Compute related products server-side
  const relatedProducts: Product[] = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <ProductDetailClient
      params={params}
      initialProduct={product}
      initialRelatedProducts={relatedProducts}
    />
  );
}
