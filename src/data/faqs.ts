import type { Faq } from './routes';
import { POLICY } from './site';

/** Site-wide questions, answered first in one or two sentences. Used on the
 * homepage, /faq/ and in llms-full.txt. */
export const GENERAL_FAQS: Faq[] = [
  {
    q: 'How do I book a taxi from Bagdogra Airport?',
    a: 'Choose your route and car on our booking page, pay a ' +
      `${POLICY.advancePercent}% advance by UPI or card, and you get a confirmation on WhatsApp straight away. The driver’s name, photo and car number follow the evening before your trip.`,
  },
  {
    q: 'What if my flight is delayed?',
    a: `We track your flight number, so the driver arrives when you land. Waiting is free for ${POLICY.freeWaitMinutes} minutes after the actual landing time, and a delay never cancels the booking.`,
  },
  {
    q: 'What is your cancellation policy?',
    a: `Cancel up to ${POLICY.freeCancelHours} hours before pickup for a full refund of your advance. Inside ${POLICY.freeCancelHours} hours we refund ${POLICY.lateCancelRefundPercent}%. Refunds reach your account within ${POLICY.refundDays} working days.`,
  },
  {
    q: 'Is the fare fixed, or are there extra charges?',
    a: `The fare you see is the fare you pay. It includes fuel, tolls, parking, driver allowance and GST. The only extras are a flat ₹${POLICY.nightCharge} for pickups between ${POLICY.nightChargeFrom} and ${POLICY.nightChargeTo}, and permit fees for protected areas in Sikkim.`,
  },
  {
    q: 'Is it safe to travel at night, or alone, from Bagdogra?',
    a: 'Yes. Every driver is verified with police records and has years of hill driving. Your trip is shared live with our 24-hour office, and solo travellers can share the car number and live location with family from WhatsApp.',
  },
  {
    q: 'Do I need a permit to visit Sikkim?',
    a: 'Indian citizens need no permit for Gangtok, Pelling or Namchi. Tsomgo Lake, Nathula and North Sikkim need a protected-area permit, which we arrange. Foreign nationals need a Restricted Area Permit for all of Sikkim.',
  },
  {
    q: 'How can I pay?',
    a: 'Pay the advance online by UPI, debit or credit card, or net banking through a secure payment gateway. Pay the balance to the driver in cash or UPI at the end of the trip.',
  },
  {
    q: 'Do you pick up from NJP railway station and Siliguri?',
    a: 'Yes. We pick up from Bagdogra Airport, NJP station, Siliguri Junction and any hotel or home in Siliguri, at the same fares.',
  },
];
