// Puts a backup made by `npm run db:backup` into an EMPTY database.
//   npm run db:restore -- backups/backup-2026-10-22.json.gz
//
// Steps when the live database is lost or damaged (docs/admin-setup.md):
//  1. Create a new, empty database (in Neon: a new branch or project).
//  2. Point DATABASE_URL at it and run `npm run db:migrate`.
//  3. Run this with the newest backup file.
//  4. Point the site at the new database in Vercel and redeploy.
// It refuses a database that already has bookings or accounts, so it can
// never mix two sets of data. Everyone signs in again afterwards.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import pg from 'pg';

const TABLES = ['user', 'account', 'two_factor', 'recovery_codes', 'customers', 'drivers', 'bookings', 'booking_events', 'payments', 'itineraries', 'driver_payouts', 'audit_log', 'settings'];
/** Tables whose id comes from a counter, which must carry on after the restored rows. */
const COUNTERS = ['booking_events', 'audit_log'];

const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!file || !url) {
  console.error('[restore] Usage: DATABASE_URL=<empty database> npm run db:restore -- <backup file>');
  process.exit(1);
}
const data = JSON.parse(gunzipSync(readFileSync(file)).toString('utf8'));
if (data.app !== 'bagdograairporttaxi' || !data.tables) {
  console.error('[restore] That file is not a backup from npm run db:backup.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const [{ n }] = (await client.query(`select (select count(*) from bookings) + (select count(*) from "user") as n`)).rows;
  if (Number(n) > 0) {
    console.error('[restore] This database already has bookings or accounts. Restore into a new, empty one (run npm run db:migrate on it first).');
    process.exit(1);
  }
  await client.query('begin');
  for (const t of TABLES) {
    const rows = data.tables[t] ?? [];
    // A thousand rows at a time; Postgres turns each JSON row back into the table's own types.
    for (let i = 0; i < rows.length; i += 1000) {
      await client.query(`insert into "${t}" select * from json_populate_recordset(null::"${t}", $1::json)`, [JSON.stringify(rows.slice(i, i + 1000))]);
    }
  }
  for (const t of COUNTERS) {
    await client.query(`select setval(pg_get_serial_sequence('${t}', 'id'), coalesce((select max(id) from "${t}"), 0) + 1, false)`);
  }
  await client.query('commit');
  const counts = TABLES.map((t) => `${t} ${(data.tables[t] ?? []).length}`).join(', ');
  console.log(`[restore] restored the backup of ${data.made}: ${counts}`);
} catch (e) {
  await client.query('rollback').catch(() => {});
  console.error('[restore] failed, nothing was changed:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
