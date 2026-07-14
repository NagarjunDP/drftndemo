import { redis } from './redis';

const CLAIM_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current > 0 then
  return redis.call('DECR', KEYS[1])
else
  return -1
end
`;

export async function tryClaimUnit(productId: string, size: string): Promise<boolean> {
  const key = `stock:${productId}:${size}`;
  const result = await redis.eval(CLAIM_SCRIPT, [key], []);
  return typeof result === 'number' && result >= 0;
}

export async function releaseUnit(productId: string, size: string): Promise<void> {
  const key = `stock:${productId}:${size}`;
  await redis.incr(key);
}

export async function tryClaimUnitSafe(productId: string, size: string): Promise<boolean> {
  try {
    return await tryClaimUnit(productId, size);
  } catch (err) {
    console.error('Redis stock-gate claim failure (failing open):', err);
    return true; // fail open — let Postgres's own locking be the safety net
  }
}

export async function releaseUnitSafe(productId: string, size: string): Promise<void> {
  try {
    await releaseUnit(productId, size);
  } catch (err) {
    console.error('Redis stock-gate release failure:', err);
  }
}
