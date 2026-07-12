import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/jwt';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
    }

    // 1. Get authenticated user ID
    let userId: string | null = null;
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('drftn_session')?.value;

    if (sessionToken) {
      const payload = await verifyToken(sessionToken);
      if (payload && payload.userId) {
        userId = payload.userId as string;
      }
    }

    if (!userId) {
      const clerkAuth = await auth();
      if (clerkAuth.userId) {
        userId = clerkAuth.userId;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Security: Rate limiting to prevent spamming updates
    // Limit to 5 updates per 1 minute per user
    const rateLimitResult = await rateLimit(`profile-update:${userId}`, 5, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json({
        error: `Too many profile updates. Please wait ${rateLimitResult.reset} seconds.`,
      }, { status: 429 });
    }

    // 3. Update name in database
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        name: name.trim(),
      })
      .where(eq(schema.users.id, userId))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update profile API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
