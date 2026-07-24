import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { adminProductSchema } from '@/lib/validations';

/**
 * GET /api/admin/products
 * Fetch all products (including inactive products) with exact stock levels
 */
export async function GET() {
  try {
    const products = await dbService.getAllProducts();
    return NextResponse.json({ products: products || [] });
  } catch (error) {
    console.error('Admin products GET exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/products
 * Create a new product with full fields validation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request schema
    const validationResult = adminProductSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Admin product creation validation error:', JSON.stringify(validationResult.error.format()));
      const firstIssue = validationResult.error.issues[0]?.message || 'Invalid product details';
      return NextResponse.json(
        { error: firstIssue, details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Create product via dbService
    const newProduct = await dbService.createProduct(validationResult.data as any);

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error('Admin products POST exception:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/products
 * Update existing product fields
 */
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    // Check if bulk weight update
    if (!id && body.ids && Array.isArray(body.ids) && body.weight_grams !== undefined) {
      const { db } = await import('@/db');
      const schema = await import('@/db/schema');
      const { inArray } = await import('drizzle-orm');

      const weightVal = Number(body.weight_grams);
      if (isNaN(weightVal) || weightVal <= 0) {
        return NextResponse.json({ error: 'Invalid weight value' }, { status: 400 });
      }

      await db
        .update(schema.products)
        .set({
          weight_grams: weightVal,
          updated_at: new Date(),
        })
        .where(inArray(schema.products.id, body.ids));

      return NextResponse.json({ success: true, count: body.ids.length });
    }

    if (!id) {
      return NextResponse.json({ error: 'Product ID parameter is required' }, { status: 400 });
    }
    
    // Partial validation of incoming edits
    const partialProductSchema = adminProductSchema.partial();
    const validationResult = partialProductSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Admin product patch validation error:', JSON.stringify(validationResult.error.format()));
      const firstIssue = validationResult.error.issues[0]?.message || 'Invalid update inputs';
      return NextResponse.json(
        { error: firstIssue, details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Update product via dbService
    const updatedProduct = await dbService.updateProduct(id, validationResult.data as any);

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error('Admin products PATCH exception:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/products
 * Delete product by ID
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID parameter is required' }, { status: 400 });
    }

    const success = await dbService.deleteProduct(id);
    if (!success) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin products DELETE exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
