import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    cookies().delete('drftn_session');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout API Route Error:', error);
    return NextResponse.json({ error: 'Internal server error occurred' }, { status: 500 });
  }
}
