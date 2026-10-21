/** Helpers shared by the /admin/ pages. */
import { createHmac } from 'node:crypto';
import { and, count, eq, gte, isNull } from 'drizzle-orm';
import { getAuth, placeholderEmail, type Role } from './auth';
import { getDb, schema } from './db';
import { requireEnv } from './env';
import { randomCode } from './security';

/** Record who did what. Never throws: a logging hiccup must not block work. */
export async function audit(entry: {
  actorId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  ipHash?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await getDb().insert(schema.auditLog).values(entry);
  } catch (e) {
    console.error('[audit] failed', e);
  }
}

export async function countUsers(): Promise<number> {
  const [row] = await getDb().select({ n: count() }).from(schema.user);
  return row?.n ?? 0;
}

/* ---------------- Recovery codes (password reset without email) ---------------- */

const normalizeCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');
const hashCode = (c: string) =>
  createHmac('sha256', requireEnv('BETTER_AUTH_SECRET')).update(normalizeCode(c)).digest('hex');

/** Replaces the user's recovery codes with 8 new ones and returns them (shown once). */
export async function createRecoveryCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: 8 }, () => `${randomCode(5)}-${randomCode(5)}`);
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(schema.recoveryCodes).where(eq(schema.recoveryCodes.userId, userId));
    await tx.insert(schema.recoveryCodes).values(codes.map((c) => ({ userId, codeHash: hashCode(c) })));
  });
  return codes;
}

export async function unusedRecoveryCodes(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(schema.recoveryCodes)
    .where(and(eq(schema.recoveryCodes.userId, userId), isNull(schema.recoveryCodes.usedAt)));
  return row?.n ?? 0;
}

const RECOVER_WINDOW_MS = 15 * 60 * 1000;
const RECOVER_MAX_FAILS = 5;

/**
 * Sets a new password with a one-time recovery code. Signs the user out
 * everywhere. Returns an error message for the person, or null on success.
 */
export async function recoverWithCode(input: {
  username: string;
  code: string;
  newPassword: string;
  ipHash: string;
}): Promise<string | null> {
  const db = getDb();
  const [fails] = await db
    .select({ n: count() })
    .from(schema.auditLog)
    .where(
      and(
        eq(schema.auditLog.action, 'recover_failed'),
        eq(schema.auditLog.ipHash, input.ipHash),
        gte(schema.auditLog.at, new Date(Date.now() - RECOVER_WINDOW_MS)),
      ),
    );
  if ((fails?.n ?? 0) >= RECOVER_MAX_FAILS) return 'Too many attempts. Try again in 15 minutes.';
  if (input.newPassword.length < 10 || input.newPassword.length > 128) return 'The new password must be 10 to 128 characters.';

  const uname = input.username.trim().toLowerCase();
  const [u] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.username, uname));
  const [code] = u
    ? await db
        .select({ id: schema.recoveryCodes.id })
        .from(schema.recoveryCodes)
        .where(
          and(
            eq(schema.recoveryCodes.userId, u.id),
            eq(schema.recoveryCodes.codeHash, hashCode(input.code)),
            isNull(schema.recoveryCodes.usedAt),
          ),
        )
    : [];
  if (!u || !code) {
    await audit({ action: 'recover_failed', entity: 'username', entityId: uname, ipHash: input.ipHash });
    return 'That username and recovery code do not match.';
  }

  const ctx = await getAuth().$context;
  const hash = await ctx.password.hash(input.newPassword);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.account)
      .set({ password: hash })
      .where(and(eq(schema.account.userId, u.id), eq(schema.account.providerId, 'credential')));
    await tx.update(schema.recoveryCodes).set({ usedAt: new Date() }).where(eq(schema.recoveryCodes.id, code.id));
    await tx.delete(schema.session).where(eq(schema.session.userId, u.id));
  });
  await audit({ actorId: u.id, action: 'password_recovered', entity: 'user', entityId: u.id, ipHash: input.ipHash });
  return null;
}

/* ---------------- Accounts ---------------- */

const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

export function checkNewAccount(input: { name: string; username: string; password: string; role: string }): string | null {
  if (!input.name.trim() || input.name.length > 80) return 'Enter a name of up to 80 characters.';
  if (!USERNAME_RE.test(input.username)) return 'Usernames are 3 to 30 lower-case letters, numbers, dots or underscores.';
  if (input.password.length < 10 || input.password.length > 128) return 'Passwords must be 10 to 128 characters.';
  if (input.role !== 'admin' && input.role !== 'staff') return 'Choose a role.';
  return null;
}

/**
 * Creates a login. With `headers` the signed-in admin's rights are checked;
 * without them (first-run setup only) the call is trusted server code.
 */
export async function createAccount(
  input: { name: string; username: string; password: string; role: Role },
  headers?: Headers,
) {
  const uname = input.username.trim().toLowerCase();
  const res = await getAuth().api.createUser({
    body: {
      email: placeholderEmail(uname),
      password: input.password,
      name: input.name.trim(),
      role: input.role,
      data: { username: uname, displayUsername: input.username.trim() },
    },
    headers,
  });
  return res.user;
}

export const isAdmin = (u: { role?: string | null } | null | undefined) => u?.role === 'admin';
