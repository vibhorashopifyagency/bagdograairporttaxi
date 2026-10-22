/**
 * Pictures uploaded from the dashboard: payment screenshots and itinerary
 * photos. (The office QR code is kept in the database instead: one small
 * picture, src/server/payments.ts.)
 *
 * They live in a private Vercel Blob store, connected in the project's
 * Storage tab. Vercel adds BLOB_STORE_ID and signs the site in with its own
 * short-lived tokens, so there is no password to keep. Nothing in the store
 * is public: staff see a picture through /admin/files/<id>.jpg, and a
 * customer sees an itinerary photo through a signed /trip/photo/ address.
 * In development, without a store, they go to the .local-files folder.
 *
 * The browser shrinks every picture to a JPEG before sending it
 * (src/lib/shrink-image.ts), which also drops the location and camera
 * details phones keep in photos. The `files` table records the booking each
 * belongs to, so the 24-month clean-up and "Remove their details" delete the
 * pictures with the booking's other personal data (src/server/retention.ts).
 *
 * A picture deleted straight from Vercel's file browser is noticed the first
 * time anything asks for it, and every night: its row goes too, so no page
 * links to it again (a payment shows "Add the screenshot" once more, an
 * itinerary drops the photo). Pages also hide one that fails to load.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { del, get, list, put } from '@vercel/blob';
import { and, asc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { getDb, schema } from './db';
import { env, isProduction, requireEnv } from './env';
import { imageInfo } from './payments';
import { photoFile } from '../data/photo-library';

export type FileKind = 'payment' | 'itinerary';
export type FileRow = typeof schema.files.$inferSelect;

/** The largest picture taken. The browser sends 100 to 500 kB; Vercel refuses anything over 4.5 MB anyway. */
export const MAX_UPLOAD = 4_000_000;

export const NOT_READY = 'Photo storage is not connected yet. The admin connects it in Vercel (see the setup guide, step 2).';

/* ---------------- Where the files are ---------------- */

function store(): 'blob' | 'local' | null {
  if (env('BLOB_STORE_ID') || env('BLOB_READ_WRITE_TOKEN')) return 'blob';
  return isProduction() ? null : 'local';
}

/** False on a deployment with no Blob store connected; the upload buttons are hidden then. */
export const filesReady = () => store() !== null;

/** Only ever called with pathnames this file made, never with anything from a request. */
const localPath = (pathname: string) => join(process.cwd(), '.local-files', pathname);

async function writeStored(pathname: string, bytes: Uint8Array): Promise<void> {
  const s = store();
  if (s === 'blob') {
    await put(pathname, Buffer.from(bytes), { access: 'private', contentType: 'image/jpeg', addRandomSuffix: false });
  } else if (s === 'local') {
    await mkdir(dirname(localPath(pathname)), { recursive: true });
    await writeFile(localPath(pathname), bytes);
  } else {
    throw new Error(NOT_READY);
  }
}

/** Throws when the store cannot be reached, so a clean-up that could not delete a picture fails loudly and runs again. */
async function deleteStored(pathnames: string[]): Promise<void> {
  if (!pathnames.length) return;
  const s = store();
  if (s === 'blob') {
    for (let i = 0; i < pathnames.length; i += 100) await del(pathnames.slice(i, i + 100));
  } else if (s === 'local') {
    await Promise.all(pathnames.map((p) => rm(localPath(p), { force: true })));
  } else {
    throw new Error(`${pathnames.length} pictures could not be deleted: ${NOT_READY}`);
  }
}

const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

/** The picture itself, for /admin/files/ and /trip/photo/. `cache` is the Cache-Control to send. */
export async function fileResponse(row: Pick<FileRow, 'id' | 'pathname' | 'kind'>, request: Request, cache: string): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'image/jpeg',
    'Cache-Control': cache,
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
    'Content-Disposition': `inline; filename="${row.kind === 'payment' ? 'payment-screenshot' : 'trip-photo'}.jpg"`,
  };
  const s = store();
  if (s === 'blob') {
    const r = await get(row.pathname, { access: 'private', ifNoneMatch: request.headers.get('if-none-match') ?? undefined });
    if (!r) return forget([row.id], 'asked for').then(notFound);
    headers.ETag = r.blob.etag;
    return r.statusCode === 304 ? new Response(null, { status: 304, headers }) : new Response(r.stream, { headers });
  }
  if (s === 'local') {
    const bytes = await readFile(localPath(row.pathname)).catch((e: NodeJS.ErrnoException) => (e.code === 'ENOENT' ? 'gone' : null));
    if (bytes === 'gone') return forget([row.id], 'asked for').then(notFound);
    return bytes ? new Response(bytes, { headers }) : notFound();
  }
  return notFound();
}

/* ---------------- Saving ---------------- */

export type Upload = { bookingId: string; kind: FileKind; bytes: Uint8Array; actorId: string; paymentId?: string | null };

/** Checks and stores one picture. Returns an error for the person, or the new row. */
export async function saveUpload(u: Upload): Promise<{ error: string } | { file: FileRow }> {
  if (!filesReady()) return { error: NOT_READY };
  if (u.bytes.length > MAX_UPLOAD) return { error: 'That picture is too large. Choose it again: the page makes it smaller before sending.' };
  const info = imageInfo(u.bytes);
  if (info?.mime !== 'image/jpeg') return { error: 'That picture could not be read. Choose a photo or a screenshot.' };
  if (Math.min(info.w, info.h) < 50) return { error: 'That picture is too small to use. Choose another.' };
  if (Math.max(info.w, info.h) > 4000) return { error: 'That picture is too large. Choose it again: the page makes it smaller before sending.' };
  const id = randomUUID();
  const month = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);
  const pathname = `${u.kind === 'payment' ? 'payments' : 'itinerary'}/${month}/${id}.jpg`;
  await writeStored(pathname, u.bytes);
  try {
    const [row] = await getDb()
      .insert(schema.files)
      .values({ id, bookingId: u.bookingId, kind: u.kind, paymentId: u.paymentId ?? null, pathname, width: info.w, height: info.h, bytes: u.bytes.length, createdBy: u.actorId })
      .returning();
    return { file: row! };
  } catch (e) {
    await deleteStored([pathname]).catch(() => {});
    throw e;
  }
}

/* ---------------- Website photos ---------------- */

/*
 * Photos for the public website (the photo library, /admin/photos/). They
 * are not tied to a booking, so they have no row in `files` and no clean-up
 * touches them: the library entry (src/data/photo-library.ts) holds the
 * pathname, website/<id>.jpg. Each build reads them to make the website's
 * own files (scripts/content-photos.mjs); the original is only ever shown to
 * the admin, through /admin/photos/original/<id>.jpg.
 */

/** The smallest long side worth putting on the website: the large size is 1600 pixels. */
export const WEBSITE_PHOTO_MIN = 1200;

/** Stores one website photo, already a JPEG from the browser. */
export async function saveWebsitePhoto(bytes: Uint8Array): Promise<{ error: string } | { pathname: string; width: number; height: number }> {
  if (!filesReady()) return { error: NOT_READY };
  if (bytes.length > MAX_UPLOAD) return { error: 'That picture is too large. Choose it again: the page makes it smaller before sending.' };
  const info = imageInfo(bytes);
  if (info?.mime !== 'image/jpeg') return { error: 'That picture could not be read. Choose a JPG or PNG photo.' };
  if (Math.max(info.w, info.h) < WEBSITE_PHOTO_MIN) return { error: `That photo is too small for the website (${info.w} by ${info.h} pixels). Choose one at least ${WEBSITE_PHOTO_MIN} pixels across, ideally 1600 or more.` };
  if (Math.max(info.w, info.h) > 4000) return { error: 'That picture is too large. Choose it again: the page makes it smaller before sending.' };
  const pathname = `website/${randomUUID()}.jpg`;
  await writeStored(pathname, bytes);
  return { pathname, width: info.w, height: info.h };
}

/** The id in a website photo's pathname, for its admin address. */
export const websitePhotoId = (pathname: string) => pathname.match(/^website\/([0-9a-f-]{36})\.jpg$/)?.[1] ?? null;
export const websitePhotoSrc = (pathname: string) => `/admin/photos/original/${websitePhotoId(pathname)}.jpg`;

/** The original of a website photo, for the admin's library before it is published. */
export async function websitePhotoResponse(id: string, request: Request): Promise<Response> {
  if (!UUID_RE.test(id)) return notFound();
  const pathname = `website/${id}.jpg`;
  const headers: Record<string, string> = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' };
  const s = store();
  if (s === 'blob') {
    const r = await get(pathname, { access: 'private', ifNoneMatch: request.headers.get('if-none-match') ?? undefined });
    if (!r) return notFound();
    headers.ETag = r.blob.etag;
    return r.statusCode === 304 ? new Response(null, { status: 304, headers }) : new Response(r.stream, { headers });
  }
  if (s === 'local') {
    const bytes = await readFile(localPath(pathname)).catch(() => null);
    return bytes ? new Response(bytes, { headers }) : notFound();
  }
  return notFound();
}

/** Deletes a website photo's original that nothing will use again (an upload never published). */
export async function deleteWebsitePhoto(pathname: string): Promise<void> {
  if (websitePhotoId(pathname)) await deleteStored([pathname]).catch((e) => console.error('[files] could not delete', pathname, e));
}

/* ---------------- Finding them ---------------- */

export async function fileById(id: string): Promise<FileRow | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await getDb().select().from(schema.files).where(eq(schema.files.id, id));
  return row ?? null;
}

/** A booking's itinerary photos, oldest first, for the photo picker. */
export async function itineraryUploads(bookingId: string): Promise<FileRow[]> {
  const f = schema.files;
  return getDb().select().from(f).where(and(eq(f.bookingId, bookingId), eq(f.kind, 'itinerary'))).orderBy(asc(f.createdAt));
}

/** The screenshot attached to each of these payments. */
export async function screenshotsFor(paymentIds: string[]): Promise<Map<string, FileRow>> {
  const map = new Map<string, FileRow>();
  if (!paymentIds.length) return map;
  const rows = await getDb().select().from(schema.files).where(inArray(schema.files.paymentId, paymentIds));
  for (const r of rows) map.set(r.paymentId!, r);
  return map;
}

/* ---------------- Addresses and photo keys ---------------- */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** An uploaded photo in an itinerary is 'u:' and its id; library photos are plain keys. */
export const uploadKey = (id: string) => `u:${id}`;
export const uploadIdOf = (key: string): string | null => (key.startsWith('u:') && UUID_RE.test(key.slice(2)) ? key.slice(2) : null);

/** For signed-in staff. */
export const adminFileSrc = (id: string) => `/admin/files/${id}.jpg`;

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
function photoMac(id: string): string {
  const bytes = createHmac('sha256', requireEnv('BETTER_AUTH_SECRET')).update(`photo:${id}`).digest();
  let out = '';
  for (let i = 0; i < 12; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

/** For the customer's trip page: signed like the trip link, so it cannot be guessed from the id. */
export const tripPhotoSrc = (id: string) => `/trip/photo/${id}-${photoMac(id)}.jpg`;

/** The photo id in a /trip/photo/ address, or null when the signature is wrong. */
export function photoIdFromToken(token: string): string | null {
  const m = /^([0-9a-f-]{36})-([a-z2-9]{12})$/.exec(token);
  if (!m || !UUID_RE.test(m[1]!)) return null;
  const want = Buffer.from(photoMac(m[1]!));
  const got = Buffer.from(m[2]!);
  return want.length === got.length && timingSafeEqual(want, got) ? m[1]! : null;
}

/** Every photo key an itinerary uses. */
export const itineraryKeys = (d: { photos: string[]; days: { photo: string }[] }) => [...d.photos, ...d.days.map((x) => x.photo)];

/** Which of these keys are uploaded photos that still exist. Library photos are not uploads and are not checked. */
export async function liveUploads(keys: string[]): Promise<Set<string>> {
  const ids = [...new Set(keys.map(uploadIdOf).filter((x): x is string => Boolean(x)))];
  if (!ids.length) return new Set();
  const f = schema.files;
  const rows = await getDb().select({ id: f.id }).from(f).where(and(inArray(f.id, ids), eq(f.kind, 'itinerary')));
  return new Set(rows.map((r) => uploadKey(r.id)));
}

/** The itinerary without uploaded photos that no longer exist. */
export function withoutMissing<T extends { photos: string[]; days: { photo: string }[] }>(d: T, live: Set<string>): T {
  const ok = (k: string) => !uploadIdOf(k) || live.has(k);
  return { ...d, photos: d.photos.filter(ok), days: d.days.map((x) => (ok(x.photo) ? x : { ...x, photo: '' })) };
}

/** Where an itinerary photo key's picture is: the website's own copy, or an upload (the customer's signed address, or the admin's in a preview). */
export function photoSrc(key: string, width: 800 | 1600, forStaff = false): string {
  const id = uploadIdOf(key);
  if (!id) return photoFile(key, width);
  return forStaff ? adminFileSrc(id) : tripPhotoSrc(id);
}

/* ---------------- Removing them ---------------- */

/** Pictures the store no longer has: their rows go, so no page links to them again. */
async function forget(ids: string[], why: string): Promise<void> {
  if (!ids.length) return;
  await getDb().delete(schema.files).where(inArray(schema.files.id, ids));
  console.warn(`[files] ${ids.length} ${ids.length === 1 ? 'picture was' : 'pictures were'} missing from the store (${why}), so ${ids.length === 1 ? 'it is' : 'they are'} forgotten`);
}

/**
 * Nightly: pictures deleted in Vercel's file browser since the last run.
 * One listing of the store (an operation per 1,000 pictures). A store that
 * suddenly lacks most of them is more likely the wrong store connected than
 * a clean-out, so then nothing is forgotten and the log says so.
 */
export async function forgetDeletedFiles(): Promise<number> {
  const s = store();
  if (!s) return 0;
  const f = schema.files;
  // Not the last few minutes: an upload writes the picture first, then its row.
  const rows = await getDb().select({ id: f.id, pathname: f.pathname }).from(f).where(lt(f.createdAt, sql`now() - interval '10 minutes'`));
  if (!rows.length) return 0;
  let missing: string[];
  if (s === 'blob') {
    const have = new Set<string>();
    let cursor: string | undefined;
    do {
      const page = await list({ cursor, limit: 1000 });
      for (const b of page.blobs) have.add(b.pathname);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    missing = rows.filter((r) => !have.has(r.pathname)).map((r) => r.id);
  } else {
    const found = await Promise.all(rows.map((r) => access(localPath(r.pathname)).then(() => true, () => false)));
    missing = rows.filter((_, i) => !found[i]).map((r) => r.id);
  }
  if (missing.length > 10 && missing.length > rows.length / 2) {
    console.error(`[alert] ${missing.length} of ${rows.length} pictures are missing from the photo store. Check which Blob store is connected in Vercel (Storage). Nothing was changed.`);
    return 0;
  }
  await forget(missing, 'nightly check');
  return missing.length;
}

/**
 * Deletes these bookings' pictures from the store. Their rows are deleted
 * by the caller, in the same transaction as the rest of the booking's
 * personal data; if that fails, the next run finds the rows and tries again.
 */
export async function deleteBookingFiles(bookingIds: string[]): Promise<number> {
  if (!bookingIds.length) return 0;
  const rows = await getDb().select({ pathname: schema.files.pathname }).from(schema.files).where(inArray(schema.files.bookingId, bookingIds));
  await deleteStored(rows.map((r) => r.pathname));
  return rows.length;
}

/**
 * Pictures uploaded but never used, a day on: a screenshot chosen in Record
 * payment that was then cancelled, or a photo taken out of an itinerary
 * (both the draft and the copy sent to the customer). Run nightly.
 */
export async function sweepUnusedFiles(): Promise<number> {
  const f = schema.files;
  // Written out in full: in a one-table select Drizzle leaves column names bare, which the subquery would misread.
  const unused = sql`not exists (select 1 from itineraries it where it.booking_id = files.booking_id and (position(files.id::text in it.draft::text) > 0 or position(files.id::text in coalesce(it.published::text, '')) > 0))`;
  const rows = await getDb()
    .select({ id: f.id, pathname: f.pathname })
    .from(f)
    .where(and(lt(f.createdAt, sql`now() - interval '1 day'`), or(and(eq(f.kind, 'payment'), isNull(f.paymentId)), and(eq(f.kind, 'itinerary'), unused))))
    .limit(500);
  if (!rows.length) return 0;
  await deleteStored(rows.map((r) => r.pathname));
  await getDb().delete(f).where(inArray(f.id, rows.map((r) => r.id)));
  return rows.length;
}
