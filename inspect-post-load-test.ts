import { db } from './src/db/index';
import * as schema from './src/db/schema';
import { eq, like } from 'drizzle-orm';
import { redis } from './src/lib/redis';

const PRODUCT_ID = 'dd82dff7-1b47-4bb4-9c68-288f04ae73e5';
const SIZE = 'M';

async function main() {
  const redisKey = `stock:${PRODUCT_ID}:${SIZE}`;
  const [product] = await db.select().from(schema.products).where(eq(schema.products.id, PRODUCT_ID)).limit(1);
  const redisStock = await redis.get(redisKey);
  const pgStock = (product?.stock_quantity as any)?.[SIZE] ?? 'unknown';
  const allTestOrders = await db.select().from(schema.orders).where(like(schema.orders.customer_email, 'test-user-%@example.com'));

  console.log('--- Post Load Test State ---');
  console.log(`Redis stock ${SIZE}: ${redisStock}`);
  console.log(`Postgres stock ${SIZE}: ${pgStock}`);
  console.log(`Test orders created: ${allTestOrders.length}`);
  for (const o of allTestOrders) {
    console.log(`Order: ${o.order_number}, Email: ${o.customer_email}, Status: ${o.payment_status}`);
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
