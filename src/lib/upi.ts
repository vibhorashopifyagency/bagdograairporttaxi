/**
 * The office UPI details: the QR code picture the admin uploads on the
 * Payments page, the name customers see and the UPI ID. Used by the server
 * and the admin popups.
 */

/** The uploaded QR code picture. `text` is what the QR code says, read in the admin's browser ('' when it could not be read). */
export type UpiQr = { sha: string; mime: 'image/png' | 'image/jpeg'; w: number; h: number; text: string };
export type Upi = { id: string; payee: string; qr: UpiQr | null };

/** Where the picture is served. A new picture gets a new address, so browsers may keep it for good. */
export const qrSrc = (qr: Pick<UpiQr, 'sha' | 'mime'>) => `/trip/qr/${qr.sha}.${qr.mime === 'image/png' ? 'png' : 'jpg'}`;

/**
 * The standard UPI payment link. Any UPI app (GPay, PhonePe, Paytm, BHIM)
 * opens it with the payee, amount and booking reference filled in. Needs
 * the UPI ID; the uploaded QR code itself carries no amount.
 */
export function upiLink(upi: { id: string; payee: string }, amount: number, ref: string): string {
  // The UPI ID goes in as written (NPCI's own examples do not encode the @);
  // it only ever holds letters, digits, . - _ and @ (checked when saved).
  const parts = [`pa=${upi.id}`, `pn=${encodeURIComponent(upi.payee)}`, 'cu=INR'];
  if (amount > 0) parts.push(`am=${amount.toFixed(2)}`);
  if (ref) parts.push(`tn=${encodeURIComponent(`Booking ${ref}`)}`);
  return `upi://pay?${parts.join('&')}`;
}

/**
 * The UPI ID and name inside a QR code's text, or null when it is not a UPI
 * QR code. Reads both kinds in use: "upi://pay?pa=...&pn=..." (Google Pay,
 * PhonePe, Paytm, BHIM) and Bharat QR, the EMV format on bank merchant
 * stands, where the UPI ID sits under NPCI's id A000000524.
 */
export function readUpiText(raw: string): { id: string; payee: string } | null {
  const text = raw.trim();
  if (/^upi:\/\/pay\?/i.test(text)) {
    const q = new URLSearchParams(text.slice(text.indexOf('?') + 1));
    const id = q.get('pa')?.trim() ?? '';
    return id ? { id, payee: q.get('pn')?.trim() ?? '' } : null;
  }
  if (!text.startsWith('000201')) return null;
  const tlv = (s: string) => {
    const out = new Map<string, string>();
    for (let i = 0; i + 4 <= s.length; ) {
      const len = Number(s.slice(i + 2, i + 4));
      if (!Number.isInteger(len)) break;
      out.set(s.slice(i, i + 2), s.slice(i + 4, i + 4 + len));
      i += 4 + len;
    }
    return out;
  };
  const top = tlv(text);
  for (const [tag, value] of top) {
    const n = Number(tag);
    if (n < 26 || n > 51) continue;
    const sub = tlv(value);
    if (sub.get('00')?.toUpperCase() === 'A000000524' && sub.get('01')) return { id: sub.get('01')!.trim(), payee: top.get('59')?.trim() ?? '' };
  }
  return null;
}
