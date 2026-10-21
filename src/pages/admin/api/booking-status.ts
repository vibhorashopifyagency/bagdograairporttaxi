import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { eq } from 'drizzle-orm';
import { audit } from '../../../server/admin';
import { getDb, schema } from '../../../server/db';
import { BOOKING_STATUSES } from '../../../server/db/schema';
import { ipHash } from '../../../server/security';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const input = z.object({ id: z.uuid(), status: z.enum(BOOKING_STATUSES) });

/**
 * POST { id, status }: moves a booking to another status, records it on the
 * booking's timeline and in the access log. Signed-in admin and staff only
 * (src/middleware.ts guards everything under /admin/).
 */
export const POST: APIRoute = async ({ request, locals, url }) => {
  const user = locals.user;
  if (!user) return json(401, { ok: false, error: 'Please sign in again.' });
  if (request.headers.get('origin') !== url.origin) return json(403, { ok: false, error: 'Not allowed.' });

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { ok: false, error: 'Invalid request.' });
  const { id, status } = parsed.data;

  const db = getDb();
  const b = schema.bookings;
  const [before] = await db.select({ status: b.status, handledBy: b.handledBy }).from(b).where(eq(b.id, id));
  if (!before) return json(404, { ok: false, error: 'That booking no longer exists.' });
  if (before.status === status) return json(200, { ok: true, status });

  await db.transaction(async (tx) => {
    await tx
      .update(b)
      .set({ status, handledBy: before.handledBy ?? (status === 'new' ? null : user.id) })
      .where(eq(b.id, id));
    await tx.insert(schema.bookingEvents).values({ bookingId: id, actorId: user.id, type: 'status', data: { from: before.status, to: status } });
  });
  await audit({ actorId: user.id, action: 'booking_status', entity: 'booking', entityId: id, detail: { from: before.status, to: status }, ipHash: ipHash(request) });
  return json(200, { ok: true, status, from: before.status });
};

export const ALL: APIRoute = () => json(405, { ok: false, error: 'Method not allowed.' });
