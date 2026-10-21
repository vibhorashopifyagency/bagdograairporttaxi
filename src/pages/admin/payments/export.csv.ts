import type { APIRoute } from 'astro';
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import { audit, isAdmin } from '../../../server/admin';
import { getDb, schema } from '../../../server/db';
import { dateFilter } from '../../../server/paging';
import { LIMITS, rateLimit } from '../../../server/rate-limit';
import { ipHash } from '../../../server/security';

export const prerender = false;

/** CSV cells: quoted, with formulas defused so a spreadsheet never runs one. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** Rows read from the database at a time. */
const BATCH = 1000;

/**
 * Every payment, refund and reversal, oldest first, for the accounts, or
 * only those received between ?from= and ?to= (the dates chosen on the
 * Payments page). Admin only, and logged, because it carries customer names.
 * The file is read and sent a thousand rows at a time, each batch picking up
 * after the last one (an index walk, not OFFSET), so years of payments never
 * have to fit in memory and the first rows arrive at once.
 */
export const GET: APIRoute = async ({ locals, request, url }) => {
  const user = locals.user;
  if (!user || !isAdmin(user)) return new Response('Only the admin can download payments.', { status: 403 });
  const limit = await rateLimit(LIMITS.export, user.id);
  if (!limit.ok) {
    return new Response('That is a lot of downloads in a few minutes. Try again shortly.', {
      status: 429,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': String(limit.retryAfter) },
    });
  }
  const { from, to } = dateFilter(url);
  await audit({ actorId: user.id, action: 'export_payments', entity: 'payments', detail: from || to ? { from, to } : undefined, ipHash: ipHash(request) });

  const p = schema.payments;
  const inRange = and(from ? gte(p.receivedOn, from) : undefined, to ? lte(p.receivedOn, to) : undefined);
  const b = schema.bookings;
  const db = getDb();
  const head = ['Date', 'Booking', 'Customer', 'Trip', 'Pickup date', 'Agreed fare', 'Type', 'Method', 'Amount', 'Received by', 'Collected by driver', 'UPI reference', 'Note', 'Recorded by', 'Recorded at', 'Entry id', 'Reverses entry'];
  const encoder = new TextEncoder();
  // Where the last batch ended: received date, recorded time (as text, to keep its microseconds) and id.
  let after: [string, string, string] | null = null;
  // Set when the browser stops the download; the batch in flight is then dropped quietly.
  let cancelled = false;

  const body = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
    start(controller) {
      controller.enqueue(encoder.encode('﻿' + head.map(cell).join(',') + '\r\n'));
    },
    async pull(controller) {
      try {
        const rows = await db
          .select({
            pay: p,
            ref: b.ref,
            name: b.customerName,
            trip: b.tripName,
            pickup: b.pickupDate,
            fare: b.fareTotal,
            by: schema.user.name,
            driver: schema.drivers.name,
            key: sql<[string, string, string]>`json_build_array(${p.receivedOn}::text, ${p.createdAt}::text, ${p.id}::text)`,
          })
          .from(p)
          .innerJoin(b, eq(p.bookingId, b.id))
          .leftJoin(schema.user, eq(p.createdBy, schema.user.id))
          .leftJoin(schema.drivers, eq(p.driverId, schema.drivers.id))
          .where(and(inRange, after ? sql`(${p.receivedOn}, ${p.createdAt}, ${p.id}) > (${after[0]}::date, ${after[1]}::timestamptz, ${after[2]}::uuid)` : undefined))
          .orderBy(asc(p.receivedOn), asc(p.createdAt), asc(p.id))
          .limit(BATCH);
        if (cancelled) return;
        if (rows.length) {
          const lines = rows.map((r) =>
            [
              r.pay.receivedOn,
              r.ref,
              r.name ?? '',
              r.trip,
              r.pickup,
              r.fare,
              r.pay.kind,
              r.pay.method,
              r.pay.amount,
              r.pay.receivedBy,
              r.pay.driverId ? (r.driver ?? 'yes') : '',
              r.pay.upiRef,
              r.pay.note,
              r.by,
              r.pay.createdAt.toISOString(),
              r.pay.id,
              r.pay.reversesPaymentId,
            ]
              .map(cell)
              .join(','),
          );
          controller.enqueue(encoder.encode(lines.join('\r\n') + '\r\n'));
        }
        if (rows.length < BATCH) controller.close();
        else after = rows.at(-1)!.key;
      } catch (e) {
        if (cancelled) return;
        console.error('[export] payments CSV failed part way', e);
        controller.error(e);
      }
    },
  });

  const day = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const name = from || to ? `${from ?? 'start'}-to-${to ?? day}` : day;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bagdograairporttaxi-payments-${name}.csv"`,
    },
  });
};
