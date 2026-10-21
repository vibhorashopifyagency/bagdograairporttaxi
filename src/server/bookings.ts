/**
 * Saving a booking request from the website.
 *
 * The browser opens WhatsApp first and sends the booking here at the same
 * moment, so this must be fast, idempotent (the same reference twice saves
 * once) and never the reason a customer cannot book.
 */
import { z } from 'astro/zod';
import { and, count, eq, gte } from 'drizzle-orm';
import { getDb, schema } from './db';
import { computeFare } from './fares';
import { sendBookingEmail } from './mail';

/** BAT- plus six characters from an alphabet without 0/O or 1/I/L. */
export const REF_RE = /^BAT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

const common = {
  ref: z.string().regex(REF_RE),
  vehicle: z.string().max(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  flight: z.string().trim().max(40).default(''),
  pax: z.coerce.number().int().min(1).max(50),
  drop: z.string().trim().max(200).default(''),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(24),
  fareShown: z.coerce.number().int().min(0).max(10_000_000),
  advanceShown: z.coerce.number().int().min(0).max(10_000_000),
  channel: z.enum(['whatsapp', 'payment']),
  consent: z.literal(true),
  /** Honeypot: hidden from people, filled in by bots. */
  website: z.string().max(500).default(''),
};

export const bookingInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('taxi'), route: z.string().max(80), ...common }),
  z.object({ kind: z.literal('package'), package: z.string().max(120), ...common }),
]);
export type BookingInput = z.infer<typeof bookingInput>;

/**
 * Digits only, with the country code: "098301 22745", "+91 98301-22745" and
 * "9830122745" all become "919830122745". Null when it cannot be a number.
 */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = '91' + d.slice(1);
  if (d.length === 10) d = '91' + d;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

/** Today's date in India, as YYYY-MM-DD. */
const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

function validDate(s: string): boolean {
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return false;
  const today = new Date(`${todayIST()}T00:00:00Z`).getTime();
  const days = (d.getTime() - today) / 86400e3;
  return days >= -1 && days <= 400;
}

const LIMITS = { perIpPerHour: 20, perPhonePerHour: 6 };

export type SaveResult =
  | { status: 201 | 200; body: { ok: true; ref: string; duplicate?: boolean } }
  | { status: 400 | 429; body: { ok: false; error: string } };

export async function saveBooking(input: BookingInput, ipHash: string): Promise<SaveResult> {
  // Bots that fill the hidden field get a normal-looking answer and nothing is saved.
  if (input.website) return { status: 201, body: { ok: true, ref: input.ref } };

  const phone = normalizePhone(input.phone);
  if (!phone) return { status: 400, body: { ok: false, error: 'Please check the mobile number.' } };
  if (!validDate(input.date)) return { status: 400, body: { ok: false, error: 'Please check the pickup date.' } };

  const fare =
    input.kind === 'taxi'
      ? computeFare({ kind: 'taxi', routeSlug: input.route, vehicle: input.vehicle, time: input.time })
      : computeFare({ kind: 'package', packageSlug: input.package, vehicle: input.vehicle, pax: input.pax });
  if (!fare) return { status: 400, body: { ok: false, error: 'That route, package or car is not on our list.' } };

  const db = getDb();
  const hourAgo = new Date(Date.now() - 3600e3);
  const [byIp] = await db
    .select({ n: count() })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.ipHash, ipHash), gte(schema.bookings.createdAt, hourAgo)));
  const [byPhone] = await db
    .select({ n: count() })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.customerPhone, phone), gte(schema.bookings.createdAt, hourAgo)));
  if ((byIp?.n ?? 0) >= LIMITS.perIpPerHour || (byPhone?.n ?? 0) >= LIMITS.perPhonePerHour) {
    return { status: 429, body: { ok: false, error: 'Too many requests. Please message us on WhatsApp.' } };
  }

  const now = new Date();
  const mismatch = input.fareShown !== fare.total;
  const row = {
    ref: input.ref,
    kind: input.kind,
    routeSlug: input.kind === 'taxi' ? input.route : null,
    packageSlug: input.kind === 'package' ? input.package : null,
    vehicle: input.vehicle,
    tripName: fare.tripName,
    pickupDate: input.date,
    pickupTime: input.time,
    flight: input.flight || null,
    pax: input.pax,
    dropAddress: input.drop || null,
    customerName: input.name,
    customerPhone: phone,
    fareShown: input.fareShown,
    advanceShown: input.advanceShown,
    fareServer: fare.total,
    fareMismatch: mismatch,
    fareTotal: fare.total,
    source: 'website' as const,
    channel: input.channel,
    consentAt: now,
    ipHash,
  };

  const created = await db.transaction(async (tx) => {
    const [customer] = await tx
      .insert(schema.customers)
      .values({ name: input.name, phone, lastBookingAt: now })
      .onConflictDoUpdate({ target: schema.customers.phone, set: { name: input.name, lastBookingAt: now, updatedAt: now } })
      .returning({ id: schema.customers.id });
    const [booking] = await tx
      .insert(schema.bookings)
      .values({ ...row, customerId: customer?.id })
      .onConflictDoNothing({ target: schema.bookings.ref })
      .returning({ id: schema.bookings.id });
    if (!booking) return false;
    await tx.insert(schema.bookingEvents).values({
      bookingId: booking.id,
      type: 'created',
      data: { channel: input.channel, fareShown: input.fareShown, fareServer: fare.total },
    });
    return true;
  });

  if (!created) return { status: 200, body: { ok: true, ref: input.ref, duplicate: true } };

  await sendBookingEmail({ ...row, customerName: input.name, customerPhone: phone });
  return { status: 201, body: { ok: true, ref: input.ref } };
}
