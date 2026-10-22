/**
 * Times of day for the admin's time field (TimeField.astro), written as
 * 24-hour HH:MM and shown as "2:30 PM". Shared by the server (the list and
 * the button's first label) and the browser.
 */
const pad = (n: number) => String(n).padStart(2, '0');
export const isTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** "14:30" reads "2:30 PM"; with `named`, noon and midnight say so, so nobody books the wrong night. */
export function timeLabel(v: string, named = true): string {
  if (!isTime(v)) return v;
  const [h, m] = v.split(':').map(Number) as [number, number];
  const t = `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
  return named && v === '00:00' ? `${t}, midnight` : named && v === '12:00' ? `${t}, noon` : t;
}

/** True inside a window such as 22:00 to 06:00, which may run past midnight. */
export const inWindow = (t: string, from: string, to: string) => (from > to ? t >= from || t < to : t >= from && t < to);

/**
 * The day in 15-minute steps. A time already saved off the steps (a booking
 * made for 10:35) gets its own row, so editing never moves it by accident.
 */
export function timeSlots(keep = ''): string[] {
  const list = Array.from({ length: 96 }, (_, i) => `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`);
  if (isTime(keep) && !list.includes(keep)) {
    list.push(keep);
    list.sort();
  }
  return list;
}
