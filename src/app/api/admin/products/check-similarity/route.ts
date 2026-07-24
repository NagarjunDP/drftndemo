import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ matched: false });
    }

    const result = await dbService.checkProductSimilarity(name);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Check similarity API error:', error);
    return NextResponse.json({ matched: false }, { status: 500 });
  }
}
