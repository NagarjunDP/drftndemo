import { redis } from './redis';

// Atomic multi-unit claim: checks current >= requested, then decrements by requested in one round-trip.
// Returns the new stock value (>= 0) on success, or -1 if insufficient stock.
const CLAIM_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local requested = tonumber(ARGV[1])
if current >= requested then
  return redis.call('DECRBY', KEYS[1], requested)
else
  return -1
end
`;

export async function tryClaimUnit(productId: string, size: string, quantity: number = 1): Promise<boolean> {
  const key = `stock:${productId}:${size}`;
  const result = await redis.eval(CLAIM_SCRIPT, [key], [String(quantity)]);
  return typeof result === 'number' && result >= 0;
}

export async function releaseUnit(productId: string, size: string, quantity: number = 1): Promise<void> {
  const key = `stock:${productId}:${size}`;
  await redis.incrby(key, quantity);
}

export async function tryClaimUnitSafe(productId: string, size: string, quantity: number = 1): Promise<boolean> {
  try {
    return await tryClaimUnit(productId, size, quantity);
  } catch (err) {
    console.error('Redis stock-gate claim failure (failing open):', err);
    return true; // fail open — let Postgres's own locking be the safety net
  }
}

export async function releaseUnitSafe(productId: string, size: string, quantity: number = 1): Promise<void> {
  try {
    await releaseUnit(productId, size, quantity);
  } catch (err) {
    console.error('Redis stock-gate release failure:', err);
  }
}
