import type { APIRoute } from 'astro';
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { audit, isAdmin } from '../../../server/admin';
import { customerWhere, lastBookedSql, readCustomerFilters, tagsFor } from '../../../server/customer-tags';
import { getDb, schema } from '../../../server/db';
import { LIMITS, rateLimit } from '../../../server/rate-limit';
import { ipHash } from '../../../server/security';
import { phoneLabel } from '../../../lib/itinerary-text';

export const prerender = false;

/** CSV cells: quoted, with formulas defused so a spreadsheet never runs one. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^\+?\d[\d ]*$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** More than any office list; a bigger file is a mistake in the filter. */
const MAX = 5000;

/**
 * The customers in the list's current filter (src/server/customer-tags.ts),
 * every page of them, for a WhatsApp Broadcast list or the phone's contacts.
 * Customers who asked for no offers are left out. `?only=numbers` gives just
 * the numbers, one a line, for the Copy button. Admin only, and logged,
 * because it is a list of names and numbers.
 */
export const GET: APIRoute = async ({ locals, request, url }) => {
  const user = locals.user;
  if (!user || !isAdmin(user)) return new Response('Only the admin can copy or download customer numbers.', { status: 403 });
  const limit = await rateLimit(LIMITS.export, user.id);
  if (!limit.ok) {
    return new Response('That is a lot of downloads in a few minutes. Try again shortly.', {
      status: 429,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': String(limit.retryAfter) },
    });
  }
  const f = readCustomerFilters(url);
  const numbersOnly = url.searchParams.get('only') === 'numbers';
  const c = schema.customers;
  const rows = await getDb()
    .select({ id: c.id, name: c.name, phone: c.phone, rating: c.rating, last: sql<string>`(${lastBookedSql} at time zone 'Asia/Kolkata')::date::text` })
    .from(c)
    .where(and(customerWhere(f), eq(c.noOffers, false), isNotNull(c.phone)))
    .orderBy(desc(lastBookedSql), desc(c.id))
    .limit(MAX);
  await audit({
    actorId: user.id,
    action: 'export_customers',
    entity: 'customers',
    detail: { count: rows.length, numbersOnly, q: f.q || undefined, from: f.from ?? undefined, to: f.to ?? undefined, rating: f.rating ?? undefined, tag: f.tag ?? undefined },
    ipHash: ipHash(request),
  });

  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (numbersOnly) {
    return new Response(rows.map((r) => `+${r.phone}`).join('\n') + '\n', { headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  const tags = await tagsFor(rows.map((r) => r.id));
  const lines = [
    ['Name', 'Mobile', 'Stars', 'Tags', 'Last booked'],
    ...rows.map((r) => [r.name, phoneLabel(r.phone!), r.rating ?? '', (tags.get(r.id) ?? []).map((t) => t.name).join(', '), r.last ?? '']),
  ];
  const body = '﻿' + lines.map((l) => l.map(cell).join(',')).join('\r\n') + '\r\n';
  const stamp = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  return new Response(body, {
    headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="customers-${stamp}.csv"` },
  });
};

export const ALL: APIRoute = () => new Response('Method not allowed.', { status: 405 });
