import type { APIRoute } from 'astro';
import { BUSINESS } from '../../../data/site';
import { isAdmin } from '../../../server/admin';
import { getEntry, saveDraft } from '../../../server/content';
import { MAX_UPLOAD, NOT_READY, deleteWebsitePhoto, filesReady, saveWebsitePhoto, websitePhotoId } from '../../../server/files';
import { LIMITS, rateLimit } from '../../../server/rate-limit';
import { ipHash } from '../../../server/security';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** "IMG_2041 Innova at Tiger Hill.jpg" as "Innova at Tiger Hill". */
const nameFrom = (file: string) =>
  file
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/^(img|dsc|pxl|photo|image|whatsapp image)[\s_-]*[\d_-]*/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 60);

/**
 * POST multipart { file, replace? }: a photo for the website's library,
 * already shrunk to a JPEG by the browser. A new photo becomes a draft entry
 * with no description yet (Publish asks for one); with `replace`, the
 * picture of that library photo changes and everything else stays.
 * Admin only. Answers { ok, key } or { ok, error }.
 */
export const POST: APIRoute = async ({ request, locals, url }) => {
  const user = locals.user;
  if (!user) return json(401, { ok: false, error: 'Please sign in again.' });
  if (!isAdmin(user)) return json(403, { ok: false, error: 'Only the admin can change the website.' });
  if (request.headers.get('origin') !== url.origin) return json(403, { ok: false, error: 'Not allowed.' });
  if (!filesReady()) return json(503, { ok: false, error: NOT_READY });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD + 20_000) return json(413, { ok: false, error: 'That picture is too large.' });
  const limit = await rateLimit(LIMITS.upload, user.id);
  if (!limit.ok) return json(429, { ok: false, error: 'That is a lot of pictures at once. Wait a few minutes and try again.' });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const replace = String(form?.get('replace') ?? '');
  const original = String(form?.get('name') ?? '');
  if (!(file instanceof File) || (replace && !/^[a-z0-9-]{1,80}$/.test(replace))) return json(400, { ok: false, error: 'Invalid request.' });
  const existing = replace ? await getEntry('photo', replace) : null;
  if (replace && !existing?.current) return json(404, { ok: false, error: 'That photo is no longer in the library. Reload the page.' });

  let saved: Awaited<ReturnType<typeof saveWebsitePhoto>>;
  try {
    saved = await saveWebsitePhoto(new Uint8Array(await file.arrayBuffer()));
  } catch (e) {
    console.error('[photo-upload] could not store the picture', e);
    return json(502, { ok: false, error: 'The picture could not be stored just now. Try again in a minute.' });
  }
  if ('error' in saved) return json(400, { ok: false, error: saved.error });
  const ctx = { actorId: user.id, ipHash: ipHash(request) };

  if (existing?.current && !Array.isArray(existing.current)) {
    const before = existing.current as Record<string, unknown>;
    const r = await saveDraft(ctx, 'photo', replace, { ...before, upload: saved.pathname, width: saved.width, height: saved.height, focus: null });
    if (!r.ok) {
      await deleteWebsitePhoto(saved.pathname);
      return json(422, r);
    }
    // A picture that was only ever a draft is not needed again.
    const live = (existing.live as Record<string, unknown> | null)?.upload;
    if (typeof before.upload === 'string' && before.upload !== live) await deleteWebsitePhoto(before.upload);
    return json(200, { ok: true, key: replace });
  }

  const key = `u-${websitePhotoId(saved.pathname)!.slice(0, 8)}`;
  const r = await saveDraft(ctx, 'photo', key, {
    key,
    title: nameFrom(original) || null,
    alt: '',
    width: saved.width,
    height: saved.height,
    artist: BUSINESS.legalName,
    license: 'Our own photo',
    licenseUrl: '',
    source: '',
    own: true,
    upload: saved.pathname,
    focus: null,
  });
  if (!r.ok) {
    await deleteWebsitePhoto(saved.pathname);
    return json(422, r);
  }
  return json(200, { ok: true, key });
};

export const ALL: APIRoute = () => json(405, { ok: false, error: 'Method not allowed.' });
