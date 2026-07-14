import { db } from './src/db/index';
import * as schema from './src/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from './src/lib/redis';

async function main() {
  const productId = 'dd82dff7-1b47-4bb4-9c68-288f04ae73e5'; // Washed Crewneck Tee
  const size = 'M';
  const targetStock = 10;

  console.log('Seeding stock for test product...');

  // 1. Fetch current product
  const [product] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, productId))
    .limit(1);

  if (!product) {
    console.error('Test product not found!');
    process.exit(1);
  }

  // 2. Update stock in Postgres
  const newStock = { ...product.stock_quantity };
  newStock[size] = targetStock;
  
  await db
    .update(schema.products)
    .set({ stock_quantity: newStock })
    .where(eq(schema.products.id, productId));

  console.log(`Updated Postgres stock for size ${size} to ${targetStock}`);

  // 3. Update stock in Redis
  const redisKey = `stock:${productId}:${size}`;
  await redis.set(redisKey, targetStock);
  console.log(`Updated Redis key ${redisKey} to ${targetStock}`);

  // 4. Clear any old idempotency flags and rate limit keys
  const keys = await redis.keys('idem:*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`Cleared ${keys.length} idempotency keys from Redis`);
  }

  const ratelimitKeys = await redis.keys('ratelimit:*');
  if (ratelimitKeys.length > 0) {
    await redis.del(...ratelimitKeys);
    console.log(`Cleared ${ratelimitKeys.length} rate limit keys from Redis`);
  }

  console.log('Seeding complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error seeding test stock:', err);
  process.exit(1);
});
