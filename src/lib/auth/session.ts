/**
 * Edge-runtime-compatible auth utilities (uses Web Crypto API).
 * Safe to import in middleware.ts.
 */

export const COOKIE_NAME = 'wc_session';
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function base64urlDecode(s: string): Uint8Array {
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getVerifyKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/**
 * Verifies a session token and returns the username on success, or null if
 * the token is missing, tampered with, or expired.
 */
export async function verifyToken(token: string): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;

  const encodedPayload = token.slice(0, dot);
  const encodedSig = token.slice(dot + 1);

  let payload: string;
  let sigBytes: Uint8Array;
  try {
    payload = new TextDecoder().decode(base64urlDecode(encodedPayload));
    sigBytes = base64urlDecode(encodedSig);
  } catch {
    return null;
  }

  const key = await getVerifyKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(payload)
  );
  if (!valid) return null;

  // Payload format: "username:issuedAtMs"
  const colonIdx = payload.lastIndexOf(':');
  if (colonIdx === -1) return null;
  const username = payload.slice(0, colonIdx);
  const issuedAt = parseInt(payload.slice(colonIdx + 1), 10);
  if (isNaN(issuedAt) || Date.now() - issuedAt > EXPIRY_MS) return null;

  return username;
}
