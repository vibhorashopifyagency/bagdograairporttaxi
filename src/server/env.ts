/**
 * Server-only settings, read from environment variables. On Vercel they are
 * set under Project Settings > Environment Variables; locally in `.env`
 * (see `.env.example`). Never import this file from browser code.
 */
let dotenvLoaded = false;

/**
 * In development, read .env when first needed. Astro reads it only at
 * startup, so a .env created or edited while `npm run dev` is running would
 * otherwise be ignored until a restart. On Vercel there is no .env file and
 * this does nothing.
 */
function loadDotEnvInDev(): void {
  if (dotenvLoaded) return;
  dotenvLoaded = true;
  if (!import.meta.env.DEV || typeof process === 'undefined' || !process.loadEnvFile) return;
  try {
    process.loadEnvFile('.env');
  } catch {
    // No .env file: fall through to the "Missing environment variable" error.
  }
}

export function env(name: string): string | undefined {
  loadDotEnvInDev();
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined;
  const fromVite = (import.meta.env as Record<string, string | undefined>)[name];
  const v = fromProcess ?? fromVite;
  return v === '' ? undefined : v;
}

export function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

export const isProduction = () => env('VERCEL_ENV') === 'production' || env('NODE_ENV') === 'production';
