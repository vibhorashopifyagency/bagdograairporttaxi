/**
 * Email to the office, sent through Resend's HTTP API: a backup copy of each
 * new booking, and alerts when something fails (a booking the database could
 * not save, the nightly clean-up). Needs RESEND_API_KEY and MAIL_FROM (an
 * address on a domain verified in Resend, e.g. bookings@bagdograairporttaxi.com).
 * Without them it only writes to the server log, and the booking is still
 * saved and the WhatsApp message still sent.
 */
import { BUSINESS } from '../data/site';
import { env } from './env';

type BookingMail = {
  ref: string;
  tripName: string;
  pickupDate: string;
  pickupTime: string;
  flight?: string | null;
  pax: number;
  dropAddress?: string | null;
  customerName: string;
  customerPhone: string;
  fareServer: number;
  fareShown: number;
  fareMismatch: boolean;
  channel: string;
  /** Set when the customer's browser had to keep the booking and send it again later. */
  lateMinutes?: number;
};

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** One email through Resend: a line, a table of details, an optional HTML footer (a link). Never throws, and gives up after 4 seconds. */
async function send(subject: string, rows: [string, string][], intro: string, footerHtml = ''): Promise<boolean> {
  const key = env('RESEND_API_KEY');
  const from = env('MAIL_FROM');
  const to = env('BOOKING_EMAIL_TO') ?? BUSINESS.email;
  if (!key || !from || !to) return false;
  const text = [intro, '', ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n');
  const html =
    `<p>${esc(intro)}</p><table cellpadding="6" style="border-collapse:collapse">` +
    rows.map(([k, v]) => `<tr><td style="color:#5c6373">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join('') +
    `</table>${footerHtml}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
      signal: controller.signal,
    });
    if (!res.ok) console.error('[mail] Resend error', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (e) {
    console.error('[mail] email failed', e);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- Alerts ---------------- */

// Per server instance: one alert per booking reference, and at most 20 an hour,
// so a database outage while customers keep retrying cannot flood the inbox.
const alerted = new Set<string>();
let hourStart = 0;
let hourCount = 0;
function mayAlert(key: string): boolean {
  const now = Date.now();
  if (now - hourStart > 3600e3) {
    hourStart = now;
    hourCount = 0;
  }
  if (alerted.has(key) || hourCount >= 20) return false;
  alerted.add(key);
  if (alerted.size > 500) alerted.clear();
  hourCount++;
  return true;
}

const reason = (e: unknown) => {
  const x = e as { code?: string; message?: string; cause?: { code?: string; message?: string } } | undefined;
  return [x?.code ?? x?.cause?.code, (x?.message ?? x?.cause?.message ?? String(e)).slice(0, 200)].filter(Boolean).join(': ');
};

/**
 * A booking reached the server but could not be saved (the database did not
 * answer). The customer's browser keeps it and tries again on their next
 * visit, but that may be days away, so the office gets the details now.
 */
export async function alertBookingNotSaved(
  b: { ref: string; name: string; phone: string; date: string; time: string; trip: string; pax: number; fareShown: number; channel: string },
  error: unknown,
): Promise<void> {
  console.error(`[alert] booking ${b.ref} was not saved`, error);
  if (!mayAlert(`booking:${b.ref}`)) return;
  await send(
    `Booking not saved: ${b.ref}, ${b.name}, ${b.date}`,
    [
      ['Reference', b.ref],
      ['Trip', b.trip],
      ['Pickup', `${b.date} at ${b.time}`],
      ['Passengers', String(b.pax)],
      ['Name', b.name],
      ['Mobile', b.phone],
      ['Fare shown', inr(b.fareShown)],
      ['Sent from', b.channel === 'payment' ? 'Pay advance button (they may have paid by UPI)' : 'Confirm on WhatsApp button'],
      ['What went wrong', reason(error)],
    ],
    'A customer sent this booking from the website, but the database did not answer, so it is not in the dashboard yet. Their browser will send it again on their next visit. Contact them now so the trip is not missed.',
    `<p><a href="https://wa.me/${esc(b.phone.replace(/\D/g, ''))}">Open a WhatsApp chat with ${esc(b.name)}</a></p>`,
  );
}

/** Something that runs by itself failed (the nightly clean-up). */
export async function alertJobFailed(job: string, error: unknown): Promise<void> {
  console.error(`[alert] ${job} failed`, error);
  if (!mayAlert(`job:${job}:${new Date().toISOString().slice(0, 10)}`)) return;
  await send(`Website job failed: ${job}`, [['Job', job], ['What went wrong', reason(error)]], `The ${job} did not finish. It runs again on its next schedule; if this email comes again, check the Vercel logs.`);
}

export async function sendBookingEmail(b: BookingMail): Promise<void> {
  const rows: [string, string][] = [
    ['Reference', b.ref],
    ['Trip', b.tripName],
    ['Pickup', `${b.pickupDate} at ${b.pickupTime}`],
    ['Flight or train', b.flight || '–'],
    ['Passengers', String(b.pax)],
    ['Drop', b.dropAddress || '–'],
    ['Name', b.customerName],
    ['Mobile', `+${b.customerPhone}`],
    ['Fare', b.fareMismatch ? `${inr(b.fareServer)} (the page showed ${inr(b.fareShown)}: check before confirming)` : inr(b.fareServer)],
    ['Sent from', b.channel === 'payment' ? 'Pay advance button' : 'Confirm on WhatsApp button'],
  ];
  await send(
    `New booking ${b.ref}: ${b.customerName}, ${b.pickupDate}${b.lateMinutes ? ' (reached us late)' : ''}`,
    rows,
    b.lateMinutes ? `New booking request from the website. It reached the dashboard ${b.lateMinutes} minutes after it was made: the database was unavailable at the time.` : 'New booking request from the website.',
    `<p><a href="https://wa.me/${esc(b.customerPhone)}">Open WhatsApp chat with ${esc(b.customerName)}</a></p>`,
  );
}
