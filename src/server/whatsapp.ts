/**
 * Phase 8: sending an itinerary straight from the dashboard through Meta's
 * WhatsApp Business Platform (the Cloud API), with sent, delivered and read
 * ticks from Meta's webhook (src/pages/api/whatsapp.ts). Stage 1, the
 * WhatsApp link and the phone's share sheet, stays as the way round when
 * this is off or a send fails.
 *
 * Off until the owner connects a number (docs/admin-setup.md, step 14):
 *   WHATSAPP_TOKEN            a permanent System User token from Meta
 *   WHATSAPP_PHONE_NUMBER_ID  the office number's id in WhatsApp Manager
 * and, for the ticks and the 24-hour rule below, the webhook:
 *   WHATSAPP_APP_SECRET       checks that a webhook call came from Meta
 *   WHATSAPP_VERIFY_TOKEN     any long random words, typed into Meta too
 * Optional: WHATSAPP_TEMPLATE (default trip_itinerary), WHATSAPP_TEMPLATE_LANG
 * (default en), WHATSAPP_API_VERSION (default v26.0), and WHATSAPP_API_URL for
 * a test stand-in in place of https://graph.facebook.com.
 *
 * Meta's rule: a business may write freely only within 24 hours of the
 * customer's last message to it; otherwise only with a template Meta has
 * approved. So a send is one of two kinds:
 *   - the customer wrote in the last 24 hours (the webhook says when): the
 *     popup's own message, exactly as written, with its trip link, then each
 *     photo;
 *   - otherwise, the approved template: the cover photo, the first name, the
 *     trip's title and its link. If Meta says the 24 hours are up after all,
 *     the template goes instead.
 * Every message is a whatsapp_messages row, whose status the webhook moves on.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { and, asc, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { getDb, schema } from './db';
import { env } from './env';
import type { WhatsAppStatus } from './db/schema';

const TEMPLATE = () => env('WHATSAPP_TEMPLATE') ?? 'trip_itinerary';
const LANG = () => env('WHATSAPP_TEMPLATE_LANG') ?? 'en';
const VERSION = () => env('WHATSAPP_API_VERSION') ?? 'v26.0';
/** Meta's address; a test sets a stand-in that answers like it. */
const API = () => (env('WHATSAPP_API_URL') ?? 'https://graph.facebook.com').replace(/\/+$/, '');
const WINDOW_MS = 24 * 3600e3;

/** Sending is switched on: the token and the number's id are set. */
export const whatsappReady = () => Boolean(env('WHATSAPP_TOKEN') && env('WHATSAPP_PHONE_NUMBER_ID'));
/** The webhook is switched on: Meta's calls can be checked. */
export const webhookReady = () => Boolean(env('WHATSAPP_APP_SECRET') && env('WHATSAPP_VERIFY_TOKEN'));

/* ------------------------------------------------------------------ */
/* Talking to Meta                                                     */
/* ------------------------------------------------------------------ */

type Sent = { ok: true; id: string } | { ok: false; code: number; error: string };

/** Meta's error codes, in the office's words. */
function plainError(code: number, message: string): string {
  if (code === 131047) return 'More than 24 hours have passed since the customer last wrote to you.';
  if (code === 131026) return 'This number is not on WhatsApp, or cannot receive messages from a business.';
  if (code === 131049) return 'WhatsApp held the message back to protect the customer’s inbox. Send the link instead.';
  if (code === 131056 || code === 130429 || code === 131048) return 'Too many messages in a short time. Wait a minute and try again.';
  if (code === 131053 || code === 131052) return 'WhatsApp could not fetch one of the photos.';
  if (code === 132000 || code === 132001 || code === 132012 || code === 132015 || code === 132016)
    return `The message template “${TEMPLATE()}” is not approved in this language yet, or does not have a photo and three fill-ins. See the setup guide, step 14.`;
  if (code === 190 || code === 0 || code === 10 || code === 200) return 'The WhatsApp token has expired or lacks permission. The admin makes a new one in Meta Business Settings (setup guide, step 14).';
  if (code === 133010) return 'The office number is not registered on the WhatsApp Business Platform yet.';
  return `WhatsApp refused it: ${message || 'no reason given'}.`;
}

async function post(body: Record<string, unknown>): Promise<Sent> {
  const url = `${API()}/${VERSION()}/${env('WHATSAPP_PHONE_NUMBER_ID')}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...body }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[]; error?: { code?: number; message?: string; error_data?: { details?: string } } };
    const id = json.messages?.[0]?.id;
    if (res.ok && id) return { ok: true, id };
    const code = Number(json.error?.code ?? res.status);
    return { ok: false, code, error: plainError(code, json.error?.error_data?.details ?? json.error?.message ?? '') };
  } catch (e) {
    return { ok: false, code: -1, error: `WhatsApp did not answer (${(e as Error).message}). Check the connection and try again.` };
  }
}

/** A fill-in of a template: Meta refuses new lines, tabs and long runs of spaces in one. */
const param = (s: string) => ({ type: 'text', text: s.replace(/\s+/g, ' ').trim().slice(0, 1000) || '-' });

/* ------------------------------------------------------------------ */
/* Sending an itinerary                                                */
/* ------------------------------------------------------------------ */

export interface ItinerarySend {
  bookingId: string;
  actorId: string;
  /** Digits with the country code: 919800012345. */
  to: string;
  firstName: string;
  /** The trip's title: "Darjeeling and Gangtok, 12 to 16 Nov". */
  title: string;
  /** The customer's trip page, in full. */
  link: string;
  /** The popup's message as the customer will read it, the link in it. */
  text: string;
  /** The photos chosen in the popup, in order, as full addresses of JPEG pictures Meta can fetch. */
  photos: string[];
  /** The template's picture: the first photo, or a day's, or the hills. */
  cover: string;
}

export type ItinerarySent =
  | { ok: true; mode: 'session' | 'template'; messages: number; warning?: string }
  | { ok: false; error: string };

/** When this number last wrote to the office, if the webhook has heard from it in the last 24 hours. */
async function wroteRecently(to: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ at: schema.whatsappInbound.lastAt })
    .from(schema.whatsappInbound)
    .where(and(eq(schema.whatsappInbound.waNumber, to), gt(schema.whatsappInbound.lastAt, new Date(Date.now() - WINDOW_MS + 5 * 60e3))));
  return Boolean(row);
}

async function record(input: ItinerarySend, sendId: string, waId: string, kind: 'template' | 'text' | 'image') {
  await getDb().insert(schema.whatsappMessages).values({ bookingId: input.bookingId, sendId, waId, kind, sentBy: input.actorId }).onConflictDoNothing();
}

/**
 * Sends the itinerary to the customer's WhatsApp from the office number.
 * Inside the 24 hours: the message, then up to ten photos. Otherwise, or
 * when Meta says the 24 hours are up: the approved template.
 */
export async function sendItinerary(input: ItinerarySend): Promise<ItinerarySent> {
  if (!whatsappReady()) return { ok: false, error: 'Sending from the dashboard is not switched on. Use Send on WhatsApp instead.' };
  if (!/^\d{11,15}$/.test(input.to)) return { ok: false, error: 'Check the WhatsApp number.' };
  const sendId = randomUUID();

  if (await wroteRecently(input.to)) {
    const first = await post({ to: input.to, type: 'text', text: { body: input.text.slice(0, 4096), preview_url: true } });
    if (first.ok) {
      await record(input, sendId, first.id, 'text');
      let sent = 1;
      let warning: string | undefined;
      for (const link of input.photos.slice(0, 10)) {
        const r = await post({ to: input.to, type: 'image', image: { link } });
        if (r.ok) {
          await record(input, sendId, r.id, 'image');
          sent++;
        } else {
          warning = `The message went, but not every photo: ${r.error}`;
          break;
        }
      }
      return { ok: true, mode: 'session', messages: sent, warning };
    }
    // The webhook's time was out of date: fall through to the template.
    if (first.code !== 131047) return { ok: false, error: first.error };
  }

  const t = await post({
    to: input.to,
    type: 'template',
    template: {
      name: TEMPLATE(),
      language: { code: LANG() },
      components: [
        { type: 'header', parameters: [{ type: 'image', image: { link: input.cover } }] },
        { type: 'body', parameters: [param(input.firstName || 'there'), param(input.title), param(input.link)] },
      ],
    },
  });
  if (!t.ok) return { ok: false, error: t.error };
  await record(input, sendId, t.id, 'template');
  return { ok: true, mode: 'template', messages: 1 };
}

/* ------------------------------------------------------------------ */
/* The webhook                                                         */
/* ------------------------------------------------------------------ */

/** True when the call carries Meta's signature for exactly this body (X-Hub-Signature-256, keyed with the app secret). */
export function signedByMeta(raw: string, header: string | null): boolean {
  const secret = env('WHATSAPP_APP_SECRET');
  if (!secret || !header?.startsWith('sha256=')) return false;
  const want = Buffer.from(createHmac('sha256', secret).update(raw, 'utf8').digest('hex'));
  const got = Buffer.from(header.slice(7));
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Meta's subscription check: answers its challenge when the verify token matches. */
export function verifyChallenge(params: URLSearchParams): string | null {
  const token = env('WHATSAPP_VERIFY_TOKEN');
  if (!token || params.get('hub.mode') !== 'subscribe') return null;
  const got = Buffer.from(params.get('hub.verify_token') ?? '');
  const want = Buffer.from(token);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  return params.get('hub.challenge');
}

const RANK: Record<WhatsAppStatus, number> = { accepted: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

interface Hook {
  entry?: {
    changes?: {
      field?: string;
      value?: {
        statuses?: { id?: string; status?: string; timestamp?: string; errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[] }[];
        messages?: { from?: string; timestamp?: string }[];
      };
    }[];
  }[];
}

/**
 * What Meta reported: each message's new status (it only moves forward, so a
 * late "sent" never hides a "read"), and the time each customer last wrote,
 * for the 24-hour rule. What customers wrote is never stored.
 */
export async function takeWebhook(body: unknown): Promise<{ statuses: number; inbound: number }> {
  const db = getDb();
  let statuses = 0;
  let inbound = 0;
  for (const entry of (body as Hook)?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      for (const s of change.value?.statuses ?? []) {
        const status = s.status as WhatsAppStatus;
        if (!s.id || !(status in RANK) || status === 'accepted') continue;
        const at = new Date(Number(s.timestamp) * 1000 || Date.now());
        const err = s.errors?.[0];
        const error = status === 'failed' ? plainError(Number(err?.code ?? 0), err?.error_data?.details ?? err?.message ?? err?.title ?? '') : null;
        const rows = await db
          .update(schema.whatsappMessages)
          .set({ status, statusAt: at, error })
          .where(
            and(
              eq(schema.whatsappMessages.waId, s.id),
              status === 'failed'
                ? sql`true`
                : inArray(schema.whatsappMessages.status, (Object.keys(RANK) as WhatsAppStatus[]).filter((k) => k !== 'failed' && RANK[k] < RANK[status])),
            ),
          )
          .returning({ id: schema.whatsappMessages.id });
        statuses += rows.length;
      }
      for (const m of change.value?.messages ?? []) {
        if (!m.from || !/^\d{6,15}$/.test(m.from)) continue;
        const at = new Date(Number(m.timestamp) * 1000 || Date.now());
        await db
          .insert(schema.whatsappInbound)
          .values({ waNumber: m.from, lastAt: at })
          .onConflictDoUpdate({ target: schema.whatsappInbound.waNumber, set: { lastAt: sql`greatest(${schema.whatsappInbound.lastAt}, excluded.last_at)` } });
        inbound++;
      }
    }
  }
  return { statuses, inbound };
}

/** For the nightly job: the 24-hour rule needs only the last two days. */
export async function forgetOldInbound(now = new Date()): Promise<number> {
  const gone = await getDb().delete(schema.whatsappInbound).where(lt(schema.whatsappInbound.lastAt, new Date(now.getTime() - 2 * WINDOW_MS))).returning({ n: schema.whatsappInbound.waNumber });
  return gone.length;
}

/* ------------------------------------------------------------------ */
/* Ticks on the booking                                                */
/* ------------------------------------------------------------------ */

export interface Ticks {
  at: Date;
  /** How far the first message of the last send got. */
  status: WhatsAppStatus;
  statusAt: Date;
  messages: number;
  /** "2 of 4 photos failed: WhatsApp could not fetch one of the photos." */
  error: string | null;
}

/** The last send straight from the dashboard for a booking, with how far it got. */
export async function lastSend(bookingId: string): Promise<Ticks | null> {
  const m = schema.whatsappMessages;
  const db = getDb();
  const [last] = await db.select({ sendId: m.sendId }).from(m).where(eq(m.bookingId, bookingId)).orderBy(desc(m.createdAt)).limit(1);
  if (!last) return null;
  const batch = await db.select().from(m).where(eq(m.sendId, last.sendId)).orderBy(asc(m.createdAt));
  const first = batch[0]!;
  const failed = batch.filter((r) => r.status === 'failed');
  return {
    at: first.createdAt,
    status: first.status,
    statusAt: first.statusAt,
    messages: batch.length,
    error: failed.length ? `${failed.length === batch.length ? 'It' : `${failed.length} of ${batch.length} messages`} failed: ${failed[0]!.error ?? 'no reason given'}` : null,
  };
}
