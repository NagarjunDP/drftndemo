import { NextResponse } from 'next/server';
import { cleanupExpiredOrders } from '@/lib/orderCleanup';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await cleanupExpiredOrders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('API cleanupExpiredOrders error:', error);
    return NextResponse.json({ error: 'Internal server error occurred' }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
