import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

// Cache products for 60s at the CDN/edge — products don't change on every request.
// Admin mutations should call revalidatePath('/') / revalidateTag to bust this.
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const product = await dbService.getProductBySlug(slug);
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json(
        { product },
        {
          headers: {
            // Cache individual product responses for 60s, stale-while-revalidate for 5min
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        }
      );
    }

    const products = await dbService.getProducts();
    return NextResponse.json(
      { products },
      {
        headers: {
          // Cache product list for 60s, serve stale for up to 1h while revalidating
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    console.error('Public products GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
