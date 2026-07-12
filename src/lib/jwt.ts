const secret = process.env.ADMIN_JWT_SECRET || 'drftn_default_jwt_secret_key_2026_fallback';

async function buildToken(payload: object, expSeconds: number): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const stringifiedPayload = JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expSeconds,
  });
  const encodedPayload = btoa(stringifiedPayload);
  const data = `${header}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const encodedSignature = btoa(String.fromCharCode(...Array.from(new Uint8Array(signature))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${data}.${encodedSignature}`;
}

/** 30-day session token for authenticated users. */
export async function signToken(payload: { userId: string }): Promise<string> {
  return buildToken(payload, 30 * 24 * 60 * 60);
}

/** 15-minute temp token that encodes a verified phone for profile completion step. */
export async function signTempToken(payload: { phone: string; isTemp: true }): Promise<string> {
  return buildToken(payload, 15 * 60);
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const data = `${header}.${payload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    let base64 = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binStr = atob(base64);
    const sigBytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) sigBytes[i] = binStr.charCodeAt(i);

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
    if (!isValid) return null;

    let decBase64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (decBase64.length % 4) decBase64 += '=';
    const decodedPayload = JSON.parse(atob(decBase64));

    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return decodedPayload;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}
