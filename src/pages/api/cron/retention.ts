import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../../../server/env';
import { alertJobFailed } from '../../../server/mail';
import { purgeExpired } from '../../../server/retention';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

/**
 * Nightly at 02:00 in India (vercel.json "crons"): removes customer details
 * 24 months after the trip (src/server/retention.ts). Vercel calls it with
 * "Authorization: Bearer <CRON_SECRET>"; anything else is turned away, and
 * without CRON_SECRET set it never runs.
 */
export const GET: APIRoute = async ({ request }) => {
  const secret = env('CRON_SECRET');
  if (!secret) return json(503, { ok: false, error: 'CRON_SECRET is not set.' });
  const got = Buffer.from(request.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return json(401, { ok: false });
  try {
    const result = await purgeExpired();
    console.log('[retention]', JSON.stringify(result));
    return json(200, { ok: true, ...result });
  } catch (e) {
    await alertJobFailed('nightly clean-up of customer details', e);
    return json(500, { ok: false, error: 'The nightly clean-up failed. It runs again tomorrow.' });
  }
};
