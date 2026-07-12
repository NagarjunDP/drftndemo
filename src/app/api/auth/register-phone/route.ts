import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken, signToken } from '@/lib/jwt';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { name, email, tempToken, notificationsOptIn: bodyNotifications } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!tempToken) {
      return NextResponse.json({ error: 'Verification session expired. Please verify your phone number again.' }, { status: 400 });
    }

    // 1. Verify temporary verification token
    const payload = (await verifyToken(tempToken)) as any;
    if (!payload || !payload.isTemp || !payload.phone) {
      return NextResponse.json({ error: 'Invalid or expired phone verification session.' }, { status: 400 });
    }

    const verifiedPhone = payload.phone;
    // Body value takes priority; fall back to token payload, then default true
    const notificationsOptIn = bodyNotifications !== undefined ? !!bodyNotifications : (payload.notificationsOptIn !== false);

    // 2. Validate email format if provided
    let cleanEmail = null;
    if (email && email.trim()) {
      cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return NextResponse.json({ error: 'Invalid email address format.' }, { status: 400 });
      }

      // Check if email already in use
      const [emailInUseUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, cleanEmail))
        .limit(1);

      if (emailInUseUser) {
        return NextResponse.json({ error: 'Email address is already linked to another account.' }, { status: 400 });
      }
    }

    // 3. Ensure phone is not already registered (edge case check)
    const [existingPhoneUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, verifiedPhone))
      .limit(1);

    if (existingPhoneUser) {
      // If user registered in parallel, just log them in
      const token = await signToken({ userId: existingPhoneUser.id });
      cookies().set('drftn_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      return NextResponse.json({
        success: true,
        user: existingPhoneUser,
        triggerPush: false,
      });
    }

    // 4. Create user in database
    const userId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;
    const [newUser] = await db
      .insert(schema.users)
      .values({
        id: userId,
        phone: verifiedPhone,
        phoneVerified: true,
        email: cleanEmail,
        emailVerified: false,
        name: name.trim(),
        notificationsOptIn,
        termsAcceptedAt: new Date(),
        authProvider: 'phone',
      })
      .returning();

    // 5. Sign custom session cookie
    const token = await signToken({ userId: newUser.id });
    cookies().set('drftn_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      triggerPush: notificationsOptIn,
    });
  } catch (error) {
    console.error('Register Phone User API Error:', error);
    return NextResponse.json({ error: 'An unexpected registration error occurred' }, { status: 500 });
  }
}
