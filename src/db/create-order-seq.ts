import { db } from './index';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating order_number_seq sequence...');

  // Check how many orders already exist so the sequence starts at the right number
  const countRes = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM orders`);
  const existingCount = Number((countRes as any).rows?.[0]?.cnt ?? (countRes as any)[0]?.cnt ?? 0);
  const startAt = 1001 + existingCount;

  // Create the sequence, starting after all existing orders.
  // IF NOT EXISTS makes this safe to re-run at any time.
  await db.execute(sql`
    CREATE SEQUENCE IF NOT EXISTS order_number_seq
    START WITH ${sql.raw(String(startAt))}
    INCREMENT BY 1
    NO MAXVALUE
    NO CYCLE
  `);

  console.log(`✅ Sequence created. Starting at ${startAt} (${existingCount} existing orders).`);

  // Sanity check: call nextval once and show the result
  const testRes = await db.execute(sql`SELECT nextval('order_number_seq')::int AS next`);
  const nextVal = Number((testRes as any).rows?.[0]?.next ?? (testRes as any)[0]?.next);
  console.log(`   First nextval() = ${nextVal}  →  order number: DRFTN-${1000 + nextVal}`);

  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

