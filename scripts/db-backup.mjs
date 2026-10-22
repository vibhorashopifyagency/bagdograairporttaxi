// A copy of everything in the database, in one file the owner keeps safe,
// apart from Neon's own backups (see docs/admin-setup.md, "Backups").
//   npm run db:backup                       writes backups/backup-<date>.json.gz
//   npm run db:backup -- --out=<file>       somewhere else
//
// It holds customer names and mobile numbers, so treat the file like the
// admin password: keep it off shared drives, and delete copies older than
// 24 months, as the privacy policy promises. Logins in progress, rate-limit
// counters and one-time codes are left out; passwords are stored hashed.
//
// Point DATABASE_URL at the database to copy (production: the
// DATABASE_URL_UNPOOLED value from Vercel). Restore with npm run db:restore.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import pg from 'pg';

/** In the order they are restored: a table comes after the ones it points at. */
const TABLES = [
  'user',
  'account',
  'two_factor',
  'recovery_codes',
  'customers',
  'drivers',
  'bookings',
  'booking_events',
  'payments',
  'itineraries',
  'driver_payouts',
  'audit_log',
  'settings',
];

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('[backup] DATABASE_URL is not set.');
  process.exit(1);
}
const day = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const out = process.argv.find((a) => a.startsWith('--out='))?.slice(6) || `backups/backup-${day}.json.gz`;

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const [{ version }] = (await client.query(`select max(created_at) as version from drizzle.__drizzle_migrations`).catch(() => ({ rows: [{ version: null }] }))).rows;
  const data = { app: 'bagdograairporttaxi', made: new Date().toISOString(), migration: version, tables: {} };
  // One snapshot, so a booking and its payments always match.
  await client.query('begin isolation level repeatable read read only');
  for (const t of TABLES) {
    const { rows } = await client.query(`select coalesce(json_agg(x), '[]'::json) as rows from "${t}" x`);
    data.tables[t] = rows[0].rows;
  }
  await client.query('commit');
  mkdirSync(dirname(out), { recursive: true });
  const gz = gzipSync(JSON.stringify(data));
  writeFileSync(out, gz, { mode: 0o600 });
  const counts = Object.entries(data.tables).map(([t, r]) => `${t} ${r.length}`).join(', ');
  console.log(`[backup] ${out} (${(gz.length / 1024).toFixed(0)} kB): ${counts}`);
} finally {
  await client.end();
}
