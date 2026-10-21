/**
 * Backup email for each new booking, sent through Resend's HTTP API.
 * Needs RESEND_API_KEY and MAIL_FROM (an address on a domain verified in
 * Resend, e.g. bookings@bagdograairporttaxi.com). Without them it does
 * nothing, and the booking is still saved and the WhatsApp message still sent.
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
};

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function sendBookingEmail(b: BookingMail): Promise<void> {
  const key = env('RESEND_API_KEY');
  const from = env('MAIL_FROM');
  const to = env('BOOKING_EMAIL_TO') ?? BUSINESS.email;
  if (!key || !from || !to) return;

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
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html =
    `<p>New booking request from the website.</p><table cellpadding="6" style="border-collapse:collapse">` +
    rows.map(([k, v]) => `<tr><td style="color:#5c6373">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join('') +
    `</table><p><a href="https://wa.me/${esc(b.customerPhone)}">Open WhatsApp chat with ${esc(b.customerName)}</a></p>`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New booking ${b.ref}: ${b.customerName}, ${b.pickupDate}`,
        text,
        html,
      }),
      signal: controller.signal,
    });
    if (!res.ok) console.error('[mail] Resend error', res.status, await res.text().catch(() => ''));
  } catch (e) {
    console.error('[mail] booking email failed', e);
  } finally {
    clearTimeout(timer);
  }
}
