import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { eq, sql } from 'drizzle-orm';
import { audit } from '../../../server/admin';
import { getDb, schema } from '../../../server/db';
import { ipHash } from '../../../server/security';
import { assignDriver } from '../../../server/drivers';
import { itineraryUploads, uploadKey } from '../../../server/files';
import { cleanItinerary } from '../../../server/trip';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const input = z.object({ id: z.uuid(), action: z.enum(['save', 'send']), data: z.unknown() });

/**
 * POST { id, action, data } from the "Send itinerary" popup.
 *  - save: keeps the draft (the popup saves a moment after each change).
 *  - send: keeps the draft and makes it what the customer's trip page shows,
 *    then notes it on the booking's timeline. The browser has already opened
 *    WhatsApp in the same tap, so this must not be the reason a send fails.
 * Signed-in admin and staff only (src/middleware.ts).
 */
export const POST: APIRoute = async ({ request, locals, url }) => {
  const user = locals.user;
  if (!user) return json(401, { ok: false, error: 'Please sign in again.' });
  if (request.headers.get('origin') !== url.origin) return json(403, { ok: false, error: 'Not allowed.' });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { ok: false, error: 'Invalid request.' });
  const { id, action } = parsed.data;
  const uploads = new Set((await itineraryUploads(id)).map((f) => uploadKey(f.id)));
  const clean = cleanItinerary(parsed.data.data, uploads);
  if ('error' in clean) return json(400, { ok: false, error: clean.error });
  const data = clean.data;

  const db = getDb();
  const b = schema.bookings;
  const [booking] = await db
    .select({ id: b.id, ref: b.ref, gone: b.personalDataRemovedAt, status: b.status, fareTotal: b.fareTotal, driverId: b.driverId, driverName: b.driverName, driverPhone: b.driverPhone, vehicleNumber: b.vehicleNumber, driverPay: b.driverPay })
    .from(b)
    .where(eq(b.id, id));
  if (!booking) return json(404, { ok: false, error: 'That booking no longer exists.' });
  if (booking.gone) return json(409, { ok: false, error: 'This booking’s personal details have been removed.' });

  const t = schema.itineraries;
  const now = new Date();
  const send = action === 'send';
  const row = await db.transaction(async (tx) => {
    const [saved] = await tx
      .insert(t)
      .values({
        bookingId: id,
        draft: data,
        updatedBy: user.id,
        ...(send ? { published: data, sentAt: now, sentBy: user.id, sentCount: 1 } : {}),
      })
      .onConflictDoUpdate({
        target: t.bookingId,
        set: {
          draft: data,
          updatedBy: user.id,
          updatedAt: now,
          ...(send ? { published: data, sentAt: now, sentBy: user.id, sentCount: sql`${t.sentCount} + 1` } : {}),
        },
      })
      .returning({ sentCount: t.sentCount });
    if (send) {
      await tx.insert(schema.bookingEvents).values({
        bookingId: id,
        actorId: user.id,
        type: 'itinerary_sent',
        data: { count: saved!.sentCount, days: data.days.length, photos: data.photos.length, to: data.phone },
      });
    }
    return saved!;
  });
  // Picking a driver in the popup puts them on the booking (or takes them off).
  if (data.driverId !== undefined && (data.driverId || null) !== booking.driverId) {
    await assignDriver(booking, data.driverId || null, { actorId: user.id, ipHash: ipHash(request) });
  }
  if (send) await audit({ actorId: user.id, action: 'itinerary_sent', entity: 'booking', entityId: id, detail: { ref: booking.ref, count: row.sentCount }, ipHash: ipHash(request) });
  return json(200, { ok: true, sentCount: row.sentCount, savedAt: now.toISOString() });
};

export const ALL: APIRoute = () => json(405, { ok: false, error: 'Method not allowed.' });
