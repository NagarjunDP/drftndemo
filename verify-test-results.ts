import { db } from './src/db/index';
import * as schema from './src/db/schema';
import { eq, like, sql } from 'drizzle-orm';
import { redis } from './src/lib/redis';

async function main() {
  const productId = 'dd82dff7-1b47-4bb4-9c68-288f04ae73e5'; // Washed Crewneck Tee
  const size = 'M';

  console.log('Verifying load test results...');

  // 1. Fetch current stock in Postgres
  const [product] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, productId))
    .limit(1);

  const postgresStock = product?.stock_quantity?.[size] ?? null;

  // 2. Fetch current stock in Redis
  const redisKey = `stock:${productId}:${size}`;
  const redisStock = await redis.get(redisKey);

  // 3. Count test orders in Postgres
  const testOrders = await db
    .select({ count: sql`count(*)::int` })
    .from(schema.orders)
    .where(like(schema.orders.customer_email, 'test-user-%@example.com'));

  const orderCount = testOrders[0]?.count ?? 0;

  console.log('------------------------------');
  console.log(`Postgres stock for size ${size}: ${postgresStock}`);
  console.log(`Redis stock for size ${size}:    ${redisStock}`);
  console.log(`Total test orders created:   ${orderCount}`);
  console.log('------------------------------');

  if (postgresStock === 0 && Number(redisStock) === 0 && orderCount === 10) {
    console.log('SUCCESS: Exactly 10 units sold, no overselling occurred, stock matched in both DBs!');
  } else {
    console.log('WARNING: Results do not match expected outcomes.');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error verifying results:', err);
  process.exit(1);
});
