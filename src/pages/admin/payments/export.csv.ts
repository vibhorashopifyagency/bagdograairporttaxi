import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { audit, isAdmin } from '../../../server/admin';
import { getDb, schema } from '../../../server/db';
import { ipHash } from '../../../server/security';

export const prerender = false;

/** CSV cells: quoted, with formulas defused so a spreadsheet never runs one. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/**
 * Every payment, refund and reversal, oldest first, for the accounts. Admin
 * only, and logged, because it carries customer names.
 */
export const GET: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user || !isAdmin(user)) return new Response('Only the admin can download payments.', { status: 403 });
  const p = schema.payments;
  const b = schema.bookings;
  const rows = await getDb()
    .select({ pay: p, ref: b.ref, name: b.customerName, trip: b.tripName, pickup: b.pickupDate, fare: b.fareTotal, by: schema.user.name })
    .from(p)
    .innerJoin(b, eq(p.bookingId, b.id))
    .leftJoin(schema.user, eq(p.createdBy, schema.user.id))
    .orderBy(asc(p.receivedOn), asc(p.createdAt));
  await audit({ actorId: user.id, action: 'export_payments', entity: 'payments', detail: { count: rows.length }, ipHash: ipHash(request) });

  const head = ['Date', 'Booking', 'Customer', 'Trip', 'Pickup date', 'Agreed fare', 'Type', 'Method', 'Amount', 'Received by', 'UPI reference', 'Note', 'Recorded by', 'Recorded at', 'Entry id', 'Reverses entry'];
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
  const day = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  return new Response('﻿' + [head.map(cell).join(','), ...lines].join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bagdograairporttaxi-payments-${day}.csv"`,
    },
  });
};
