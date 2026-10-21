/**
 * Logins for the admin and staff (Better Auth).
 *
 * - Username and password only. Public sign-up is off: the admin creates
 *   staff accounts, and the very first admin is created once at /admin/setup/.
 * - Two roles: `admin` (everything) and `staff` (bookings and customers).
 * - Two-factor login with an authenticator app, recommended for the admin.
 * - Failed sign-ins are rate-limited per IP by Better Auth and locked per
 *   username here: 8 failures in 15 minutes blocks that username for 15 minutes.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware, isAPIError } from 'better-auth/api';
import { admin, twoFactor, username } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';
import { and, count, desc, eq, gte, inArray } from 'drizzle-orm';
import { getDb, schema } from './db';
import { env, isProduction, requireEnv } from './env';

export const ROLES = ['admin', 'staff'] as const;
export type Role = (typeof ROLES)[number];

const ac = createAccessControl(defaultStatements);
const roles = {
  admin: ac.newRole(adminAc.statements),
  staff: ac.newRole({ user: [], session: [] }),
};

const LOCK_WINDOW_MS = 15 * 60 * 1000;
const LOCK_AFTER_FAILURES = 8;
const SIGN_IN_PATH = '/sign-in/username';

/**
 * Origins allowed to post to /api/auth/. The site's own address is always
 * trusted, so Vercel preview deployments (whose URLs change) work without
 * extra settings; a request from any other site is still refused.
 */
function trustedOrigins(request?: Request): string[] {
  const list = [
    request && new URL(request.url).origin,
    env('BETTER_AUTH_URL'),
    'https://bagdograairporttaxi.com',
    'https://www.bagdograairporttaxi.com',
    env('VERCEL_URL') && `https://${env('VERCEL_URL')}`,
    env('VERCEL_BRANCH_URL') && `https://${env('VERCEL_BRANCH_URL')}`,
    !isProduction() && 'http://localhost:4321',
  ];
  return list.filter((v): v is string => Boolean(v));
}

function createAuth() {
  const db = getDb();
  return betterAuth({
    appName: 'Bagdogra Airport Taxi',
    secret: requireEnv('BETTER_AUTH_SECRET'),
    baseURL: env('BETTER_AUTH_URL'),
    basePath: '/api/auth',
    trustedOrigins: (request) => trustedOrigins(request),
    database: drizzleAdapter(db, { provider: 'pg', schema: schema.authSchema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14, // 14 days
      updateAge: 60 * 60 * 24, // refreshed once a day of use
    },
    user: {
      additionalFields: {
        canRecordPayments: { type: 'boolean', defaultValue: false, input: false },
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        [SIGN_IN_PATH]: { window: 60, max: 5 },
        '/two-factor/verify-totp': { window: 60, max: 5 },
        '/two-factor/verify-backup-code': { window: 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: isProduction(),
      ipAddress: { ipAddressHeaders: ['x-real-ip', 'x-forwarded-for'] },
    },
    plugins: [
      username({ minUsernameLength: 3, maxUsernameLength: 30 }),
      admin({ ac, roles, defaultRole: 'staff', adminRoles: ['admin'] }),
      twoFactor({ issuer: 'Bagdogra Airport Taxi' }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== SIGN_IN_PATH) return;
        const name = String(ctx.body?.username ?? '').trim().toLowerCase();
        if (!name) return;
        // Failures before the latest password reset no longer count.
        let since = new Date(Date.now() - LOCK_WINDOW_MS);
        const [u] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.username, name));
        if (u) {
          const [reset] = await db
            .select({ at: schema.auditLog.at })
            .from(schema.auditLog)
            .where(and(eq(schema.auditLog.entityId, u.id), inArray(schema.auditLog.action, ['password_recovered', 'password_set'])))
            .orderBy(desc(schema.auditLog.at))
            .limit(1);
          if (reset && reset.at > since) since = reset.at;
        }
        const [row] = await db
          .select({ n: count() })
          .from(schema.auditLog)
          .where(
            and(
              eq(schema.auditLog.action, 'sign_in_failed'),
              eq(schema.auditLog.entityId, name),
              gte(schema.auditLog.at, since),
            ),
          );
        if ((row?.n ?? 0) >= LOCK_AFTER_FAILURES) {
          throw new APIError('TOO_MANY_REQUESTS', {
            message: 'Too many wrong passwords for this username. Try again in 15 minutes.',
          });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== SIGN_IN_PATH) return;
        const returned = ctx.context.returned;
        if (isAPIError(returned) && returned.status !== 'TOO_MANY_REQUESTS') {
          const name = String(ctx.body?.username ?? '').trim().toLowerCase();
          await db.insert(schema.auditLog).values({ action: 'sign_in_failed', entity: 'username', entityId: name });
        }
      }),
    },
    databaseHooks: {
      session: {
        create: {
          after: async (s) => {
            await db.insert(schema.auditLog).values({
              actorId: s.userId,
              action: 'sign_in',
              entity: 'user',
              entityId: s.userId,
            });
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
let auth: Auth | undefined;

/** Created on first use so building the static site never needs the secrets. */
export function getAuth(): Auth {
  auth ??= createAuth();
  return auth;
}

/** The email Better Auth requires, for an account that has none. */
export const placeholderEmail = (uname: string) => `${uname.toLowerCase()}@users.invalid`;
