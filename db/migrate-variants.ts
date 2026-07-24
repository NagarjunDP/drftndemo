import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

import { db } from '../src/db';
import * as schema from '../src/db/schema';
import { sql, eq } from 'drizzle-orm';

const COMMON_COLOURS: Record<string, string> = {
  black: '#000000',
  onyx: '#0F0F0F',
  charcoal: '#333333',
  white: '#FFFFFF',
  offwhite: '#FAF9F6',
  cream: '#FFFDD0',
  grey: '#808080',
  gray: '#808080',
  slate: '#708090',
  olive: '#556B2F',
  sage: '#9CAF88',
  navy: '#000080',
  blue: '#0000FF',
  red: '#FF0000',
  crimson: '#DC143C',
  pink: '#FFC0CB',
  beige: '#F5F5DC',
  brown: '#964B00',
  tan: '#D2B48C',
  green: '#008000',
  purple: '#800080',
  lavender: '#E6E6FA',
  yellow: '#FFFF00',
  mustard: '#FFDB58',
  orange: '#FFA500',
  rust: '#B7410E',
};

function extractColour(name: string): { colourName: string; colourHex: string } {
  const lower = name.toLowerCase();
  for (const [col, hex] of Object.entries(COMMON_COLOURS)) {
    const regex = new RegExp(`\\b${col}\\b`, 'i');
    if (regex.test(lower)) {
      const capitalized = col.charAt(0).toUpperCase() + col.slice(1);
      return { colourName: capitalized, colourHex: hex };
    }
  }
  return { colourName: 'Standard', colourHex: '#18181B' };
}

async function runMigration() {
  console.log('🚀 Starting Product Variants & pg_trgm Migration...');

  // 1. Enable pg_trgm extension
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    console.log('✅ pg_trgm extension enabled.');
  } catch (err: any) {
    console.warn('⚠️ Could not enable pg_trgm extension (will fall back to js trigram/levenshtein matching):', err?.message || err);
  }

  // 2. Ensure product_variants table exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        colour_name TEXT NOT NULL,
        colour_hex TEXT,
        images TEXT[] NOT NULL DEFAULT '{}'::text[],
        sizes TEXT[] NOT NULL DEFAULT '{"XS", "S", "M", "L", "XL", "XXL"}'::text[],
        stock_quantity JSONB NOT NULL DEFAULT '{"XS": 0, "S": 0, "M": 0, "L": 0, "XL": 0, "XXL": 0}'::jsonb,
        stock_qty INTEGER NOT NULL DEFAULT 0,
        sku TEXT UNIQUE NOT NULL,
        price_override INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ product_variants table created/verified.');
  } catch (err) {
    console.error('❌ Failed to verify product_variants table:', err);
  }

  // 3. Migrate existing products
  const allProducts = await db.select().from(schema.products);
  console.log(`📦 Found ${allProducts.length} total products in database.`);

  const existingVariants = await db.select().from(schema.productVariants);
  const productsWithVariants = new Set(existingVariants.map((v: any) => v.product_id));

  let migratedCount = 0;
  let ambiguousCount = 0;

  for (const prod of allProducts) {
    if (productsWithVariants.has(prod.id)) {
      continue;
    }

    const { colourName, colourHex } = extractColour(prod.name);
    const stockMap = (prod.stock_quantity as Record<string, number>) || {};
    const totalStock = Object.values(stockMap).reduce((a: number, b: any) => a + Number(b || 0), 0);
    const cleanSlug = prod.slug.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const sku = `DRFTN-${cleanSlug.slice(0, 10)}-${colourName.toUpperCase()}`;

    let prodImgs = prod.images || [];
    if (!prodImgs || prodImgs.length === 0) {
      const dbImgs = await db.select().from(schema.productImages).where(eq(schema.productImages.product_id, prod.id));
      prodImgs = dbImgs.map((i: any) => i.image_url);
    }

    try {
      await db.insert(schema.productVariants).values({
        product_id: prod.id,
        colour_name: colourName,
        colour_hex: colourHex,
        images: prodImgs,
        sizes: prod.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        stock_quantity: stockMap,
        stock_qty: totalStock,
        sku,
        price_override: null,
        is_active: prod.is_active,
      });
      migratedCount++;
    } catch (insertErr: any) {
      if (insertErr?.code === '23505') {
        const fallbackSku = `${sku}-${Math.floor(1000 + Math.random() * 9000)}`;
        await db.insert(schema.productVariants).values({
          product_id: prod.id,
          colour_name: colourName,
          colour_hex: colourHex,
          images: prodImgs,
          sizes: prod.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          stock_quantity: stockMap,
          stock_qty: totalStock,
          sku: fallbackSku,
          price_override: null,
          is_active: prod.is_active,
        });
        migratedCount++;
      } else {
        console.error(`⚠️ Could not migrate product ID ${prod.id} ("${prod.name}"):`, insertErr?.message);
        ambiguousCount++;
      }
    }
  }

  console.log(`\n🎉 Migration Complete!`);
  console.log(`   - Migrated Products into Variants: ${migratedCount}`);
  console.log(`   - Flagged for Manual Review: ${ambiguousCount}`);
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
