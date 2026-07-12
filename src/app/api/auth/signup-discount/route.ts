import { NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if there is a signup discount code key in the settings table
    const [setting] = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'signup_discount_code'))
      .limit(1);

    const targetCode = setting?.value || 'DRFTN10';

    const [discount] = await db
      .select()
      .from(schema.discountCodes)
      .where(and(
        eq(schema.discountCodes.code, targetCode),
        eq(schema.discountCodes.is_active, true)
      ))
      .limit(1);

    if (!discount) {
      // Fallback details if code not found in DB
      return NextResponse.json({
        code: 'DRFTN10',
        value: 10,
        type: 'percent',
      });
    }

    return NextResponse.json({
      code: discount.code,
      value: Number(discount.discount_value),
      type: discount.discount_type,
    });
  } catch (error) {
    console.error('Signup Discount API Error:', error);
    return NextResponse.json({
      code: 'DRFTN10',
      value: 10,
      type: 'percent',
    });
  }
}
