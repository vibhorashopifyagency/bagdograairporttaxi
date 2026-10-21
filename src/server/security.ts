import { createHash, createHmac, randomInt } from 'node:crypto';
import { requireEnv } from './env';

/** The caller's IP as Vercel reports it. Only ever stored hashed. */
export function clientIp(request: Request): string {
  const h = request.headers;
  return (h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? '').trim() || 'unknown';
}

/** A keyed hash of the IP: good for counting requests, useless for finding a person. */
export function ipHash(request: Request): string {
  return createHmac('sha256', requireEnv('BETTER_AUTH_SECRET')).update(clientIp(request)).digest('hex').slice(0, 32);
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Letters and digits that cannot be confused when read aloud or typed: no 0/O, 1/I/L. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
