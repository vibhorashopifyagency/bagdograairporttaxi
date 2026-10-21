import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { eq } from 'drizzle-orm';
import { audit } from '../../../server/admin';
import { getDb, schema } from '../../../server/db';
import { ipHash } from '../../../server/security';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const input = z.object({ id: z.uuid(), type: z.literal('qr_sent'), amount: z.number().int().min(0).max(10_000_000).optional() });

/**
 * POST { id, type, amount }: notes on a booking's timeline that the UPI QR
 * code went out. Sent from the browser as WhatsApp opens, so it never holds
 * anything up. Signed-in admin and staff only (src/middleware.ts).
 */
export const POST: APIRoute = async ({ request, locals, url }) => {
  const user = locals.user;
  if (!user) return json(401, { ok: false, error: 'Please sign in again.' });
  if (request.headers.get('origin') !== url.origin) return json(403, { ok: false, error: 'Not allowed.' });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { ok: false, error: 'Invalid request.' });
  const { id, type, amount } = parsed.data;

  const db = getDb();
  const [booking] = await db.select({ id: schema.bookings.id }).from(schema.bookings).where(eq(schema.bookings.id, id));
  if (!booking) return json(404, { ok: false, error: 'That booking no longer exists.' });
  await db.insert(schema.bookingEvents).values({ bookingId: id, actorId: user.id, type, data: amount ? { amount } : {} });
  await audit({ actorId: user.id, action: type, entity: 'booking', entityId: id, detail: amount ? { amount } : undefined, ipHash: ipHash(request) });
  return json(200, { ok: true });
};

export const ALL: APIRoute = () => json(405, { ok: false, error: 'Method not allowed.' });
