import { defineMiddleware } from 'astro:middleware';

/** Admin pages anyone may open. Everything else under /admin/ needs a login. */
const OPEN = new Set(['/admin/login/', '/admin/setup/', '/admin/recover/']);

/** True when the error chain shows the database could not be reached at all. */
function databaseUnreachable(e: unknown): boolean {
  let x = e as { code?: string; cause?: unknown } | undefined;
  for (let i = 0; x && i < 6; i++, x = x.cause as typeof x) {
    if (x.code && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'].includes(x.code)) return true;
  }
  return false;
}

/** A plain page instead of a stack trace when the database is down. */
function databaseDownPage(): Response {
  const body = import.meta.env.DEV
    ? `<h1>The local database is not running</h1>
       <p>The website is running, but the database it keeps logins and bookings in is not. Open a second terminal in the project folder and run:</p>
       <pre>npm run db:local</pre>
       <p>Leave that terminal open, then reload this page.</p>`
    : `<h1>The admin is unavailable for a moment</h1>
       <p>The database did not answer. Wait a minute and reload. Bookings made on the website meanwhile are kept by the customer's browser and sent again automatically.</p>`;
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Database not reachable</title>
    <style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1.25rem;color:#111;line-height:1.55}h1{font-size:1.6rem;line-height:1.2}pre{background:#111;color:#a1e005;padding:.8rem 1rem;border-radius:.75rem;font-size:1rem}</style></head><body>${body}</body></html>`,
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '30' } },
  );
}

/**
 * Guards /admin/. Public pages are pre-built HTML and skip this entirely,
 * so the website never waits on the database.
 */
export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.user = null;
  ctx.locals.session = null;
  if (ctx.isPrerendered || !ctx.url.pathname.startsWith('/admin')) return next();

  const { getAuth } = await import('./server/auth');
  let result: Awaited<ReturnType<ReturnType<typeof getAuth>['api']['getSession']>>;
  try {
    result = await getAuth().api.getSession({ headers: ctx.request.headers });
  } catch (e) {
    if (databaseUnreachable(e)) return databaseDownPage();
    throw e;
  }
  if (result && !result.user.banned) {
    ctx.locals.user = result.user;
    ctx.locals.session = result.session;
  }

  const path = ctx.url.pathname.endsWith('/') ? ctx.url.pathname : ctx.url.pathname + '/';
  if (!ctx.locals.user && !OPEN.has(path)) {
    return ctx.redirect(`/admin/login/?next=${encodeURIComponent(ctx.url.pathname)}`, 303);
  }

  // A page stuck in a loop, or a script, cannot flood the database through the admin's JSON calls.
  if (ctx.locals.user && path.startsWith('/admin/api/')) {
    const { LIMITS, rateLimit } = await import('./server/rate-limit');
    const limit = await rateLimit(LIMITS.adminApi, ctx.locals.user.id);
    if (!limit.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'Too many changes at once. Wait a moment and try again.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': String(limit.retryAfter) },
      });
    }
  }

  const res = await next();
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'same-origin');
  return res;
});
