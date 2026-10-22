import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../server/admin';
import { LIMITS, rateLimit } from '../../../../server/rate-limit';
import { customerReport } from '../../../../server/retention';
import { ipHash } from '../../../../server/security';

export const prerender = false;

/**
 * Everything held about one customer, as a text file the admin can send them
 * when they ask what we keep (their right under the DPDP Act). Admin only,
 * and logged by customerReport.
 */
export const GET: APIRoute = async ({ locals, params, request }) => {
  const user = locals.user;
  if (!user || !isAdmin(user)) return new Response('Only the admin can download a customer’s details.', { status: 403 });
  const id = params.id ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', { status: 404 });
  const limit = await rateLimit(LIMITS.export, user.id);
  if (!limit.ok) return new Response('Too many downloads in a few minutes. Try again shortly.', { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
  const report = await customerReport(id, { actorId: user.id, ipHash: ipHash(request), role: user.role });
  if (!report) return new Response('This customer’s details are no longer held.', { status: 404 });
  const slug = report.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'customer';
  return new Response('﻿' + report.text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="details-held-${slug}.txt"`,
    },
  });
};
