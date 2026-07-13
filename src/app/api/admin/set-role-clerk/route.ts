import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await clerkClient();
    const emailsToPromote = ['nagarjundp256@gmail.com', 'drftnclothing@gmail.com'];
    const results: any[] = [];

    for (const email of emailsToPromote) {
      console.log(`[Clerk Promo] Searching for user with email: ${email}`);
      
      const response = await client.users.getUserList({
        emailAddress: [email],
        limit: 1,
      });

      const users = response.data || response; // Handle different return shapes in Clerk versions
      const user = Array.isArray(users) ? users[0] : null;

      if (!user) {
        results.push({ email, status: 'Not Found', message: 'No user registered under this email in Clerk.' });
        continue;
      }

      console.log(`[Clerk Promo] Found user ${user.id} for email ${email}. Promoting to admin...`);

      // Update publicMetadata to set role as admin
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          role: 'admin'
        }
      });

      results.push({
        email,
        status: 'Success',
        clerkUserId: user.id,
        message: 'Public metadata updated successfully: { role: "admin" }'
      });
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('[Clerk Promo Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred',
      stack: error.stack
    }, { status: 500 });
  }
}
