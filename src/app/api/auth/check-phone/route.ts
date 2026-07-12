import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function formatPhoneToDatabase(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `+91${clean}`;
  }
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+${clean}`;
  }
  return `+${clean}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Phone parameter is required' }, { status: 400 });
    }

    const formattedPhone = formatPhoneToDatabase(phone);

    const [dbUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, formattedPhone))
      .limit(1);

    if (dbUser) {
      return NextResponse.json({
        exists: true,
        name: dbUser.name,
      });
    }

    return NextResponse.json({
      exists: false,
    });
  } catch (error) {
    console.error('Check Phone API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
