import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../server/db';
import { fileById, fileResponse, photoIdFromToken } from '../../../server/files';
import { LIMITS, rateLimit } from '../../../server/rate-limit';
import { ipHash } from '../../../server/security';

export const prerender = false;

const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

/**
 * An itinerary photo the office uploaded, on the customer's trip page. The
 * address is signed (photoIdFromToken), so only someone sent the trip page
 * has it. Payment screenshots are never served here, and a photo stops
 * showing once the booking's personal details are removed.
 */
export const GET: APIRoute = async ({ params, request }) => {
  const id = photoIdFromToken(params.token ?? '');
  if (!id) return notFound();
  const limit = await rateLimit(LIMITS.tripPhoto, ipHash(request));
  if (!limit.ok) return new Response('Too many requests', { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
  const row = await fileById(id);
  if (!row || row.kind !== 'itinerary') return notFound();
  const [booking] = await getDb().select({ gone: schema.bookings.personalDataRemovedAt }).from(schema.bookings).where(eq(schema.bookings.id, row.bookingId));
  if (!booking || booking.gone) return notFound();
  return fileResponse(row, request, 'private, max-age=86400');
};
