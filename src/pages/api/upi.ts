import type { APIRoute } from 'astro';
import { qrSrc } from '../../lib/upi';
import { getUpi } from '../../server/payments';

export const prerender = false;

/**
 * GET: the office UPI details for the "Pay the advance by UPI" popup on
 * /book/: the QR code picture the admin uploaded, the name it pays and the
 * UPI ID. The same as the printed QR code at the office, so nothing private.
 * The booking page itself stays pre-built HTML; it asks for this only when
 * someone presses the button. Cached a minute, so a new picture shows soon.
 */
export const GET: APIRoute = async () => {
  const headers = { 'Content-Type': 'application/json', 'X-Robots-Tag': 'noindex' };
  try {
    const upi = await getUpi();
    const body = upi
      ? { ok: true, payee: upi.payee, id: upi.id, qr: upi.qr ? { src: qrSrc(upi.qr), w: upi.qr.w, h: upi.qr.h } : null }
      : { ok: true, payee: '', id: '', qr: null };
    return new Response(JSON.stringify(body), { headers: { ...headers, 'Cache-Control': 'public, max-age=60, s-maxage=60' } });
  } catch (e) {
    console.error('[upi] could not read the UPI details', e);
    return new Response(JSON.stringify({ ok: false }), { status: 503, headers: { ...headers, 'Cache-Control': 'no-store' } });
  }
};
