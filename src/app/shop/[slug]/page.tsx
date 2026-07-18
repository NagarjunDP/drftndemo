// Server component — generates per-product OG/Twitter metadata, renders client detail page
import type { Metadata } from 'next';
import { dbService } from '@/lib/db';
import { getOptimizedImageUrl } from '@/lib/cloudinary';
import ProductDetailClient from './_ProductDetailClient';

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
  // Use a 1200px-wide Cloudinary transformation for the OG image — crawlers
  // need an absolute URL so we rely on metadataBase set in layout.tsx.
  const ogImageUrl = rawImage
    ? getOptimizedImageUrl(rawImage, 1200)
    : '/og-default.jpg';

  const desc = product.description || '';
  const cleanDesc = desc.includes('\n\nTags: ')
    ? desc.split('\n\nTags: ')[0]
    : desc;
  // Keep description concise for preview cards
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
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 1600,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: ogDescription,
      images: [ogImageUrl],
    },
  };
}

export default function ProductDetailPage({ params }: Props) {
  return <ProductDetailClient params={params} />;
}
