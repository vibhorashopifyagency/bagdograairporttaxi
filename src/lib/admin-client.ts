/**
 * Browser helpers for the admin popups. Imported only from <script> tags in
 * /admin/ pages; nothing here runs on the server.
 */
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
 * The office QR code picture with the amount to pay under it, for the
 * phone's share sheet: WhatsApp receives it as a photo the customer can scan
 * from another phone, or save and open from their UPI app's scanner. The
 * uploaded picture is drawn whole and unchanged, only scaled to fit.
 */
export async function drawQrCard(input: { src: string; amount: number; ref: string; payee: string; id: string }): Promise<Blob> {
  const img = new Image();
  img.src = input.src;
  await img.decode();
  const W = 900;
  const scale = Math.min(780 / img.naturalWidth, 960 / img.naturalHeight, 2);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const top = 150;
  const lines = [`Booking ${input.ref} · ${input.payee}`, input.id && `UPI ID: ${input.id}`].filter(Boolean);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = top + h + 80 + lines.length * 46 + 100;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#111111';
  g.fillRect(0, 0, W, 110);
  g.fillStyle = '#a1e005';
  g.font = '700 40px Bricolage, Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('Bagdogra Airport Taxi', W / 2, 70);
  // Enlarging a small QR code stays sharp without smoothing; shrinking needs it.
  g.imageSmoothingEnabled = scale < 1;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, (W - w) / 2, top, w, h);
  let y = top + h + 80;
  g.fillStyle = '#111111';
  g.font = '800 56px Inter, system-ui, sans-serif';
  g.fillText(input.amount > 0 ? `Pay ${inr(input.amount)}` : 'Scan to pay', W / 2, y);
  g.font = '500 30px Inter, system-ui, sans-serif';
  g.fillStyle = '#3d4451';
  for (const line of lines) g.fillText(line, W / 2, (y += 46));
  g.font = '500 26px Inter, system-ui, sans-serif';
  g.fillStyle = '#5c6373';
  g.fillText(input.amount > 0 ? `Scan with any UPI app and enter ${inr(input.amount)}` : 'Scan with any UPI app', W / 2, (y += 50));
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}
