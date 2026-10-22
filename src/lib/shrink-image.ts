/**
 * Browser side of the picture uploads (src/server/files.ts). A picture is
 * made small enough to send before it leaves the phone: drawn onto a canvas
 * at most `max` pixels wide and high and saved as a JPEG. Redrawing it also
 * drops the location and camera details phones keep inside photos.
 * Imported only from <script> tags in /admin/ pages.
 */

/** A UPI screenshot is tall and its small print must stay readable. */
export const SCREENSHOT_MAX = { w: 1200, h: 3000 };
/** Itinerary photos: the trip page shows them at most 720 px wide, twice that on sharp screens. */
export const PHOTO_MAX = { w: 1600, h: 1600 };

export const CANNOT_OPEN = 'This picture could not be opened here. Take a screenshot of it, or save it as a JPG, and choose that.';

export async function shrinkToJpeg(file: Blob, max: { w: number; h: number }, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max.w / img.naturalWidth, max.h / img.naturalHeight);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = c.getContext('2d')!;
    // A see-through PNG would turn black as a JPEG.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', quality));
    if (!blob) throw new Error('encode');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type Uploaded = { ok: true; id: string; key: string; src: string } | { ok: false; error: string };

/** Shrinks one picture and sends it to /admin/api/upload/ with `fields` (kind, booking, payment). */
export async function uploadPicture(file: File, max: { w: number; h: number }, fields: Record<string, string>): Promise<Uploaded> {
  let blob: Blob;
  try {
    blob = await shrinkToJpeg(file, max);
  } catch {
    return { ok: false, error: CANNOT_OPEN };
  }
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  body.append('file', blob, 'picture.jpg');
  try {
    const res = await fetch('/admin/api/upload/', { method: 'POST', body });
    const data = (await res.json().catch(() => null)) as Uploaded | null;
    if (data) return data;
  } catch {
    /* offline */
  }
  return { ok: false, error: 'The picture could not be sent. Check the connection and try again.' };
}
