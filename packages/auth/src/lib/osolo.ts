import { sha256 } from '@oslojs/crypto/sha2';
import { base32, base32hex } from 'rfc4648';

// Hex encoding: Produces a lower-case hexadecimal string.
export function encodeHexLowerCase(data: Uint8Array): string {
  return base32hex.stringify(data).toLowerCase();
}

// Base32 encoding: Produces a lower-case string with no padding.
export function encodeBase32LowerCaseNoPadding(data: Uint8Array): string {
  // rfc4648 by default may produce uppercase output,
  // so we convert it to lower-case and disable padding.
  return base32.stringify(data, { pad: false }).toLowerCase();
}

export const generateSessionId = (token: string): string => {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  return sessionId;
};

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}
