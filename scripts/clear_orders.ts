import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

async function clearAllOrders() {
  try {
    const { db } = await import('@/db');
    const { orders } = await import('@/db/schema');
    const { count } = await import('drizzle-orm');

    // Count existing orders
    const [{ value: orderCount }] = await db.select({ value: count() }).from(orders);
    console.log(`Current total orders in DB: ${orderCount}`);

    if (orderCount > 0) {
      const deleted = await db.delete(orders).returning();
      console.log(`Successfully deleted ${deleted.length} orders from database.`);
    }

    // Verify current count
    const [{ value: finalCount }] = await db.select({ value: count() }).from(orders);
    console.log(`Verified total orders in DB: ${finalCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Failed to clear orders:', err);
    process.exit(1);
  }
}

clearAllOrders();
