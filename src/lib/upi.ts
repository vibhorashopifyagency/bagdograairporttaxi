/**
 * The standard UPI payment link. Any UPI app (GPay, PhonePe, Paytm, BHIM)
 * opens it with the payee, amount and booking reference filled in, and the
 * same text makes the QR code. Used by the server and the admin popups.
 */
export type Upi = { id: string; payee: string };

export function upiLink(upi: Upi, amount: number, ref: string): string {
  // The UPI ID goes in as written (NPCI's own examples do not encode the @);
  // it only ever holds letters, digits, . - _ and @ (checked when saved).
  const parts = [`pa=${upi.id}`, `pn=${encodeURIComponent(upi.payee)}`, 'cu=INR'];
  if (amount > 0) parts.push(`am=${amount.toFixed(2)}`);
  if (ref) parts.push(`tn=${encodeURIComponent(`Booking ${ref}`)}`);
  return `upi://pay?${parts.join('&')}`;
}
