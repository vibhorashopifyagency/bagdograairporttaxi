import type { APIRoute } from 'astro';
import { audit } from '../../../server/admin';
import { cleanQuery, searchAll } from '../../../server/search';
import { ipHash } from '../../../server/security';

export const prerender = false;

/**
 * GET ?q=: the first few bookings and customers that match, for the list
 * under the search box as someone types. Logged like the lists themselves,
 * because the answer carries names and numbers.
 */
export const GET: APIRoute = async ({ request, locals, url }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const q = cleanQuery(url.searchParams.get('q'));
  const result = await searchAll(q, 5);
  if (q.length >= 2) {
    await audit({ actorId: user.id, action: 'search', entity: 'bookings', detail: { q, bookings: result.bookingTotal, customers: result.customerTotal }, ipHash: ipHash(request) });
  }
  return new Response(JSON.stringify({ ok: true, ...result }), { headers: { 'Content-Type': 'application/json' } });
};
