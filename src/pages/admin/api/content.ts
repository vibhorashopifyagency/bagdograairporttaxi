import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import type { ContentType } from '../../../data/published';
import { isAdmin } from '../../../server/admin';
import {
  discardAll,
  discardDraft,
  getEntry,
  markForRemoval,
  markForReset,
  publishAll,
  publishStatus,
  restoreVersion,
  saveDraft,
  startDeploy,
} from '../../../server/content';
import { fareTextNote, fixLabel, type Fares } from '../../../server/content-forms';
import { ipHash } from '../../../server/security';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const TYPES = ['site', 'business', 'policy', 'vehicle', 'route', 'package', 'destination', 'faq', 'gallery', 'guide', 'order'] as const;
const item = { type: z.enum(TYPES), key: z.string().min(1).max(120) };
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), ...item, data: z.unknown() }),
  z.object({ action: z.literal('remove'), ...item }),
  z.object({ action: z.literal('reset'), ...item }),
  z.object({ action: z.literal('discard'), ...item }),
  z.object({ action: z.literal('discard-all') }),
  z.object({ action: z.literal('restore'), id: z.number().int().positive() }),
  z.object({ action: z.literal('publish') }),
  // "Try again" after a deploy that did not start, and "Refresh Google reviews".
  z.object({ action: z.literal('redeploy') }),
  // The fare grid: new fares for one route, and "Change it to ₹3,100" for its text.
  z.object({ action: z.literal('route-fares'), key: z.string().min(1).max(120), fares: z.record(z.string(), z.number()), fixText: z.boolean().optional() }),
  // "Change many at once".
  z.object({
    action: z.literal('bulk-fares'),
    keys: z.array(z.string().min(1).max(120)).min(1).max(500),
    cars: z.array(z.enum(['sedan', 'suv', 'innova', 'traveller'])).min(1),
    mode: z.enum(['percent', 'amount']),
    value: z.number().min(-90).max(100000),
    round: z.union([z.literal(10), z.literal(50), z.literal(100)]),
  }),
  z.object({ action: z.literal('order'), type: z.enum(['route', 'package', 'destination']), keys: z.array(z.string().min(1).max(120)).max(500) }),
  // The page editor: one field of one item, typed on the page itself.
  z.object({ action: z.literal('field'), ...item, path: z.string().regex(/^[a-zA-Z]{1,40}$/), value: z.union([z.string().max(5000), z.null()]) }),
]);

/**
 * Website editing, admin only (src/server/content.ts checks the role again
 * from the database).
 *   GET  whether the last publish is live yet, for the publish bar.
 *   POST { action: 'save', type, key, data } and the other actions above.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!isAdmin(locals.user)) return json(403, { ok: false, error: 'Only the admin can change the website.' });
  // ?items=destination:darjeeling,faq:main: what the page editor shows over the published page.
  const wanted = (url.searchParams.get('items') ?? '').split(',').filter((x) => /^[a-z]+:[a-z0-9-]{1,120}$/.test(x)).slice(0, 20);
  if (wanted.length) {
    const items: Record<string, unknown> = {};
    for (const w of wanted) {
      const [type, key] = w.split(':') as [ContentType, string];
      const e = (TYPES as readonly string[]).includes(type) ? await getEntry(type, key) : null;
      if (e) items[w] = { current: e.current, live: e.live, pending: e.pending, state: e.state };
    }
    return json(200, { ok: true, items });
  }
  return json(200, { ok: true, ...(await publishStatus()) });
};

export const POST: APIRoute = async ({ request, locals, url }) => {
  const user = locals.user;
  if (!user) return json(401, { ok: false, error: 'Please sign in again.' });
  if (!isAdmin(user)) return json(403, { ok: false, error: 'Only the admin can change the website.' });
  if (request.headers.get('origin') !== url.origin) return json(403, { ok: false, error: 'Not allowed.' });

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { ok: false, error: 'Invalid request.' });
  const ctx = { actorId: user.id, ipHash: ipHash(request) };
  const p = parsed.data;

  switch (p.action) {
    case 'save': {
      const r = await saveDraft(ctx, p.type as ContentType, p.key, p.data);
      if (!r.ok) return json(422, r);
      const e = await getEntry(p.type as ContentType, p.key);
      return json(200, { ...r, current: e?.current ?? null, live: e?.live ?? null, pending: e?.pending ?? null });
    }
    case 'remove':
      return json(200, await markForRemoval(ctx, p.type as ContentType, p.key));
    case 'reset':
      return json(200, await markForReset(ctx, p.type as ContentType, p.key));
    case 'discard':
      return json(200, await discardDraft(ctx, p.type as ContentType, p.key));
    case 'discard-all':
      return json(200, await discardAll(ctx));
    case 'restore':
      return json(200, await restoreVersion(ctx, p.id));
    case 'publish': {
      const r = await publishAll(ctx);
      return json(r.ok ? 200 : 422, r);
    }
    case 'route-fares': {
      const e = await getEntry('route', p.key);
      if (!e?.current || Array.isArray(e.current)) return json(404, { ok: false, error: 'That route no longer exists.' });
      const live = ((e.live as Record<string, unknown> | null)?.fares ?? (e.current as Record<string, unknown>).fares) as Fares;
      const data: Record<string, unknown> = { ...e.current, fares: { ...(e.current.fares as Fares), ...p.fares } };
      if (p.fixText) {
        const note = fareTextNote(data, live);
        if (note?.fixed) Object.assign(data, note.fixed);
      }
      const r = await saveDraft(ctx, 'route', p.key, data);
      if (!r.ok) return json(422, r);
      const after = (await getEntry('route', p.key))!;
      const note = fareTextNote(after.current as Record<string, unknown>, live);
      return json(200, { ok: true, live, fares: (after.current as Record<string, unknown>).fares, pending: after.pending, note: note && { ...note, label: fixLabel(note, after.current as Record<string, unknown>, live) } });
    }
    case 'bulk-fares': {
      let changed = 0;
      const errors: string[] = [];
      for (const key of p.keys) {
        const e = await getEntry('route', key);
        if (!e?.current || Array.isArray(e.current)) continue;
        const fares = { ...(e.current.fares as Fares) };
        for (const car of p.cars) {
          const raw = p.mode === 'percent' ? fares[car] * (1 + p.value / 100) : fares[car] + p.value;
          fares[car] = Math.max(p.round, Math.round(raw / p.round) * p.round);
        }
        const live = ((e.live as Record<string, unknown> | null)?.fares ?? fares) as Fares;
        const data: Record<string, unknown> = { ...e.current, fares };
        const note = fareTextNote(data, live);
        if (note?.fixed) Object.assign(data, note.fixed);
        const r = await saveDraft(ctx, 'route', key, data);
        if (r.ok) changed++;
        else errors.push(`${(e.current as Record<string, unknown>).toShort}: ${r.error}`);
      }
      return json(200, { ok: errors.length === 0, changed, errors });
    }
    case 'order':
      return json(200, await saveDraft(ctx, 'order', p.type, p.keys));
    case 'field': {
      const e = await getEntry(p.type as ContentType, p.key);
      if (!e?.current || Array.isArray(e.current)) return json(404, { ok: false, error: 'That part of the website no longer exists. Reload the page.' });
      if (!(p.path in e.current) && !['photo', 'permit', 'short'].includes(p.path)) return json(400, { ok: false, error: 'That cannot be edited here.' });
      const r = await saveDraft(ctx, p.type as ContentType, p.key, { ...e.current, [p.path]: p.value });
      if (!r.ok) return json(422, r);
      const after = await getEntry(p.type as ContentType, p.key);
      return json(200, { ok: true, message: r.message, value: (after?.current as Record<string, unknown> | null)?.[p.path] ?? null, pending: after?.pending ?? null });
    }
    case 'redeploy': {
      const s = await publishStatus();
      const deploy = await startDeploy(ctx, s.latest);
      return json(200, { ok: deploy === 'started' || deploy === 'local', deploy });
    }
  }
};

export const ALL: APIRoute = () => json(405, { ok: false, error: 'Method not allowed.' });
