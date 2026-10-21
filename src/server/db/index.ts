import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env, requireEnv } from '../env';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

let db: Db | undefined;

/**
 * One connection pool per server instance, created on first use so that
 * building the static pages never needs a database. In production
 * DATABASE_URL is Neon's pooled connection string (the host has `-pooler`).
 */
export function getDb(): Db {
  if (!db) {
    const pool = new pg.Pool({
      connectionString: requireEnv('DATABASE_URL'),
      max: Number(env('DATABASE_POOL_MAX') ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    db = drizzle(pool, { schema });
  }
  return db;
}

export { schema };
