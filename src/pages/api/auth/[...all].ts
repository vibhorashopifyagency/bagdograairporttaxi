import type { APIRoute } from 'astro';
import { getAuth } from '../../../server/auth';

export const prerender = false;

/**
 * Hands every /api/auth/* request to Better Auth. The site uses trailing
 * slashes everywhere (and Vercel adds them), while Better Auth's routes have
 * none, so the slash is removed before the request reaches it.
 */
export const ALL: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer();
  const res = await getAuth().handler(new Request(url, { method: request.method, headers: request.headers, body }));
  res.headers.set('Cache-Control', 'no-store');
  return res;
};
