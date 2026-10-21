// Fills the local database with made-up customers, bookings, timelines and
// payments so the admin pages have something to show while they are built.
//   npm run db:seed              replaces earlier dummy data with a fresh set
//   npm run db:seed -- --remove  removes the dummy data and adds nothing
//
// Dates are worked out from the moment it runs (pickups earlier and later
// today, replies waiting a few minutes, last month's trips), so run it again
// on another day for a board that looks current. The same people, routes and
// amounts come back each time.
//
// It refuses any database that is not on this computer, so it can never
// touch Neon. Dummy bookings are marked with ip_hash 'dummy-data', which is
// how --remove finds them, and every dummy mobile number starts +91 00000,
// so a WhatsApp button on a dummy booking cannot reach a real person.
//
// The drivers are put on the drivers list (a driver of the same name already
// there is reused), taxi balances are collected by the driver after the trip
// as the owner decided, and each driver has handed over and been paid up to
// a few days ago. Those handovers and payouts carry the note in DUMMY_NOTE,
// and drivers the seed added carry it too, which is how --remove finds them.
//
// Needs Node 22.18 or later: it reads the fare tables straight from src/data.
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { asc, eq, inArray } from 'drizzle-orm';
import pg from 'pg';
import { PACKAGES } from '../src/data/packages.ts';
import { ROUTES } from '../src/data/routes.ts';
import { POLICY } from '../src/data/site.ts';
import { VEHICLES } from '../src/data/vehicles.ts';
import * as schema from '../src/server/db/schema.ts';

const MARK = 'dummy-data';
const DUMMY_NOTE = 'Dummy entry (npm run db:seed)';
const removeOnly = process.argv.includes('--remove');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[seed] DATABASE_URL is not set. Start the local database with `npm run db:local` and see docs/admin-setup.md.');
  process.exit(1);
}
const host = new URL(url).hostname;
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) {
  console.error(`[seed] DATABASE_URL points at ${host}. Dummy data only goes into the local database (npm run db:local).`);
  process.exit(1);
}

/* ---------------- Dates in India ---------------- */

const IST = 5.5 * 3600e3;
const NOW = Date.now();
const MIN = 60e3;
const HOUR = 3600e3;
const DAY = 86400e3;
const dayOf = (ms) => new Date(ms + IST).toISOString().slice(0, 10);
const clockOf = (ms) => new Date(ms + IST).toISOString().slice(11, 16);
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const at = (day, time) => Date.parse(`${day}T${time}:00+05:30`);
const today = dayOf(NOW);
/** Monday of this week, the way the "wins this week" card counts. */
const weekStart = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));

/* ---------------- Repeatable randomness ---------------- */

let state = 20261021;
function rand() {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const chance = (p) => rand() < p;
const digits = (n) => Array.from({ length: n }, () => between(0, 9)).join('');
/** A pickup time on a five-minute mark. */
const timeBetween = (fromHour, toHour) => `${String(between(fromHour, toHour)).padStart(2, '0')}:${String(between(0, 11) * 5).padStart(2, '0')}`;

/* ---------------- The cast ---------------- */

const FIRST = [
  'Ananya', 'Rohit', 'Priya', 'Sourav', 'Neha', 'Arjun', 'Kavita', 'Debashis', 'Meera', 'Vikram', 'Sneha', 'Rahul',
  'Pooja', 'Aditya', 'Ritu', 'Sanjay', 'Nisha', 'Karan', 'Shreya', 'Amit', 'Lakshmi', 'Imran', 'Farah', 'Gaurav',
  'Swati', 'Manoj', 'Divya', 'Suresh', 'Ankita', 'Harpreet', 'Rajesh', 'Tanvi', 'Abhishek', 'Ishita', 'Varun',
  'Sunita', 'Nikhil', 'Moumita', 'Kunal', 'Ravi', 'Payal', 'Siddharth', 'Rekha', 'Joydeep', 'Aparna',
];
const LAST = [
  'Sharma', 'Agarwal', 'Menon', 'Ghosh', 'Gupta', 'Reddy', 'Joshi', 'Roy', 'Iyer', 'Singh', 'Patil', 'Mehta',
  'Bansal', 'Kulkarni', 'Chatterjee', 'Verma', 'Thakur', 'Malhotra', 'Banerjee', 'Desai', 'Khan', 'Jain', 'Mishra',
  'Pillai', 'Rao', 'Nair', 'Das', 'Kaur', 'Bose', 'Shah', 'Sen', 'Mukherjee', 'Kapoor', 'Yadav', 'Bhatt', 'Saha', 'Dutta',
];
const VISITORS = ['Emma Clarke', 'Daniel Weber', 'Yuki Tanaka', 'Tenzing Bhutia', 'Pema Lepcha', 'Sophie Martin'];
const CUSTOMER_NOTES = [
  'Prefers an Innova. Travels with an elderly parent.',
  'Repeat customer. Ask for Sonam as the driver if he is free.',
  'Corporate trips for her office. Wants a GST bill.',
  'Gets car sick on hill roads: book the front seat, stop at Rongpo.',
];

const usedNames = new Set();
const customers = [];
function newCustomer() {
  let name = '';
  do name = chance(0.07) ? pick(VISITORS) : `${pick(FIRST)} ${pick(LAST)}`;
  while (usedNames.has(name));
  usedNames.add(name);
  const c = {
    id: randomUUID(),
    name,
    phone: `9100000${String(customers.length + 1).padStart(5, '0')}`,
    email: chance(0.25) ? `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com` : null,
    notes: null,
    bookings: [],
  };
  customers.push(c);
  return c;
}
/** Mostly new faces, sometimes someone who has booked before. */
const someone = () => (customers.length > 8 && chance(0.12) ? pick(customers.filter((c) => c.phone)) : newCustomer());

const DRIVERS = [
  ['Bikash Rai', 'WB 73 E 4521'],
  ['Sonam Sherpa', 'WB 74 K 1187'],
  ['Dawa Tamang', 'SK 01 J 3390'],
  ['Pradip Barman', 'WB 73 F 9024'],
  ['Raju Thapa', 'WB 76 A 6612'],
  ['Nima Lama', 'SK 04 P 2268'],
  ['Subash Chhetri', 'WB 73 G 1450'],
].map(([name, vehicleNumber], i) => ({ name, vehicleNumber, phone: `91000009900${i + 1}` }));

const FLIGHTS = ['6E 6152', '6E 5307', 'AI 2779', 'IX 1561', 'QP 1542', '6E 2287', 'SG 3271', '6E 7214', 'AI 721'];
const TRAINS = ['12343 Darjeeling Mail', '12377 Padatik Express', '12041 Shatabdi Express'];
const NOTES = [
  'Child seat needed.',
  'Two large suitcases and a pram.',
  'Wants a photo stop at a tea garden on the way.',
  'Asked for a Hindi-speaking driver.',
  'Flight often late in the evening: driver to check the arrival board.',
  'Elderly passenger, please help with the bags.',
];

/** Popular trips appear more than once, so they come up more often. */
const TAXI_TRIPS = [
  ['bagdogra-airport-to-darjeeling-taxi', 6],
  ['bagdogra-airport-to-gangtok-taxi', 6],
  ['bagdogra-airport-to-siliguri-taxi', 3],
  ['njp-to-darjeeling-taxi', 3],
  ['njp-to-gangtok-taxi', 3],
  ['bagdogra-airport-to-kalimpong-taxi', 2],
  ['gangtok-to-bagdogra-airport-taxi', 3],
  ['darjeeling-to-bagdogra-airport-taxi', 3],
  ['bagdogra-airport-to-pelling-taxi', 1],
  ['bagdogra-airport-to-mirik-taxi', 1],
  ['bagdogra-airport-to-lataguri-taxi', 1],
  ['bagdogra-airport-to-njp-taxi', 1],
  ['siliguri-to-gangtok-taxi', 1],
].flatMap(([slug, n]) => Array(n).fill(slug));
const PACKAGE_TRIPS = [
  'darjeeling-gangtok-tour-package',
  'darjeeling-gangtok-tour-package',
  'gangtok-tsomgo-nathula-tour-package',
  'north-sikkim-lachung-yumthang-tour-package',
  'darjeeling-tour-package',
  'dooars-jungle-safari-tour-package',
  'sikkim-darjeeling-honeymoon-package',
  'silk-route-zuluk-tour-package',
];

const routeBySlug = (slug) => ROUTES.find((r) => r.slug === slug);
const packageBySlug = (slug) => PACKAGES.find((p) => p.slug === slug);
const carByKey = (key) => VEHICLES.find((v) => v.key === key);
for (const slug of TAXI_TRIPS) if (!routeBySlug(slug)) throw new Error(`[seed] no route ${slug} in src/data/routes.ts`);
for (const slug of PACKAGE_TRIPS) if (!packageBySlug(slug)) throw new Error(`[seed] no package ${slug} in src/data/packages.ts`);

/* ---------------- Fares, the same rules as src/server/fares.ts ---------------- */

const isNight = (time) => time >= POLICY.nightChargeFrom || time < POLICY.nightChargeTo;
const advanceOf = (total) => Math.round((total * POLICY.advancePercent) / 100);

function carFor(pax, kind) {
  if (pax > 6) return 'traveller';
  if (pax > 4) return pick(['suv', 'innova']);
  return kind === 'package' ? pick(['suv', 'innova', 'innova']) : pick(['sedan', 'sedan', 'suv', 'innova']);
}

/* ---------------- Bookings ---------------- */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const usedRefs = new Set();
function newRef() {
  let ref = '';
  do ref = `BAT-${Array.from({ length: 6 }, () => pick(ALPHABET)).join('')}`;
  while (usedRefs.has(ref));
  usedRefs.add(ref);
  return ref;
}

const PATH = {
  new: [],
  contacted: ['contacted'],
  confirmed: ['contacted', 'confirmed'],
  driver_assigned: ['contacted', 'confirmed', 'driver_assigned'],
  completed: ['contacted', 'confirmed', 'driver_assigned', 'completed'],
  cancelled: ['contacted', 'confirmed', 'cancelled'],
  no_show: ['contacted', 'confirmed', 'driver_assigned', 'no_show'],
};

const trips = [];

/**
 * One booking with its timeline and payments. `created` and every later
 * step are kept in order and never later than now.
 */
function trip(o) {
  const customer = o.customer ?? someone();
  const kind = o.package ? 'package' : 'taxi';
  const pax = o.pax ?? (kind === 'package' ? between(2, 5) : between(1, 4));
  const vehicle = o.vehicle ?? carFor(pax, kind);
  const car = carByKey(vehicle);
  const time = o.time ?? (chance(0.08) ? pick(['22:30', '23:15', '05:30']) : timeBetween(6, 20));
  const source = o.source ?? (chance(0.2) ? 'staff' : 'website');
  const channel = source === 'staff' ? 'manual' : (o.channel ?? (chance(0.15) ? 'payment' : 'whatsapp'));

  let tripName;
  let fareServer;
  const route = o.route ? routeBySlug(o.route) : null;
  const pkg = o.package ? packageBySlug(o.package) : null;
  if (route) {
    fareServer = route.fares[vehicle] + (isNight(time) ? POLICY.nightCharge : 0);
    tripName = `${route.from} to ${route.to} · ${car.name}`;
  } else if (pkg) {
    fareServer = pkg.fromPrice * pax;
    tripName = `${pkg.name} (${pkg.nights}N/${pkg.days}D) · ${car.name}`;
  } else {
    fareServer = o.agreed;
    tripName = `${o.custom} · ${car.name}`;
  }
  const fareTotal = o.agreed ?? fareServer;
  const fareShown = source === 'staff' ? fareTotal : (o.fareShown ?? fareServer);
  const pickup = at(o.day, time);
  // A tour that started a few days ago is still on the road.
  const tourEnds = pkg ? pickup + (pkg.days - 1) * DAY + between(6, 10) * HOUR : 0;
  const status = pkg && o.status === 'completed' && tourEnds > NOW ? 'driver_assigned' : o.status;

  // The timeline. Staff bookings start out confirmed (or contacted).
  const created = Math.min(o.created ?? pickup - between(1, 14) * DAY - between(0, 10) * HOUR, NOW - MIN);
  const steps = source === 'staff' ? PATH[status].filter((s) => s !== 'contacted' && s !== 'confirmed') : PATH[status];
  const startStatus = source === 'staff' ? (status === 'contacted' ? 'contacted' : 'confirmed') : 'new';
  const events = [{ at: created, actor: source === 'staff', type: 'created', data: source === 'staff' ? { source: 'staff', fare: fareTotal } : { channel, fareShown, fareServer } }];
  let prev = created;
  let from = startStatus;
  const stepAt = {};
  for (const to of steps) {
    let want;
    if (to === 'contacted') want = prev + between(3, 40) * MIN;
    else if (to === 'confirmed') want = prev + between(10, 240) * MIN;
    else if (to === 'driver_assigned') want = Math.max(prev + 30 * MIN, pickup - between(4, 20) * HOUR);
    else if (to === 'completed') want = pkg ? tourEnds : pickup + between(150, 360) * MIN;
    else if (to === 'cancelled') want = prev + (Math.min(pickup, NOW) - prev) * (0.3 + rand() * 0.5);
    else want = pickup + 90 * MIN; // no_show
    // A trip cannot finish before it starts, and nothing happens after now:
    // a step that would land in the future happens some time since the last one.
    const floor = to === 'completed' || to === 'no_show' ? Math.max(prev, pickup + HOUR) : prev;
    const t = want < NOW - MIN ? Math.max(want, floor + MIN) : floor + (NOW - MIN - floor) * (0.3 + rand() * 0.6);
    events.push({ at: t, actor: true, type: 'status', data: { from, to } });
    stepAt[to] = t;
    prev = t;
    from = to;
  }

  const hasDriver = ['driver_assigned', 'completed', 'no_show'].includes(status) || o.driver;
  const driver = hasDriver ? (o.driver ?? pick(DRIVERS)) : null;

  // Payments. `paid` is 'none', 'advance', 'full', or for a finished trip
  // 'balance-due' (advance only, the driver's cash not recorded yet).
  const payments = [];
  const pay = (amount, ms, method, extra = {}) =>
    payments.push({
      id: randomUUID(),
      kind: amount < 0 ? 'refund' : 'payment',
      amount,
      method,
      receivedOn: dayOf(ms),
      receivedBy: method === 'cash' ? driver?.name ?? 'Office' : 'Office UPI',
      upiRef: method === 'upi' ? digits(12) : null,
      createdAt: ms,
      ...extra,
    });
  const advance = advanceOf(fareTotal);
  const confirmedAt = stepAt.confirmed ?? created + 20 * MIN;
  const paid = o.paid ?? (status === 'completed' ? (chance(0.08) ? 'balance-due' : chance(0.12) ? 'full' : 'advance+cash') : status === 'new' || status === 'contacted' ? 'none' : chance(0.75) ? 'advance' : 'none');
  if (paid === 'full') pay(fareTotal, Math.min(confirmedAt + between(5, 90) * MIN, NOW - MIN), 'upi');
  else if (paid !== 'none') pay(advance, Math.min(confirmedAt + between(5, 90) * MIN, NOW - MIN), 'upi');
  // A taxi's balance is collected by the driver after the trip; a package's cash is the office's.
  if (paid === 'advance+cash') pay(fareTotal - advance, Math.min(stepAt.completed ?? pickup, NOW - MIN), 'cash', kind === 'taxi' ? { byDriver: true } : {});
  if (status === 'cancelled' && payments.length) {
    const late = pickup - stepAt.cancelled < POLICY.freeCancelHours * HOUR;
    const refund = late ? Math.round((advance * POLICY.lateCancelRefundPercent) / 100) : advance;
    pay(-refund, Math.min(stepAt.cancelled + between(1, 3) * DAY, NOW - MIN), 'upi', { note: late ? 'Cancelled within 24 hours: half the advance refunded.' : 'Cancelled in time: advance refunded in full.' });
  }

  const b = {
    id: randomUUID(),
    ref: newRef(),
    kind,
    routeSlug: route?.slug ?? null,
    packageSlug: pkg?.slug ?? null,
    vehicle,
    tripName,
    pickupDate: o.day,
    pickupTime: time,
    flight: o.flight !== undefined ? o.flight : route?.from.startsWith('Bagdogra Airport') && chance(0.8) ? pick(FLIGHTS) : route?.from.startsWith('New Jalpaiguri') && chance(0.5) ? pick(TRAINS) : null,
    pax,
    dropAddress: o.drop !== undefined ? o.drop : route && chance(0.6) ? `${pick(['Hotel', 'Homestay', 'Resort', 'Guest house'])} in ${route.to.replace(/ \(.*\)$/, '')}` : null,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    fareShown,
    advanceShown: advanceOf(fareShown),
    fareServer,
    fareMismatch: fareShown !== fareServer && source === 'website',
    fareTotal,
    status,
    driverName: driver?.name ?? null,
    driverPhone: driver?.phone ?? null,
    vehicleNumber: driver?.vehicleNumber ?? null,
    notes: o.notes !== undefined ? o.notes : chance(0.12) ? pick(NOTES) : null,
    source,
    channel,
    consentAt: source === 'website' ? new Date(created) : null,
    ipHash: MARK,
    personalDataRemovedAt: null,
    createdAt: new Date(created),
    updatedAt: new Date(prev),
  };
  customer.bookings.push(b);
  trips.push({ b, events, payments });
  return { b, events, payments };
}

/* ---------------- The story ---------------- */

// The last six weeks: mostly finished trips, a few cancellations and no-shows.
for (let back = 42; back >= 1; back--) {
  const day = addDays(today, -back);
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  const n = dow === 0 || dow >= 5 ? between(2, 4) : between(1, 3);
  for (let i = 0; i < n; i++) {
    const roll = rand();
    const status = roll < 0.86 ? 'completed' : roll < 0.95 ? 'cancelled' : 'no_show';
    if (chance(0.18) && status !== 'no_show') trip({ day, status, package: pick(PACKAGE_TRIPS) });
    else trip({ day, status, route: pick(TAXI_TRIPS) });
  }
}

// One finished trip where a cash amount was typed wrong and put right.
{
  const t = trip({ day: addDays(today, -6), time: '10:20', status: 'completed', route: 'bagdogra-airport-to-darjeeling-taxi', vehicle: 'innova', paid: 'advance', notes: null });
  const wrong = t.b.fareTotal - advanceOf(t.b.fareTotal) + 900;
  const recorded = Date.parse(`${t.b.pickupDate}T19:30:00+05:30`);
  const base = { method: 'cash', receivedOn: t.b.pickupDate, receivedBy: t.b.driverName, upiRef: null, byDriver: true };
  const first = { id: randomUUID(), kind: 'payment', amount: wrong, createdAt: recorded, note: null, ...base };
  t.payments.push(
    first,
    { id: randomUUID(), kind: 'reversal', amount: -wrong, createdAt: recorded + 25 * MIN, reversesPaymentId: first.id, note: 'Typed the wrong amount.', ...base },
    { id: randomUUID(), kind: 'payment', amount: wrong - 900, createdAt: recorded + 26 * MIN, note: null, ...base },
  );
}

// Today's board, built around the current time so there is always something
// done, something on the road and something still to arrange.
const TODAY = [
  { off: -540, status: 'completed', route: 'bagdogra-airport-to-gangtok-taxi', vehicle: 'innova', pax: 4 },
  { off: -330, status: 'completed', route: 'bagdogra-airport-to-siliguri-taxi', vehicle: 'sedan', pax: 2 },
  { off: -100, status: 'driver_assigned', route: 'njp-to-darjeeling-taxi', vehicle: 'suv', pax: 5, flight: null },
  { off: 55, status: 'driver_assigned', route: 'bagdogra-airport-to-darjeeling-taxi', vehicle: 'sedan', pax: 2, paid: 'advance' },
  { off: 140, status: 'confirmed', route: 'bagdogra-airport-to-kalimpong-taxi', vehicle: 'innova', pax: 3, paid: 'advance', notes: 'Child seat needed.' },
  { off: 235, status: 'new', route: 'bagdogra-airport-to-gangtok-taxi', vehicle: 'suv', pax: 4, created: NOW - 35 * MIN },
  { off: 330, status: 'contacted', route: 'bagdogra-airport-to-mirik-taxi', vehicle: 'sedan', pax: 2, created: NOW - 3 * HOUR },
  { off: 410, status: 'driver_assigned', route: 'bagdogra-airport-to-siliguri-taxi', vehicle: 'innova', pax: 3, paid: 'none', notes: 'Flight often late in the evening: driver to check the arrival board.' },
];
for (const { off, ...o } of TODAY) {
  const ms = Math.round((NOW + off * MIN) / (5 * MIN)) * 5 * MIN;
  if (dayOf(ms) !== today) continue;
  trip({ ...o, day: today, time: clockOf(ms), source: 'website' });
}

// Requests nobody has answered yet, from a few minutes to a day old.
const WAITING = [
  { created: NOW - 4 * MIN, day: addDays(today, 1), time: '10:30', route: 'bagdogra-airport-to-gangtok-taxi', vehicle: 'innova', pax: 5 },
  { created: NOW - 16 * MIN, day: addDays(today, 2), time: '13:15', route: 'njp-to-darjeeling-taxi', vehicle: 'sedan', pax: 2, channel: 'payment' },
  { created: NOW - 47 * MIN, day: addDays(today, 5), time: '09:00', package: 'darjeeling-gangtok-tour-package', vehicle: 'innova', pax: 4 },
  // A stale page still showed last season's fare.
  { created: NOW - 130 * MIN, day: addDays(today, 1), time: '16:40', route: 'bagdogra-airport-to-darjeeling-taxi', vehicle: 'sedan', pax: 3, fareShown: 2600 },
  { created: NOW - 27 * HOUR, day: addDays(today, 9), time: '11:45', route: 'bagdogra-airport-to-pelling-taxi', vehicle: 'suv', pax: 4 },
];
for (const o of WAITING) trip({ ...o, status: 'new', source: 'website' });

// The weeks ahead.
for (let i = 0; i < 24; i++) {
  const ahead = i < 6 ? between(1, 3) : i < 16 ? between(3, 14) : between(15, 45);
  const roll = rand();
  const status = ahead <= 2 && roll < 0.55 ? 'driver_assigned' : roll < 0.7 ? 'confirmed' : roll < 0.92 ? 'contacted' : 'cancelled';
  // Most were booked in the last few days, several of them this week.
  const back = pick([1, 1, 1, 2, 2, 2, 3, 4, 6, 9, 13]);
  const created = Math.min(NOW - between(10, 600) * MIN, at(addDays(today, -back), timeBetween(8, 21)));
  const day = addDays(today, ahead);
  if (chance(0.25)) trip({ day, status, created, package: pick(PACKAGE_TRIPS), time: timeBetween(8, 12) });
  else trip({ day, status, created, route: pick(TAXI_TRIPS) });
}

// Bookings taken on the phone: a group in a Tempo Traveller, a repeat
// customer with an agreed price, and a trip that is not on the fare list.
{
  const regular = newCustomer();
  regular.notes = CUSTOMER_NOTES[1];
  trip({ customer: regular, day: addDays(today, -20), status: 'completed', route: 'bagdogra-airport-to-gangtok-taxi', vehicle: 'innova', source: 'staff' });
  trip({ customer: regular, day: addDays(today, 4), time: '08:30', status: 'confirmed', route: 'gangtok-to-bagdogra-airport-taxi', vehicle: 'innova', source: 'staff', agreed: 5300, notes: 'Agreed ₹200 off for a repeat customer.', paid: 'advance', created: NOW - 26 * HOUR });
  const office = newCustomer();
  office.notes = CUSTOMER_NOTES[2];
  trip({ customer: office, day: addDays(today, 3), time: '07:00', status: 'confirmed', route: 'bagdogra-airport-to-darjeeling-taxi', vehicle: 'traveller', pax: 11, source: 'staff', paid: 'advance', created: NOW - 2 * DAY - 3 * HOUR, notes: 'Office offsite. GST bill to the company.' });
  trip({ day: addDays(today, 6), time: '09:30', status: 'confirmed', custom: 'Siliguri to Lava and Lolegaon, 2 days', vehicle: 'suv', pax: 4, agreed: 7800, source: 'staff', paid: 'none', created: NOW - 29 * HOUR });
  trip({ day: addDays(today, 1), time: '06:15', status: 'contacted', route: 'siliguri-to-gangtok-taxi', vehicle: 'sedan', pax: 2, source: 'staff', created: NOW - 50 * MIN });
  const careful = newCustomer();
  careful.notes = CUSTOMER_NOTES[3];
  trip({ customer: careful, day: addDays(today, 34), time: '09:00', status: 'confirmed', package: 'sikkim-darjeeling-honeymoon-package', vehicle: 'innova', pax: 2, source: 'staff', paid: 'advance', created: NOW - 4 * DAY });
}

// Trips from more than 24 months ago, after the names and numbers were removed.
const removed = [];
for (const [monthsBack, slug, vehicle] of [[26, 'bagdogra-airport-to-darjeeling-taxi', 'sedan'], [25, 'njp-to-gangtok-taxi', 'innova'], [25, 'bagdogra-airport-to-siliguri-taxi', 'sedan']]) {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - monthsBack);
  d.setUTCDate(between(3, 26));
  const t = trip({ day: d.toISOString().slice(0, 10), status: 'completed', route: slug, vehicle, customer: newCustomer(), paid: 'advance+cash' });
  removed.push(t);
}
for (const t of removed) {
  const c = customers.find((x) => x.id === t.b.customerId);
  const gone = new Date(Math.min(Date.parse(`${t.b.pickupDate}T03:00:00+05:30`) + 730 * DAY, NOW - DAY));
  Object.assign(c, { name: null, phone: null, email: null, removedAt: gone });
  Object.assign(t.b, { customerName: null, customerPhone: null, flight: null, dropAddress: null, notes: null, driverPhone: null, personalDataRemovedAt: gone });
}
customers[4].notes ??= CUSTOMER_NOTES[0];

/* ---------------- Write it ---------------- */

const pool = new pg.Pool({ connectionString: url, max: 1 });
const db = drizzle(pool, { schema });
const chunks = (list, size = 100) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

try {
  const [admin] = await db
    .select({ id: schema.user.id, name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.role, 'admin'))
    .orderBy(asc(schema.user.createdAt))
    .limit(1);
  const actorId = admin?.id ?? null;

  const removedCount = await db.transaction(async (tx) => {
    const old = await tx.select({ id: schema.bookings.id, customerId: schema.bookings.customerId }).from(schema.bookings).where(eq(schema.bookings.ipHash, MARK));
    if (!old.length) return 0;
    const ids = old.map((r) => r.id);
    const customerIds = [...new Set(old.map((r) => r.customerId).filter(Boolean))];
    await tx.delete(schema.payments).where(inArray(schema.payments.bookingId, ids));
    await tx.delete(schema.bookings).where(inArray(schema.bookings.id, ids)); // timelines go with them
    // Dummy handovers and payouts, then drivers the seed added that nothing real uses.
    await tx.delete(schema.driverPayouts).where(eq(schema.driverPayouts.note, DUMMY_NOTE));
    const added = await tx.select({ id: schema.drivers.id }).from(schema.drivers).where(eq(schema.drivers.notes, DUMMY_NOTE));
    for (const { id } of added) {
      const [used] = await tx.select({ id: schema.bookings.id }).from(schema.bookings).where(eq(schema.bookings.driverId, id)).limit(1);
      const [paidTo] = await tx.select({ id: schema.driverPayouts.id }).from(schema.driverPayouts).where(eq(schema.driverPayouts.driverId, id)).limit(1);
      const [took] = await tx.select({ id: schema.payments.id }).from(schema.payments).where(eq(schema.payments.driverId, id)).limit(1);
      if (!used && !paidTo && !took) await tx.delete(schema.drivers).where(eq(schema.drivers.id, id));
    }
    // Only customers left with no bookings at all, so a real booking that
    // reused a dummy number keeps its customer.
    const stillUsed = (await tx.select({ id: schema.bookings.customerId }).from(schema.bookings).where(inArray(schema.bookings.customerId, customerIds))).map((r) => r.id);
    const orphans = customerIds.filter((id) => !stillUsed.includes(id));
    if (orphans.length) await tx.delete(schema.customers).where(inArray(schema.customers.id, orphans));
    return old.length;
  });
  if (removedCount) console.log(`[seed] removed ${removedCount} earlier dummy bookings`);
  else if (removeOnly) console.log('[seed] no dummy data to remove');
  if (!removeOnly) await insertAll(actorId);
} finally {
  await pool.end();
}

async function insertAll(actorId) {
  const live = customers.filter((c) => c.bookings.length);
  const phones = live.map((c) => c.phone).filter(Boolean);
  const clash = phones.length
    ? await db.select({ phone: schema.customers.phone }).from(schema.customers).where(inArray(schema.customers.phone, phones))
    : [];
  if (clash.length) throw new Error(`[seed] customers with dummy numbers already exist (${clash.map((c) => c.phone).join(', ')}). Remove them first.`);

  const sortedTrips = trips.sort((a, z) => a.b.createdAt - z.b.createdAt);
  await db.transaction(async (tx) => {
    // The drivers list: reuse a driver of the same name, add the rest with their pay set.
    const known = await tx.select().from(schema.drivers);
    const driverByName = new Map(known.map((d) => [d.name.trim().toLowerCase(), d]));
    for (const [i, d] of DRIVERS.entries()) {
      if (driverByName.has(d.name.toLowerCase())) continue;
      const [row] = await tx
        .insert(schema.drivers)
        .values({ name: d.name, phone: d.phone, vehicleNumber: d.vehicleNumber, payType: i % 3 === 2 ? 'fixed' : 'percent', payValue: i % 3 === 2 ? 900 : 25, notes: DUMMY_NOTE })
        .returning();
      driverByName.set(d.name.toLowerCase(), row);
    }
    const payFor = (d, fare) => (d?.payValue == null ? null : d.payType === 'percent' ? Math.round((fare * d.payValue) / 100) : d.payValue);
    for (const { b } of sortedTrips) {
      const d = b.driverName ? driverByName.get(b.driverName.toLowerCase()) : null;
      b.driverId = d?.id ?? null;
      b.driverPay = d ? payFor(d, b.fareTotal) : null;
    }

    for (const part of chunks(live)) {
      await tx.insert(schema.customers).values(
        part.map((c) => {
          const times = c.bookings.map((b) => b.createdAt.getTime());
          return {
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            notes: c.notes,
            lastBookingAt: new Date(Math.max(...times)),
            personalDataRemovedAt: c.removedAt ?? null,
            createdAt: new Date(Math.min(...times)),
            updatedAt: new Date(c.removedAt ?? Math.max(...times)),
          };
        }),
      );
    }
    for (const part of chunks(sortedTrips)) {
      await tx.insert(schema.bookings).values(part.map(({ b }) => ({ ...b, handledBy: b.status === 'new' ? null : actorId })));
    }
    const events = sortedTrips.flatMap(({ b, events }) =>
      events.map((e) => ({ bookingId: b.id, at: new Date(e.at), actorId: e.actor ? actorId : null, type: e.type, data: e.data })),
    );
    for (const part of chunks(events.sort((a, z) => a.at - z.at))) await tx.insert(schema.bookingEvents).values(part);
    const payments = sortedTrips.flatMap(({ b, payments }) =>
      payments.map(({ byDriver, ...p }) => ({
        note: null,
        reversesPaymentId: null,
        ...p,
        driverId: byDriver ? b.driverId : null,
        bookingId: b.id,
        createdBy: actorId,
        createdAt: new Date(p.createdAt),
      })),
    );
    for (const part of chunks(payments)) await tx.insert(schema.payments).values(part);

    // Each driver handed over what they collected, and was paid for their
    // trips, up to a few days ago, so the latest trips still show on their account.
    const cutoff = addDays(today, -4);
    const settle = new Map();
    for (const { b } of sortedTrips) {
      if (!b.driverId || b.pickupDate >= cutoff) continue;
      const s = settle.get(b.driverId) ?? { collected: 0, earned: 0 };
      if (b.status === 'completed') s.earned += b.driverPay ?? 0;
      settle.set(b.driverId, s);
    }
    for (const p of payments) if (p.driverId && p.receivedOn < cutoff && settle.has(p.driverId)) settle.get(p.driverId).collected += p.amount;
    const settledAt = new Date(`${cutoff}T18:30:00+05:30`);
    const moves = [...settle.entries()].flatMap(([driverId, s], i) => [
      ...(s.collected > 0 ? [{ driverId, kind: 'handover', amount: -s.collected, method: i % 2 ? 'upi' : 'cash', paidOn: cutoff, note: DUMMY_NOTE, createdBy: actorId, createdAt: settledAt }] : []),
      ...(s.earned > 0 ? [{ driverId, kind: 'payout', amount: s.earned, method: 'bank', paidOn: cutoff, note: DUMMY_NOTE, createdBy: actorId, createdAt: new Date(settledAt.getTime() + MIN) }] : []),
    ]);
    if (moves.length) await tx.insert(schema.driverPayouts).values(moves);
  });

  // A monthly goal the dummy month is on track for: trips so far are a
  // little ahead of the share of the month gone, as the goal card measures it.
  const month = sortedTrips.filter(({ b }) => b.pickupDate.slice(0, 7) === today.slice(0, 7) && ['confirmed', 'driver_assigned', 'completed'].includes(b.status));
  const [y, m, d] = today.split('-').map(Number);
  const share = Math.max(0.35, d / new Date(Date.UTC(y, m, 0)).getUTCDate() + 0.03);
  const goal = {
    trips: Math.max(20, Math.floor(month.length / share / 5) * 5),
    amount: Math.max(100000, Math.floor(month.reduce((s, { b }) => s + b.fareTotal, 0) / share / 10000) * 10000),
  };
  await db
    .insert(schema.settings)
    .values({ key: 'monthly_goal', value: goal, updatedBy: actorId })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: goal, updatedBy: actorId, updatedAt: new Date() } });

  const count = (status) => sortedTrips.filter(({ b }) => b.status === status).length;
  const todays = sortedTrips.filter(({ b }) => b.pickupDate === today && !['cancelled', 'no_show'].includes(b.status)).length;
  const thisWeek = sortedTrips.filter(({ b }) => dayOf(b.createdAt.getTime()) >= weekStart).length;
  console.log(
    `[seed] added ${live.length} customers and ${sortedTrips.length} bookings: ${todays} pickups today, ${count('new')} waiting for a reply, ` +
      `${count('completed')} completed, ${count('cancelled')} cancelled, ${count('no_show')} no-show, ${thisWeek} booked this week`,
  );
  console.log(`[seed] ${sortedTrips.reduce((s, t) => s + t.payments.length, 0)} payments, monthly goal set to ${goal.trips} trips / ₹${goal.amount.toLocaleString('en-IN')}`);
  if (!actorId) console.log('[seed] no admin account yet, so staff actions show no name. Create one at /admin/setup/ and run this again.');
}
