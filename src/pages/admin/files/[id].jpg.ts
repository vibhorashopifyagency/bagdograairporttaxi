import type { APIRoute } from 'astro';
import { fileById, fileResponse } from '../../../server/files';

export const prerender = false;

/**
 * An uploaded picture, for signed-in admin and staff (src/middleware.ts sends
 * anyone else to the login). Payment screenshots show a customer's name and
 * UPI ID, so the browser is told not to keep them; itinerary photos it may.
 */
export const GET: APIRoute = async ({ params, request }) => {
  const row = await fileById(params.id ?? '');
  if (!row) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
  return fileResponse(row, request, row.kind === 'payment' ? 'private, no-store' : 'private, max-age=86400');
};
