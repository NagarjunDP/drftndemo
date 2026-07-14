import { db } from './src/db/index.js';
import * as schema from './src/db/schema.js';

import { sql } from 'drizzle-orm';

async function main() {
  const products = await db.select().from(schema.products);
  console.log(JSON.stringify(products.map((p: any) => ({
    id: p.id,
    name: p.name,
    stock: p.stock_quantity,
    is_active: p.is_active
  })), null, 2));
  process.exit(0);
}
main();
