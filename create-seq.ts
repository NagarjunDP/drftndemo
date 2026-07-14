import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000 INCREMENT 1`);
  const result = await db.execute(sql`SELECT nextval('order_number_seq')::int AS seq`);
  console.log('Sequence created and verified. Next value:', (result.rows[0] as any).seq);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
