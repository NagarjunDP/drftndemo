import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Basic UUID validation
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  try {
    // Batch-read all size keys in a single pipeline
    const keys = SIZES.map((s) => `stock:${id}:${s}`);
    const values = await redis.mget<(string | null)[]>(...keys);

    const stock: Record<string, number> = {};
    SIZES.forEach((size, idx) => {
      const val = values[idx];
      if (val !== null) {
        stock[size] = Math.max(0, Number(val));
      }
    });

    return NextResponse.json(
      { stock },
      {
        headers: {
          // Allow client to cache for up to 5 seconds, stale-while-revalidate 10s
          'Cache-Control': 'public, max-age=5, stale-while-revalidate=10',
        },
      }
    );
  } catch (err) {
    console.error('[Stock API] Redis read failed:', err);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}
