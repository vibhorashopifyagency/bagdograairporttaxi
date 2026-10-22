/**
 * Calendar dates for the admin's date range picker, written YYYY-MM-DD and
 * meaning Indian dates. Shared by the server (the label on the button) and
 * the browser (the calendar), so both always say the same thing. Weeks start
 * on Monday, as on the today board.
 */
export type Day = string;

const DAY_MS = 86400e3;
const ms = (d: Day) => Date.parse(`${d}T00:00:00Z`);
const asDate = (d: Day) => new Date(ms(d));
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export const shiftDay = (d: Day, n: number): Day => iso(ms(d) + n * DAY_MS);
export const monthStart = (d: Day): Day => `${d.slice(0, 7)}-01`;
export function shiftMonth(d: Day, n: number): Day {
  const x = asDate(monthStart(d));
  x.setUTCMonth(x.getUTCMonth() + n);
  return iso(x.getTime());
}
export const monthEnd = (d: Day): Day => shiftDay(shiftMonth(d, 1), -1);
/** 0 for Monday through 6 for Sunday. */
export const weekday = (d: Day) => (asDate(d).getUTCDay() + 6) % 7;
/** Days from `a` to `b`, counting both. */
export const daysIn = (a: Day, b: Day) => Math.round((ms(b) - ms(a)) / DAY_MS) + 1;

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...o });
const fD = fmt({ day: 'numeric' });
const fDM = fmt({ day: 'numeric', month: 'short' });
const fDMY = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const fMonth = fmt({ month: 'long', year: 'numeric' });
const fLong = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const monthTitle = (d: Day) => fMonth.format(asDate(d));
export const longDay = (d: Day) => fLong.format(asDate(d));
export const dayNumber = (d: Day) => Number(d.slice(8, 10));

const fIst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
/** Today in India, wherever the computer is. */
export const istToday = (now = new Date()): Day => fIst.format(now);

const fWd = fmt({ weekday: 'short' });
/**
 * A single date on a form field: "Today, Thu 22 Oct", "Mon 2 Nov", and the
 * year only when it is not this year ("Mon 4 Jan 2027").
 */
export function fieldDay(d: Day, today: Day): string {
  const near = d === today ? 'Today, ' : d === shiftDay(today, 1) ? 'Tomorrow, ' : d === shiftDay(today, -1) ? 'Yesterday, ' : '';
  return `${near}${fWd.format(asDate(d))} ${(d.slice(0, 4) === today.slice(0, 4) ? fDM : fDMY).format(asDate(d))}`;
}

/** "11 Sept 2026", "11–12 Sept 2026", "28 Sept – 3 Oct 2026", "From 11 Sept 2026", or "" for no dates. */
export function rangeLabel(from: Day | null, to: Day | null): string {
  if (from && to) {
    if (from === to) return fDMY.format(asDate(from));
    const sameYear = from.slice(0, 4) === to.slice(0, 4);
    if (sameYear && from.slice(0, 7) === to.slice(0, 7)) return `${fD.format(asDate(from))}–${fDMY.format(asDate(to))}`;
    return `${(sameYear ? fDM : fDMY).format(asDate(from))} – ${fDMY.format(asDate(to))}`;
  }
  if (from) return `From ${fDMY.format(asDate(from))}`;
  if (to) return `Until ${fDMY.format(asDate(to))}`;
  return '';
}

/** Quick picks, worked out from today. Each list offers the ones that make sense for it. */
export const PRESETS = {
  today: { label: 'Today', range: (t: Day): [Day, Day] => [t, t] },
  yesterday: { label: 'Yesterday', range: (t: Day): [Day, Day] => [shiftDay(t, -1), shiftDay(t, -1)] },
  tomorrow: { label: 'Tomorrow', range: (t: Day): [Day, Day] => [shiftDay(t, 1), shiftDay(t, 1)] },
  next7: { label: 'Next 7 days', range: (t: Day): [Day, Day] => [t, shiftDay(t, 6)] },
  last7: { label: 'Last 7 days', range: (t: Day): [Day, Day] => [shiftDay(t, -6), t] },
  last30: { label: 'Last 30 days', range: (t: Day): [Day, Day] => [shiftDay(t, -29), t] },
  thisWeek: { label: 'This week', range: (t: Day): [Day, Day] => [shiftDay(t, -weekday(t)), shiftDay(t, 6 - weekday(t))] },
  thisMonth: { label: 'This month', range: (t: Day): [Day, Day] => [monthStart(t), monthEnd(t)] },
  lastMonth: { label: 'Last month', range: (t: Day): [Day, Day] => [shiftMonth(t, -1), monthEnd(shiftMonth(t, -1))] },
  nextMonth: { label: 'Next month', range: (t: Day): [Day, Day] => [shiftMonth(t, 1), monthEnd(shiftMonth(t, 1))] },
};
export type PresetKey = keyof typeof PRESETS;
