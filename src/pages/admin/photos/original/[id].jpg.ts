import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../server/admin';
import { websitePhotoResponse } from '../../../../server/files';

export const prerender = false;

/** The original of a website photo, for the admin's photo library (src/server/files.ts). */
export const GET: APIRoute = ({ params, locals, request }) => {
  if (!isAdmin(locals.user)) return new Response('Not found', { status: 404 });
  return websitePhotoResponse(String(params.id ?? ''), request);
};
