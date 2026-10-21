/**
 * Wording for itineraries, shared by the admin popup (in the browser) and the
 * server, so the preview and what is saved always read the same.
 *
 * Message templates use {placeholders}. `{driver|Your driver}` means "the
 * driver's name, or 'Your driver' when there is none yet".
 */

export type TemplateValues = {
  first: string;
  place: string;
  driver: string;
  driverPhone: string;
  pickup: string;
  time: string;
  date: string;
  car: string;
  /** "an Innova Crysta", "a Sedan". */
  aCar: string;
  vehicleNumber: string;
  title: string;
};

export const withArticle = (car: string) => (car ? `${/^(SUV|[AEIOU])/i.test(car.trim()) ? 'an' : 'a'} ${car.trim()}` : '');

export type Template = { id: string; name: string; text: string; custom?: boolean };

export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'welcome',
    name: 'Welcome',
    text: 'Namaste {first} ji, your {place} trip is ready. {driver|Your driver} will meet you at {pickup} at {time} on {date} in {aCar}. Your day-by-day plan, hotels and photos are on the link below.',
  },
  {
    id: 'day-before',
    name: 'Day before pickup',
    text: 'Namaste {first} ji, a reminder that your pickup is tomorrow, {date}, at {time} from {pickup}. {driver|Your driver} will be there in {aCar} {vehicleNumber}. Your full plan is on the link below. Safe travels.',
  },
  {
    id: 'thank-you',
    name: 'Thank you for travelling',
    text: 'Thank you for travelling with us, {first} ji. We hope the hills were kind to you. Your trip details stay on the link below, and we would be glad to plan your next one.',
  },
];

export function fillTemplate(text: string, v: TemplateValues): string {
  return text
    .replace(/\{(\w+)(?:\|([^}]*))?\}/g, (_, key: string, fallback?: string) => {
      const value = (v as Record<string, string>)[key];
      return value?.trim() ? value.trim() : (fallback ?? '');
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([.,])/g, '$1')
    .trim();
}

/**
 * Turns a message written for one customer back into a template, by putting
 * the placeholders back where this booking's details appear. Longest values
 * first, so "Bagdogra Airport, arrivals gate" wins over "Bagdogra Airport".
 */
export function toTemplate(message: string, v: TemplateValues): string {
  const pairs = (Object.entries(v) as [keyof TemplateValues, string][])
    .filter(([, value]) => value.trim().length >= 2)
    .sort((a, z) => z[1].length - a[1].length);
  let out = message;
  for (const [key, value] of pairs) out = out.split(value.trim()).join(`{${key}}`);
  return out;
}

const dayFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
const shortFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
export const validDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(asDate(day).getTime());
export const plusDays = (day: string, n: number) => new Date(asDate(day).getTime() + n * 86400e3).toISOString().slice(0, 10);

/** "Sat 14 Nov" for day `i` (0-based) of a trip starting on `start`. */
export const dayDate = (start: string, i: number) => (validDay(start) ? dayFmt.format(asDate(plusDays(start, i))) : '');
/** "14 Nov". */
export const shortDate = (day: string) => (validDay(day) ? shortFmt.format(asDate(day)) : '');

/** "Sat 14 to Tue 17 Nov 2026", or one date for a one-day trip. */
export function dateRange(start: string, end: string): string {
  if (!validDay(start)) return '';
  if (!validDay(end) || end <= start) return longFmt.format(asDate(start));
  const a = asDate(start);
  const z = asDate(end);
  const sameMonth = a.getUTCMonth() === z.getUTCMonth() && a.getUTCFullYear() === z.getUTCFullYear();
  const from = sameMonth ? new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric' }).format(a) : dayFmt.format(a);
  return `${from} to ${longFmt.format(z)}`;
}

/** "14 to 17 Nov", for the WhatsApp preview card. */
export function shortRange(start: string, end: string): string {
  if (!validDay(start)) return '';
  if (!validDay(end) || end <= start) return shortDate(start);
  const a = asDate(start);
  const z = asDate(end);
  return a.getUTCMonth() === z.getUTCMonth() ? `${a.getUTCDate()} to ${shortDate(end)}` : `${shortDate(start)} to ${shortDate(end)}`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

/** "+91 98301 22745" from "919830122745". */
export const phoneLabel = (d: string) => (d.length === 12 && d.startsWith('91') ? `+91 ${d.slice(2, 7)} ${d.slice(7)}` : d ? `+${d}` : '');

/** The text that goes into WhatsApp: the message, the link, the money line. */
export function whatsappText(input: { message: string; link: string; balance: number; showQr: boolean; inr: (n: number) => string }): string {
  const money =
    input.balance > 0
      ? `Balance before the trip: ${input.inr(input.balance)}.${input.showQr ? ' Our UPI QR code is on the page.' : ''}`
      : '';
  return [input.message.trim(), input.link, [money, 'Team Bagdogra Airport Taxi'].filter(Boolean).join('\n')].filter(Boolean).join('\n\n');
}
