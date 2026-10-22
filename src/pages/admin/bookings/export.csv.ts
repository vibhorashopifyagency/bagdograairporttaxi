import type { APIRoute } from 'astro';
import { and, eq, sql } from 'drizzle-orm';
import { vehicleByKey } from '../../../data/vehicles';
import { audit, isAdmin } from '../../../server/admin';
import { PAY_FILTERS, bookingWhere, filterParams, moneyFields, payFilterOf, readBookingFilters, tripLabel } from '../../../server/booking-filters';
import { STATUS_LABEL } from '../../../server/dashboard';
import { getDb, schema } from '../../../server/db';
import { advanceOf } from '../../../server/fares';
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

const SOURCE = { website: 'Website', staff: 'By hand' } as const;
const CHANNEL = { whatsapp: 'Confirm on WhatsApp', payment: 'Pay advance button', manual: 'Entered by staff' } as const;
/**
 * "91 98301 22745": the country code first and spaced, so a spreadsheet keeps
 * it as text (a bare number loses digits to 9.1E+11, and a leading + is read
 * as a formula).
 */
const phoneCell = (d: string | null) => (!d ? '' : d.length === 12 && d.startsWith('91') ? `91 ${d.slice(2, 7)} ${d.slice(7)}` : `${d.slice(0, d.length - 10)} ${d.slice(-10)}`);
const stamp = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

/**
 * The bookings on screen, newest first, with every filter applied (search,
 * status, dates, trip, payment), for the accounts or a spreadsheet. Admin
 * only, and logged, because it carries names and mobile numbers. Read and
 * sent a thousand rows at a time, each batch picking up after the last one
 * (an index walk, not OFFSET), so the size of the file never matters.
 */
export const GET: APIRoute = async ({ locals, request, url }) => {
  const user = locals.user;
  if (!user || !isAdmin(user)) return new Response('Only the admin can download bookings.', { status: 403 });
  const limit = await rateLimit(LIMITS.export, user.id);
  if (!limit.ok) {
    return new Response('That is a lot of downloads in a few minutes. Try again shortly.', {
      status: 429,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': String(limit.retryAfter) },
    });
  }
  const f = readBookingFilters(url);
  const kept = Object.fromEntries(Object.entries(filterParams(f)).filter(([, v]) => v));
  await audit({ actorId: user.id, action: 'export_bookings', entity: 'bookings', detail: Object.keys(kept).length ? kept : undefined, ipHash: ipHash(request) });

  const b = schema.bookings;
  const where = bookingWhere(f);
  const db = getDb();
  const head = [
    'Reference', 'Received', 'Source', 'Sent from', 'Status', 'Kind', 'Trip', 'Car', 'Pickup date', 'Pickup time', 'Flight or train',
    'Travellers', 'Drop address', 'Customer', 'Mobile (country code first)', 'Agreed fare', 'Fare the page showed', 'Advance', 'Paid', 'Still due', 'Payment',
    'Driver', 'Driver phone', 'Car number', 'Driver pay', 'Handled by', 'Notes',
  ];
  const encoder = new TextEncoder();
  // Where the last batch ended: received time (as text, to keep its microseconds) and id.
  let after: [string, string] | null = null;
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
            row: b,
            ...moneyFields,
            handler: schema.user.name,
            key: sql<[string, string]>`json_build_array(${b.createdAt}::text, ${b.id}::text)`,
          })
          .from(b)
          .leftJoin(schema.user, eq(b.handledBy, schema.user.id))
          .where(and(where, after ? sql`(${b.createdAt}, ${b.id}) < (${after[0]}::timestamptz, ${after[1]}::uuid)` : undefined))
          .orderBy(sql`${b.createdAt} desc`, sql`${b.id} desc`)
          .limit(BATCH);
        if (cancelled) return;
        if (rows.length) {
          const lines = rows.map(({ row: x, paid: paidText, hasRefund, handler }) => {
            const paid = Number(paidText);
            return [
              x.ref,
              stamp.format(x.createdAt).replace(',', ''),
              SOURCE[x.source],
              CHANNEL[x.channel],
              STATUS_LABEL[x.status][0],
              x.kind === 'package' ? 'Tour package' : 'Taxi',
              x.tripName,
              vehicleByKey(x.vehicle)?.name ?? x.vehicle,
              x.pickupDate,
              x.pickupTime,
              x.flight,
              x.pax,
              x.dropAddress,
              x.customerName ?? (x.personalDataRemovedAt ? 'Removed after 24 months' : ''),
              phoneCell(x.customerPhone),
              x.fareTotal,
              x.fareMismatch ? x.fareShown : '',
              advanceOf(x.fareTotal),
              paid,
              Math.max(0, x.fareTotal - paid),
              PAY_FILTERS[payFilterOf(x.fareTotal, paid, hasRefund)],
              x.driverName,
              phoneCell(x.driverPhone),
              x.vehicleNumber,
              x.driverPay ?? '',
              handler,
              x.notes,
            ]
              .map(cell)
              .join(',');
          });
          controller.enqueue(encoder.encode(lines.join('\r\n') + '\r\n'));
        }
        if (rows.length < BATCH) controller.close();
        else after = rows.at(-1)!.key;
      } catch (e) {
        if (cancelled) return;
        console.error('[export] bookings CSV failed part way', e);
        controller.error(e);
      }
    },
  });

  const day = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const parts = [
    f.status,
    tripLabel(f.trip),
    f.pay,
    f.from || f.to ? `${f.by === 'booked' ? 'booked' : 'pickup'}-${f.from ?? 'start'}-to-${f.to ?? day}` : null,
  ].filter(Boolean) as string[];
  const name = (parts.length ? parts.join('-') : day).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bagdograairporttaxi-bookings-${name}.csv"`,
    },
  });
};
