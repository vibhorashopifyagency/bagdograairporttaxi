import type { APIRoute } from 'astro';
import { routeBySlug } from '../../data/routes';
import { packageBySlug } from '../../data/packages';
import { fullCarTypes } from '../../server/calendar';
import { addDays, isDay, todayIST } from '../../server/dashboard';
import { LIMITS, rateLimit } from '../../server/rate-limit';
import { ipHash } from '../../server/security';

export const prerender = false;

const json = (status: number, body: unknown, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache, 'X-Robots-Tag': 'noindex' } });

/**
 * GET ?route=<slug> (or ?package=<slug>) &date=YYYY-MM-DD &time=HH:MM:
 * the car types the booking form should grey out for that trip, because
 * every one of the office's own cars of that type is busy for some of it
 * (src/server/calendar.ts). Says only which types are full, never how many
 * cars there are or whose booking holds them. Kept 30 seconds at the edge,
 * so a visitor flicking between cars costs one look at the database.
 *
 * Anything going wrong answers "nothing is full": a hiccup here must never
 * be the reason a customer cannot book.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const p = url.searchParams;
  const route = p.get('route') ?? '';
  const pkg = p.get('package') ?? '';
  const date = p.get('date') ?? '';
  const time = p.get('time') ?? '';
  const today = todayIST();
  if (!isDay(date) || date < addDays(today, -1) || date > addDays(today, 400) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return json(400, { ok: false, full: [] });
  if (route ? !routeBySlug(route) : !packageBySlug(pkg)) return json(400, { ok: false, full: [] });
  try {
    const limit = await rateLimit(LIMITS.availability, ipHash(request));
    if (!limit.ok) return json(429, { ok: false, full: [] });
    const full = await fullCarTypes(route ? { kind: 'taxi', routeSlug: route, date, time } : { kind: 'package', packageSlug: pkg, date, time });
    return json(200, { ok: true, full }, 'public, max-age=0, s-maxage=30');
  } catch (e) {
    console.error('[availability] could not check the calendar', e);
    return json(503, { ok: false, full: [] });
  }
};

export const ALL: APIRoute = () => json(405, { ok: false, full: [] });
