import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { audit } from '../../../server/admin';
import { getDb, schema } from '../../../server/db';
import { MAX_UPLOAD, NOT_READY, adminFileSrc, filesReady, saveUpload, uploadKey } from '../../../server/files';
import { canRecordPayments } from '../../../server/payments';
import { LIMITS, rateLimit } from '../../../server/rate-limit';
import { ipHash } from '../../../server/security';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * POST multipart { file, kind, booking, payment? }: one picture, already
 * shrunk to a JPEG by the browser (src/lib/shrink-image.ts).
 *  - kind 'payment': a screenshot for Record payment, attached when the
 *    payment is saved; or, with `payment`, added to one already recorded.
 *  - kind 'itinerary': a photo for the itinerary popup's picker.
 * Signed-in admin and staff only (src/middleware.ts); screenshots only for
 * those who may record payments. Answers { ok, id, key, src } or { ok, error }.
 */
export const POST: APIRoute = async ({ request, locals, url }) => {
  const user = locals.user;
  if (!user) return json(401, { ok: false, error: 'Please sign in again.' });
  if (request.headers.get('origin') !== url.origin) return json(403, { ok: false, error: 'Not allowed.' });
  if (!filesReady()) return json(503, { ok: false, error: NOT_READY });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD + 20_000) return json(413, { ok: false, error: 'That picture is too large.' });
  const limit = await rateLimit(LIMITS.upload, user.id);
  if (!limit.ok) return json(429, { ok: false, error: 'That is a lot of pictures at once. Wait a few minutes and try again.' });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const kind = String(form?.get('kind') ?? '');
  const bookingId = String(form?.get('booking') ?? '');
  const paymentId = String(form?.get('payment') ?? '') || null;
  if (!(file instanceof File) || (kind !== 'payment' && kind !== 'itinerary') || !UUID.test(bookingId) || (paymentId && (kind !== 'payment' || !UUID.test(paymentId)))) {
    return json(400, { ok: false, error: 'Invalid request.' });
  }

  const db = getDb();
  const [booking] = await db.select({ ref: schema.bookings.ref, gone: schema.bookings.personalDataRemovedAt }).from(schema.bookings).where(eq(schema.bookings.id, bookingId));
  if (!booking) return json(404, { ok: false, error: 'That booking no longer exists.' });
  if (booking.gone) return json(409, { ok: false, error: 'This booking’s personal details have been removed.' });
  if (kind === 'payment' && !(await canRecordPayments(user))) return json(403, { ok: false, error: 'Only the admin, or staff the admin has allowed, can add payment screenshots.' });
  if (paymentId) {
    const [p] = await db.select({ kind: schema.payments.kind }).from(schema.payments).where(and(eq(schema.payments.id, paymentId), eq(schema.payments.bookingId, bookingId)));
    if (!p || p.kind === 'reversal') return json(404, { ok: false, error: 'That payment was not found. Reload the page.' });
    const [has] = await db.select({ id: schema.files.id }).from(schema.files).where(eq(schema.files.paymentId, paymentId));
    if (has) return json(409, { ok: false, error: 'This payment already has a screenshot. Reload the page.' });
  }

  let res: Awaited<ReturnType<typeof saveUpload>>;
  try {
    res = await saveUpload({ bookingId, kind, bytes: new Uint8Array(await file.arrayBuffer()), actorId: user.id, paymentId });
  } catch (e) {
    console.error('[upload] could not store the picture', e);
    return json(502, { ok: false, error: 'The picture could not be stored just now. Try again in a minute.' });
  }
  if ('error' in res) return json(400, { ok: false, error: res.error });
  const id = res.file.id;
  await audit({ actorId: user.id, action: 'file_uploaded', entity: 'booking', entityId: bookingId, detail: { ref: booking.ref, kind, file: id, ...(paymentId ? { paymentId } : {}) }, ipHash: ipHash(request) });
  return json(200, { ok: true, id, key: uploadKey(id), src: adminFileSrc(id) });
};

export const ALL: APIRoute = () => json(405, { ok: false, error: 'Method not allowed.' });
