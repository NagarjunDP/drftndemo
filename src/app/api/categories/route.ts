import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.is_active, true))
      .orderBy(asc(schema.categories.display_order));

    return NextResponse.json(
      { categories },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    console.error('Public categories GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
