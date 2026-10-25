/**
 * Rate limits that hold across every server instance: the counts live in
 * the `request_limits` table, one row per limit and caller, in fixed
 * windows. One small upsert per request.
 *
 * Once a caller is over the limit, this instance remembers it until the
 * window ends and answers without asking the database again, so a flood of
 * requests costs the database almost nothing.
 *
 * If the database cannot be asked, the request is let through: a limiter
 * hiccup must never be the reason a customer cannot book.
 */
import { lt, sql } from 'drizzle-orm';
import { getDb, schema } from './db';

export type Limit = { name: string; max: number; windowSec: number };

/** The limits in use. A name is part of the stored key, so changing one starts it afresh. */
export const LIMITS = {
  /** POST /api/bookings/, every attempt from one IP, saved or not. */
  booking: { name: 'booking', max: 30, windowSec: 60 },
  /** GET /api/availability/, the booking form's calendar check, per IP. A visitor trying dates and times asks a few times a minute. */
  availability: { name: 'availability', max: 90, windowSec: 60 },
  /** The customer's trip page, per IP. */
  trip: { name: 'trip', max: 60, windowSec: 60 },
  /** Calls from the admin pages to /admin/api/, per signed-in user. The itinerary popup saves about once a second while typing. */
  adminApi: { name: 'admin-api', max: 240, windowSec: 60 },
  /** The payments CSV reads every payment, so it is the heaviest download. */
  export: { name: 'export', max: 10, windowSec: 600 },
  /** Payment screenshots and itinerary photos, per signed-in user. Each one counts against the Blob store's monthly allowance. */
  upload: { name: 'upload', max: 60, windowSec: 3600 },
  /** Uploaded itinerary photos on a customer's trip page, per IP. A page shows a cover and a photo a day. */
  tripPhoto: { name: 'trip-photo', max: 240, windowSec: 60 },
} satisfies Record<string, Limit>;

export type Verdict = { ok: true } | { ok: false; retryAfter: number };

/** Callers already over a limit on this instance, until when (ms). Kept small. */
const blocked = new Map<string, number>();

export async function rateLimit(limit: Limit, who: string): Promise<Verdict> {
  const key = `${limit.name}:${who}`;
  const now = Date.now();
  const until = blocked.get(key);
  if (until && until > now) return { ok: false, retryAfter: Math.ceil((until - now) / 1000) };
  if (until) blocked.delete(key);

  const t = schema.requestLimits;
  const stale = sql`${t.windowStart} <= now() - make_interval(secs => ${limit.windowSec})`;
  let hits: number;
  let windowStart: Date;
  try {
    // The SET expressions read the row as it was, so both see the old window.
    const [row] = await getDb()
      .insert(t)
      .values({ key, windowStart: sql`now()`, hits: 1 })
      .onConflictDoUpdate({
        target: t.key,
        set: {
          hits: sql`case when ${stale} then 1 else ${t.hits} + 1 end`,
          windowStart: sql`case when ${stale} then now() else ${t.windowStart} end`,
        },
      })
      .returning({ hits: t.hits, windowStart: t.windowStart });
    hits = row!.hits;
    windowStart = row!.windowStart;
  } catch (e) {
    console.error('[rate-limit] check failed, letting the request through', e);
    return { ok: true };
  }

  // Now and then, clear rows from windows long gone.
  if (Math.random() < 0.01) {
    await getDb()
      .delete(t)
      .where(lt(t.windowStart, new Date(now - 86400e3)))
      .catch(() => {});
  }

  if (hits <= limit.max) return { ok: true };
  const ends = windowStart.getTime() + limit.windowSec * 1000;
  if (blocked.size > 5000) blocked.clear();
  blocked.set(key, ends);
  return { ok: false, retryAfter: Math.max(1, Math.ceil((ends - now) / 1000)) };
}

/** A plain page for a person who reloaded too often. */
export function tooManyPage(retryAfter: number): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Too many requests</title>
    <style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1.25rem;color:#111;line-height:1.55}h1{font-size:1.6rem;line-height:1.2}</style></head><body>
    <h1>Too many requests</h1><p>This page was opened many times in a short while. Wait a minute and reload it.</p></body></html>`,
    { status: 429, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) } },
  );
}
