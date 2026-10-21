import { defineMiddleware } from 'astro:middleware';

/** Admin pages anyone may open. Everything else under /admin/ needs a login. */
const OPEN = new Set(['/admin/login/', '/admin/setup/', '/admin/recover/']);

/**
 * Guards /admin/. Public pages are pre-built HTML and skip this entirely,
 * so the website never waits on the database.
 */
export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.user = null;
  ctx.locals.session = null;
  if (ctx.isPrerendered || !ctx.url.pathname.startsWith('/admin')) return next();

  const { getAuth } = await import('./server/auth');
  const result = await getAuth().api.getSession({ headers: ctx.request.headers });
  if (result && !result.user.banned) {
    ctx.locals.user = result.user;
    ctx.locals.session = result.session;
  }

  const path = ctx.url.pathname.endsWith('/') ? ctx.url.pathname : ctx.url.pathname + '/';
  if (!ctx.locals.user && !OPEN.has(path)) {
    return ctx.redirect(`/admin/login/?next=${encodeURIComponent(ctx.url.pathname)}`, 303);
  }

  const res = await next();
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'same-origin');
  return res;
});
