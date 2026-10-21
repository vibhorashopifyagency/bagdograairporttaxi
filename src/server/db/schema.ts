/**
 * Database schema (Neon Postgres in production, PGlite locally).
 *
 * Two groups of tables live here:
 *  1. Better Auth's tables (user, session, account, verification, twoFactor,
 *     rateLimit). Their property names are what Better Auth's Drizzle adapter
 *     looks up, so do not rename the JS keys. Column names are snake_case.
 *  2. The business tables: customers, bookings, booking history, payments
 *     and the access log.
 *
 * Change a table, then run `npm run db:generate` to write a migration and
 * `npm run db:migrate` to apply it. Never edit an applied migration.
 */
import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Better Auth                                                         */
/* ------------------------------------------------------------------ */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // Better Auth requires an email. Staff sign in with a username, so an
  // account without a real address gets <username>@users.invalid.
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  // username plugin
  username: text('username').unique(),
  displayUsername: text('display_username'),
  // admin plugin: role is 'admin' or 'staff'; banned = deactivated
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires', { withTimezone: true }),
  // two-factor plugin
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  // Ours: the admin switches this on to let a staff member record payments.
  canRecordPayments: boolean('can_record_payments').default(false),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

export const twoFactor = pgTable(
  'two_factor',
  {
    id: text('id').primaryKey(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    verified: boolean('verified').default(true),
    failedVerificationCount: integer('failed_verification_count').default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
  },
  (t) => [index('two_factor_secret_idx').on(t.secret), index('two_factor_user_id_idx').on(t.userId)],
);

export const rateLimit = pgTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
});

/* ------------------------------------------------------------------ */
/* Business                                                            */
/* ------------------------------------------------------------------ */

/**
 * One row per mobile number. `phone` is digits only with the country code
 * (919830122745), so a repeat customer is recognised however they type it.
 * After the retention period the name and number are removed and
 * `personalDataRemovedAt` is set; the row stays so totals still add up.
 */
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  phone: text('phone').unique(),
  email: text('email'),
  notes: text('notes'),
  lastBookingAt: timestamp('last_booking_at', { withTimezone: true }),
  personalDataRemovedAt: timestamp('personal_data_removed_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const BOOKING_STATUSES = [
  'new',
  'contacted',
  'confirmed',
  'driver_assigned',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * A booking request. Trip details are copied in at the time of booking
 * (tripName, fares) so later fare changes on the website never rewrite
 * history. Money is whole rupees.
 */
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Short reference shown to the customer and in the WhatsApp message, e.g. BAT-7K2Q9M. */
    ref: text('ref').notNull().unique(),
    kind: text('kind').$type<'taxi' | 'package'>().notNull(),
    routeSlug: text('route_slug'),
    packageSlug: text('package_slug'),
    vehicle: text('vehicle').notNull(),
    tripName: text('trip_name').notNull(),
    pickupDate: date('pickup_date').notNull(),
    pickupTime: text('pickup_time').notNull(),
    flight: text('flight'),
    pax: integer('pax').notNull(),
    dropAddress: text('drop_address'),

    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    customerName: text('customer_name'),
    customerPhone: text('customer_phone'),

    /** What the website showed the customer. */
    fareShown: integer('fare_shown').notNull(),
    advanceShown: integer('advance_shown').notNull(),
    /** What the server worked out from the fare table. */
    fareServer: integer('fare_server').notNull(),
    /** True when the two differ: a stale page, or a tampered request. */
    fareMismatch: boolean('fare_mismatch').notNull().default(false),
    /** The agreed price. Starts as the server fare; staff may change it. */
    fareTotal: integer('fare_total').notNull(),

    status: text('status').$type<BookingStatus>().notNull().default('new'),
    handledBy: text('handled_by').references(() => user.id, { onDelete: 'set null' }),
    driverName: text('driver_name'),
    driverPhone: text('driver_phone'),
    vehicleNumber: text('vehicle_number'),
    notes: text('notes'),

    /** 'website' or 'staff' (entered by hand for a phone or walk-in booking). */
    source: text('source').$type<'website' | 'staff'>().notNull().default('website'),
    /** Which button the customer pressed: WhatsApp or the payment button. */
    channel: text('channel').$type<'whatsapp' | 'payment' | 'manual'>().notNull(),
    consentAt: timestamp('consent_at', { withTimezone: true }),
    /** Keyed hash of the IP address, only for rate limiting. Never the raw IP. */
    ipHash: text('ip_hash'),

    personalDataRemovedAt: timestamp('personal_data_removed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('bookings_pickup_date_idx').on(t.pickupDate),
    index('bookings_status_idx').on(t.status),
    index('bookings_customer_idx').on(t.customerId),
    index('bookings_created_idx').on(t.createdAt),
    index('bookings_ip_created_idx').on(t.ipHash, t.createdAt),
  ],
);

/** The timeline on a booking: every change, who made it and when. */
export const bookingEvents = pgTable(
  'booking_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    /** Null when the customer or the system did it. */
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>(),
  },
  (t) => [index('booking_events_booking_idx').on(t.bookingId, t.at)],
);

/**
 * Money received or refunded, recorded by hand (UPI QR code or cash).
 * Rows are never deleted: a mistake is undone by a 'reversal' row that
 * points at the original. A booking's paid total is the sum of `amount`.
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'restrict' }),
    kind: text('kind').$type<'payment' | 'refund' | 'reversal'>().notNull(),
    /** Positive for a payment, negative for a refund or a reversal of a payment. */
    amount: integer('amount').notNull(),
    method: text('method').$type<'upi' | 'cash'>().notNull(),
    receivedOn: date('received_on').notNull(),
    receivedBy: text('received_by'),
    upiRef: text('upi_ref'),
    screenshotUrl: text('screenshot_url'),
    note: text('note'),
    reversesPaymentId: uuid('reverses_payment_id'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('payments_booking_idx').on(t.bookingId)],
);

/** One day of an itinerary. `photo` is a key from src/data/photos.json, or ''. */
export type ItineraryDay = { title: string; detail: string; stay: string; photo: string };

/** Everything the "Send itinerary" popup collects. Dates are YYYY-MM-DD. */
export type ItineraryData = {
  name: string;
  /** Digits only with the country code, like bookings.customer_phone. */
  phone: string;
  title: string;
  start: string;
  end: string;
  time: string;
  pax: number;
  pickup: string;
  flight: string;
  car: string;
  vehicleNumber: string;
  driver: string;
  driverPhone: string;
  days: ItineraryDay[];
  includes: string[];
  excludes: string[];
  /** Photo keys, in the order they are sent. */
  photos: string[];
  message: string;
  showQr: boolean;
};

/**
 * The itinerary for a booking, at most one. `draft` is what the popup saves
 * as staff type; `published` is the copy the customer's trip page shows, and
 * only changes when someone presses Send. Removed with the booking's
 * personal data.
 */
export const itineraries = pgTable('itineraries', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id')
    .notNull()
    .unique()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  draft: jsonb('draft').$type<ItineraryData>().notNull(),
  published: jsonb('published').$type<ItineraryData>(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  sentBy: text('sent_by').references(() => user.id, { onDelete: 'set null' }),
  sentCount: integer('sent_count').notNull().default(0),
  updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Who signed in, and who looked at or changed customer data. Required by the
 * privacy plan; kept for the same 24 months as customer details.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entity: text('entity'),
    entityId: text('entity_id'),
    ipHash: text('ip_hash'),
    detail: jsonb('detail').$type<Record<string, unknown>>(),
  },
  (t) => [index('audit_log_at_idx').on(t.at), index('audit_log_action_idx').on(t.action, t.at)],
);

/**
 * One-time codes that let the admin set a new password without email.
 * Only a hash is stored; the codes are shown once when created.
 */
export const recoveryCodes = pgTable(
  'recovery_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('recovery_codes_hash_idx').on(t.codeHash), index('recovery_codes_user_idx').on(t.userId)],
);

/** Small key-value settings the admin edits (monthly goal, UPI QR code, ...). */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
  updatedAt: updatedAt(),
});

/** Better Auth's Drizzle adapter looks tables up by these model names. */
export const authSchema = { user, session, account, verification, twoFactor, rateLimit };

