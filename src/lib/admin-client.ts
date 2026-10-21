/**
 * Browser helpers for the admin popups. Imported only from <script> tags in
 * /admin/ pages; nothing here runs on the server.
 */
export { upiLink } from './upi';

export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

/**
 * Wires every <dialog>: buttons with data-open="id" open it, data-close and a
 * tap on the dimmed backdrop close it, and data-autoopen opens it on load
 * (after a form error, or when a quick action links here with ?do=...).
 */
export function openDialogs(): void {
  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    const opener = t.closest<HTMLElement>('[data-open]');
    if (opener && !(opener as HTMLButtonElement).disabled) {
      const dlg = document.getElementById(opener.dataset.open!) as HTMLDialogElement | null;
      dlg?.showModal();
      // data-focus="fieldName" puts the cursor straight into that box.
      if (opener.dataset.focus) dlg?.querySelector<HTMLInputElement>(`[name="${opener.dataset.focus}"]`)?.focus();
      return;
    }
    const closer = t.closest('[data-close]');
    if (closer) closer.closest('dialog')?.close();
    else if (t instanceof HTMLDialogElement) t.close();
  });
  document.querySelector<HTMLDialogElement>('dialog[data-autoopen]')?.showModal();
  // Leave the address bar clean so a reload does not reopen the popup.
  const url = new URL(location.href);
  if (url.searchParams.has('do') || url.searchParams.has('done')) {
    url.searchParams.delete('do');
    url.searchParams.delete('done');
    history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
  }
}

/** Driver forms: the pay box says "% of the fare" or "₹ a trip" to match the choice. */
export function wirePayFields(): void {
  document.querySelectorAll<HTMLElement>('[data-driver-fields]').forEach((box) => {
    const unit = box.querySelector<HTMLElement>('[data-pay-unit]');
    const input = box.querySelector<HTMLInputElement>('input[name$=payValue]');
    box.addEventListener('change', () => {
      const fixed = box.querySelector<HTMLInputElement>('input[name$=payType]:checked')?.value === 'fixed';
      if (unit) unit.textContent = fixed ? '₹ a trip' : '% of the fare';
      if (input) input.placeholder = fixed ? '800' : '25';
    });
  });
}

/** Notes on the booking's timeline that something was sent. Never blocks. */
export function logEvent(bookingId: string, type: 'qr_sent', amount?: number): void {
  fetch('/admin/api/booking-log/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bookingId, type, amount }),
    keepalive: true,
  }).catch(() => {});
}

/**
 * The QR code library, loaded only when a QR code is drawn. Nothing else on
 * a page waits for it, so the buttons and popups keep working even if it
 * fails to load.
 */
export const loadQr = () => import('uqr');

/**
 * A picture of the QR code with the amount and UPI ID under it, for the
 * phone's share sheet: WhatsApp receives it as a photo the customer can scan
 * from another phone or save and open in their UPI app.
 */
export async function drawQrCard(input: { text: string; amount: number; ref: string; upi: { id: string; payee: string } }): Promise<Blob> {
  const { encode } = await loadQr();
  const qr = encode(input.text, { ecc: 'M', border: 0 });
  const W = 720;
  const cell = Math.floor(520 / qr.size);
  const side = cell * qr.size;
  const top = 132;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = top + side + 210;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#111111';
  g.fillRect(0, 0, W, 96);
  g.fillStyle = '#a1e005';
  g.font = '700 34px Bricolage, Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('Bagdogra Airport Taxi', W / 2, 60);
  g.fillStyle = '#111111';
  const x0 = (W - side) / 2;
  qr.data.forEach((row, y) => row.forEach((on, x) => on && g.fillRect(x0 + x * cell, top + y * cell, cell, cell)));
  const y1 = top + side + 66;
  g.font = '800 48px Inter, system-ui, sans-serif';
  g.fillText(input.amount > 0 ? inr(input.amount) : 'Scan to pay', W / 2, y1);
  g.font = '500 26px Inter, system-ui, sans-serif';
  g.fillStyle = '#3d4451';
  g.fillText(`Booking ${input.ref} · ${input.upi.payee}`, W / 2, y1 + 48);
  g.fillText(`UPI ID: ${input.upi.id}`, W / 2, y1 + 86);
  g.font = '500 22px Inter, system-ui, sans-serif';
  g.fillStyle = '#5c6373';
  g.fillText('Scan with any UPI app', W / 2, y1 + 124);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}
