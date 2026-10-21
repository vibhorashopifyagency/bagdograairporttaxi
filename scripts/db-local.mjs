// Starts the local database (PGlite, a real Postgres in Node) that /admin/
// and /api/ use during `npm run dev`. Data is kept in .data/pglite.
//
// Two copies cannot open the same data folder (the second one crashes with
// "RuntimeError: Aborted()"), so if something already answers on the port
// this says so and exits instead of starting another.
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const PORT = 5433;

const inUse = await new Promise((resolve) => {
  const s = net.connect({ port: PORT, host: '127.0.0.1' });
  s.once('connect', () => { s.destroy(); resolve(true); });
  s.once('error', () => resolve(false));
});
if (inUse) {
  console.log(`The local database is already running on port ${PORT}. Nothing to start.`);
  console.log('If no terminal of yours is running it, another session started it; it stops when that session ends.');
  process.exit(0);
}

console.log(`Starting the local database on port ${PORT}. Keep this terminal open while you use /admin/. Press Ctrl+C to stop it.`);
const server = fileURLToPath(new URL('../node_modules/@electric-sql/pglite-socket/dist/scripts/server.js', import.meta.url));
// pg_trgm backs the "contains" search indexes, as on Neon (migration 0003).
const child = spawn(process.execPath, [server, '--db=.data/pglite', `--port=${PORT}`, '--max-connections=4', '--extensions=pg_trgm'], { stdio: 'inherit' });
// Ctrl+C reaches both processes; let the database shut down cleanly first.
process.on('SIGINT', () => {});
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', (code) => process.exit(code ?? 0));
