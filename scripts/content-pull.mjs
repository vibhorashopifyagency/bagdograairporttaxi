// Copies the website content published in the dashboard into
// .content/published.json, which src/data/published.ts lays over the
// starting copy in src/data/ while the site builds. Runs before every build,
// after the migrations; the dashboard also runs it in development after a
// publish, so the dev server shows the change.
//   node scripts/content-pull.mjs
// Without DATABASE_URL the file is removed and the site builds from the
// starting copy alone. A database that is set but cannot be read fails the
// build: a deploy must never go live without the admin's edits, and Vercel
// keeps the last good deploy when a build fails.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import pg from 'pg';

const OUT = '.content/published.json';
const url = process.env.DATABASE_URL;

if (!url) {
  await rm(OUT, { force: true });
  console.log('[content] DATABASE_URL not set: building from the starting copy in src/data');
  process.exit(0);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || url });
await client.connect();
try {
  // One snapshot, so the version matches the rows.
  await client.query('begin isolation level repeatable read read only');
  const { rows } = await client.query(`
    select type, key, published, deleted, base_hash,
           to_char(published_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as on_day
      from content_items
     where published is not null or deleted
     order by type, key`);
  const { rows: [{ version }] } = await client.query('select coalesce(max(id), 0)::int as version from content_versions');
  await client.query('commit');

  const items = {};
  for (const r of rows) {
    const entry = r.deleted ? { deleted: true, on: r.on_day } : { data: r.published, on: r.on_day };
    if (r.base_hash) entry.baseHash = r.base_hash;
    (items[r.type] ??= {})[r.key] = entry;
  }
  await mkdir('.content', { recursive: true });
  await writeFile(OUT, JSON.stringify({ version, items }, null, 1) + '\n');
  console.log(`[content] ${rows.length} dashboard edit${rows.length === 1 ? '' : 's'} pulled (content version ${version})`);
} finally {
  await client.end();
}
