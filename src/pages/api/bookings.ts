import type { APIRoute } from 'astro';
import { bookingInput, saveBooking } from '../../server/bookings';
import { LIMITS, rateLimit } from '../../server/rate-limit';
import { ipHash } from '../../server/security';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/** POST a booking request from /book/. See src/server/bookings.ts. */
export const POST: APIRoute = async ({ request }) => {
  const text = await request.text();
  if (text.length > 10_000) return json(413, { ok: false, error: 'Request too large.' });
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return json(400, { ok: false, error: 'Invalid request.' });
  }
  const parsed = bookingInput.safeParse(data);
  if (!parsed.success) return json(400, { ok: false, error: 'Please check the booking details.' });
  // Only requests that would reach the database count; malformed ones never touch it.
  const ip = ipHash(request);
  const limit = await rateLimit(LIMITS.booking, ip);
  if (!limit.ok) {
    // The browser keeps the booking and sends it again on a later visit.
    return new Response(JSON.stringify({ ok: false, error: 'Too many requests. Please message us on WhatsApp.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': String(limit.retryAfter) },
    });
  }
  try {
    const result = await saveBooking(parsed.data, ip);
    return json(result.status, result.body);
  } catch (e) {
    console.error('[bookings] save failed', e);
    // 503 tells the browser to keep the booking and retry later.
    return json(503, { ok: false, error: 'Could not save right now.' });
  }
};

export const ALL: APIRoute = () => json(405, { ok: false, error: 'Method not allowed.' });
