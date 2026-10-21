// Applies the SQL migrations in ./drizzle to DATABASE_URL.
//   npm run db:migrate             fails when DATABASE_URL is missing
//   node scripts/db-migrate.mjs --if-configured   skips quietly instead
// The build runs the second form, so a Vercel deploy migrates its own
// database (production, or the Neon branch of a preview) before going live,
// and a local build without a database still works.
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  if (process.argv.includes('--if-configured')) {
    console.log('[db] DATABASE_URL not set, skipping migrations');
    process.exit(0);
  }
  console.error('[db] DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

// Migrations want a direct connection; Neon gives one when "-pooler" is
// removed from the host. DATABASE_URL_UNPOOLED is set by the Neon integration.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED || url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
  console.log('[db] migrations applied');
} finally {
  await pool.end();
}
