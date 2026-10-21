import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` writes a new SQL migration to ./drizzle after a
// change to src/server/db/schema.ts. `npm run db:migrate` applies them.
export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
