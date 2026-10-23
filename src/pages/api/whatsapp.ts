import type { APIRoute } from 'astro';
import { signedByMeta, takeWebhook, verifyChallenge, webhookReady } from '../../server/whatsapp';

export const prerender = false;

const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

/**
 * Meta's WhatsApp webhook (Phase 8, src/server/whatsapp.ts), its Callback URL
 * in the Meta app: https://<site>/api/whatsapp/.
 *   GET   Meta's one-time check when the webhook is saved: answers its
 *         challenge if the verify token matches WHATSAPP_VERIFY_TOKEN.
 *   POST  delivery reports (sent, delivered, read, failed) and the time a
 *         customer wrote, signed by Meta with the app secret. Anything not
 *         signed is turned away. A database error answers 500, so Meta
 *         sends the report again later.
 * Off (404) until WHATSAPP_APP_SECRET and WHATSAPP_VERIFY_TOKEN are set.
 */
export const GET: APIRoute = ({ url }) => {
  if (!webhookReady()) return new Response('Not found', { status: 404, headers });
  const challenge = verifyChallenge(url.searchParams);
  return challenge ? new Response(challenge, { headers: { ...headers, 'Content-Type': 'text/plain' } }) : new Response('Forbidden', { status: 403, headers });
};

export const POST: APIRoute = async ({ request }) => {
  if (!webhookReady()) return new Response('Not found', { status: 404, headers });
  const raw = await request.text();
  if (raw.length > 1_000_000 || !signedByMeta(raw, request.headers.get('x-hub-signature-256'))) return new Response('Forbidden', { status: 403, headers });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('Bad request', { status: 400, headers });
  }
  try {
    await takeWebhook(body);
    return new Response('OK', { headers });
  } catch (e) {
    console.error('[whatsapp] could not record a webhook call', e);
    return new Response('Try again', { status: 500, headers });
  }
};
