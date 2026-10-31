import * as schema from '../src/db/schema';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually to load DATABASE_URL before importing the DB client
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

async function seed() {
  console.log('Seeding database...');
  
  // Dynamically import db so it executes after env variables are set
  const { db } = await import('../src/db');

  try {
    // 1. Clear existing data
    console.log('Clearing old records...');
    await db.delete(schema.contactMessages);
    await db.delete(schema.settings);
    await db.delete(schema.discountCodes);
    await db.delete(schema.orders);
    await db.delete(schema.products);
    await db.delete(schema.categories);

    // 2. Insert Categories
    console.log('Seeding categories...');
    const seededCategories = await db.insert(schema.categories).values([
      {
        name: 'T shirts',
        slug: 't-shirts',
        image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
        is_active: true,
        display_order: 1,
      },
      {
        name: 'Shirts',
        slug: 'shirts',
        image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
        is_active: true,
        display_order: 2,
      },
      {
        name: 'Denims',
        slug: 'denims',
        image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=80',
        is_active: true,
        display_order: 3,
      },
      {
        name: 'Formal pants',
        slug: 'formal-pants',
        image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
        is_active: true,
        display_order: 4,
      },
      {
        name: 'Sweatshirt',
        slug: 'sweatshirts',
        image_url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop&q=80',
        is_active: true,
        display_order: 5,
      },
      {
        name: 'Hoodies',
        slug: 'hoodies',
        image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=80',
        is_active: true,
        display_order: 6,
      },
      {
        name: 'Jackets',
        slug: 'jackets',
        image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80',
        is_active: true,
        display_order: 7,
      },
    ]).returning();

    console.log(`Seeded ${seededCategories.length} categories.`);

    // 3. Insert Products
    console.log('Seeding products...');
    const seededProducts = await db.insert(schema.products).values([
      {
        name: 'Heavyweight Boxy Tee',
        slug: 'heavyweight-boxy-tee',
        description: '280 GSM heavyweight organic cotton tee. Features a premium boxy streetwear fit, reinforced crewneck ribbing, and wide shoulder drops. Soft-brushed finish for maximum comfort.',
        price: 89900,
        compare_price: 129900,
        category: 't-shirts',
        subcategory: 'boxy-fit-t-shirts',
        gender: 'unisex',
        images: [
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80'
        ],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        stock_quantity: { XS: 10, S: 15, M: 25, L: 20, XL: 10, XXL: 5 },
        is_featured: true,
        is_active: true,
      },
      {
        name: 'Waffle Knit Tee',
        slug: 'waffle-knit-tee',
        description: 'Heavyweight waffle texture weave tee with relaxed shoulders and breathable stitch pattern. Crafted for effortless daily wear.',
        price: 99900,
        compare_price: 139900,
        category: 't-shirts',
        subcategory: 'waffle-t-shirts',
        gender: 'unisex',
        images: [
          'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&auto=format&fit=crop&q=80'
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        stock_quantity: { S: 10, M: 15, L: 15, XL: 8 },
        is_featured: false,
        is_active: true,
      },
      {
        name: 'Imported Corduroy Shirt',
        slug: 'imported-corduroy-shirt',
        description: 'Premium import-quality corduroy button-down shirt with vintage oversized utility chest pockets and heavy metal snap buttons.',
        price: 129900,
        compare_price: 249900,
        category: 'shirts',
        subcategory: 'imp-shirts',
        gender: 'unisex',
        images: [
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&auto=format&fit=crop&q=80'
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        stock_quantity: { S: 12, M: 18, L: 14, XL: 8 },
        is_featured: false,
        is_active: true,
      },
      {
        name: 'Classic Linen Shirt',
        slug: 'classic-linen-shirt',
        description: 'Regular fit lightweight linen-cotton blend shirt for clean casual summer drops. High breathability structural weave.',
        price: 109900,
        compare_price: 199900,
        category: 'shirts',
        subcategory: 'regular-shirts',
        gender: 'unisex',
        images: [
          'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80'
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        stock_quantity: { S: 10, M: 12, L: 12, XL: 8 },
        is_featured: false,
        is_active: true,
      },
      {
        name: 'Relaxed Fit Denim Jeans',
        slug: 'relaxed-fit-denim-jeans',
        description: '14oz rigid raw indigo denim jeans with standard straight cut and signature minimal back pocket embroidery.',
        price: 129900,
        compare_price: 349900,
        category: 'denims',
        subcategory: 'regular-denims',
        gender: 'unisex',
        images: [
          'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80'
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        stock_quantity: { S: 8, M: 15, L: 12, XL: 6 },
        is_featured: false,
        is_active: true,
      },
      {
        name: 'Distressed Pattern Denim',
        slug: 'distressed-pattern-denim',
        description: 'Washed distressed pattern denim jeans featuring custom hand-repaired patches, sashiko stitching, and raw fringe cuffs.',
        price: 149900,
        compare_price: 399900,
        category: 'denims',
        subcategory: 'pattern-denims',
        gender: 'unisex',
        images: [
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=80'
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        stock_quantity: { S: 5, M: 8, L: 8, XL: 4 },
        is_featured: true,
        is_active: true,
      },
      {
        name: 'Structured Formal Trouser',
        slug: 'structured-formal-trouser',
        description: 'Heavy pleat structured wool-blend formal trousers with clean tapered leg lines, hidden fly closure, and sharp front creases.',
        price: 149900,
        compare_price: 299900,
        category: 'formal-pants',
        subcategory: null,
        gender: 'unisex',
        images: [
          'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&auto=format&fit=crop&q=80'
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        stock_quantity: { S: 6, M: 10, L: 10, XL: 5 },
        is_featured: false,
        is_active: true,
      },
      {
        name: 'Polo Collar Sweatshirt',
        slug: 'polo-collar-sweatshirt',
        description: 'Premium French Terry polo neck sweatshirt with high-density brand patch chest logo, heavy ribbed cuffs, and soft inner lining.',
        price: 179900,
        compare_price: 229900,
        category: 'sweatshirts',
        subcategory: 'polo-sweatshirts',
        gender: 'unisex',
        images: [
          'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=80'
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        stock_quantity: { S: 8, M: 12, L: 12, XL: 6 },
        is_featured: false,
        is_active: true,
      },
      {
        name: 'Heavy Pullover Hoodie',
        slug: 'heavy-pullover-hoodie',
        description: 'Double-lined premium 450 GSM boxy pullover hoodie. Features loopback knit cotton drape with zero drawcords for a clean drop shape.',
        price: 149900,
        compare_price: 269900,
        category: 'hoodies',
        subcategory: null,
        gender: 'unisex',
        images: [
          'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop&q=80'
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        stock_quantity: { S: 10, M: 15, L: 15, XL: 8 },
        is_featured: true,
        is_active: true,
      },
      {
        name: 'Leather Biker Jacket',
        slug: 'leather-biker-jacket',
        description: 'Heavy grade distressed real sheepskin leather jacket with silver zipper accents, coin pouch pockets, and custom campaign satin lining.',
        price: 200000,
        compare_price: 799900,
        category: 'jackets',
        subcategory: 'biker-jackets',
        gender: 'unisex',
        images: [
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=80'
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        stock_quantity: { S: 5, M: 8, L: 8, XL: 4 },
        is_featured: true,
        is_active: true,
      },
    ]).returning();

    console.log(`Seeded ${seededProducts.length} products.`);

    // 4. Insert Discount Code
    console.log('Seeding discount codes...');
    const seededDiscounts = await db.insert(schema.discountCodes).values([
      {
        code: 'DRFTN10',
        discount_type: 'percent',
        discount_value: 10, // 10%
        min_order_value: 99900, // ₹999 min order in paise
        usage_limit: null,
        used_count: 0,
        is_active: true,
      },
    ]).returning();

    console.log(`Seeded ${seededDiscounts.length} discount codes.`);

    // 5. Insert Settings
    console.log('Seeding store settings...');
    await db.insert(schema.settings).values([
      { key: 'free_shipping_threshold', value: '99900' },
      { key: 'default_shipping_charge', value: '9900' },
      { key: 'cod_fee', value: '5000' },
      { key: 'store_whatsapp', value: '+917406164512' },
    ]);

    console.log('Store settings seeded.');
    console.log('Database seeding successfully finished!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
