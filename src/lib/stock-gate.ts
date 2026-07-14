import { redis } from './redis';

// Atomic multi-unit claim: checks current >= requested, then decrements by requested in one round-trip.
// Returns {1, new_stock} on success, or {0, current_stock} on failure.
const CLAIM_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local requested = tonumber(ARGV[1])
if current >= requested then
  local new_stock = redis.call('DECRBY', KEYS[1], requested)
  return {1, new_stock}
else
  return {0, current}
end
`;

export interface ClaimResult {
  success: boolean;
  stock: number;
}

export async function tryClaimUnit(productId: string, size: string, quantity: number = 1): Promise<ClaimResult> {
  const key = `stock:${productId}:${size}`;
  const result = await redis.eval(CLAIM_SCRIPT, [key], [String(quantity)]) as [number, number];
  return {
    success: result[0] === 1,
    stock: result[1]
  };
}

export async function releaseUnit(productId: string, size: string, quantity: number = 1): Promise<void> {
  const key = `stock:${productId}:${size}`;
  await redis.incrby(key, quantity);
}

export async function tryClaimUnitSafe(productId: string, size: string, quantity: number = 1): Promise<ClaimResult> {
  try {
    return await tryClaimUnit(productId, size, quantity);
  } catch (err) {
    console.error('Redis stock-gate claim failure (failing open):', err);
    return { success: true, stock: 999 }; // fail open — let Postgres's own locking be the safety net
  }
}

export async function releaseUnitSafe(productId: string, size: string, quantity: number = 1): Promise<void> {
  try {
    await releaseUnit(productId, size, quantity);
  } catch (err) {
    console.error('Redis stock-gate release failure:', err);
  }
}
