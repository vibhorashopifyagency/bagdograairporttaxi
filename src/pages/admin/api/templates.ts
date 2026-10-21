import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { audit } from '../../../server/admin';
import { getDb, schema } from '../../../server/db';
import { ipHash, randomCode } from '../../../server/security';
import { TEMPLATES_KEY, customTemplates } from '../../../server/trip';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), name: z.string().trim().min(1).max(40), text: z.string().trim().min(10).max(2000) }),
  z.object({ action: z.literal('remove'), id: z.string().max(20) }),
]);

/**
 * POST: saves a message template from the itinerary popup ("Save as
 * template"), or removes one. Built-in templates cannot be removed. Saved
 * templates are shared by the whole team. At most 20.
 */
export const POST: APIRoute = async ({ request, locals, url }) => {
  const user = locals.user;
  if (!user) return json(401, { ok: false, error: 'Please sign in again.' });
  if (request.headers.get('origin') !== url.origin) return json(403, { ok: false, error: 'Not allowed.' });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { ok: false, error: 'Give the template a short name.' });
  const body = parsed.data;

  const list = (await customTemplates()).map(({ id, name, text }) => ({ id, name, text }));
  let next = list;
  let added: { id: string; name: string; text: string } | undefined;
  if (body.action === 'add') {
    if (list.length >= 20) return json(400, { ok: false, error: 'There are already 20 saved templates. Remove one first.' });
    added = { id: `t${randomCode(6).toLowerCase()}`, name: body.name, text: body.text };
    next = [...list, added];
  } else {
    next = list.filter((t) => t.id !== body.id);
  }
  await getDb()
    .insert(schema.settings)
    .values({ key: TEMPLATES_KEY, value: next, updatedBy: user.id })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: next, updatedBy: user.id } });
  await audit({ actorId: user.id, action: `template_${body.action}`, entity: 'settings', entityId: TEMPLATES_KEY, detail: { name: added?.name }, ipHash: ipHash(request) });
  return json(200, { ok: true, template: added ? { ...added, custom: true } : undefined });
};

export const ALL: APIRoute = () => json(405, { ok: false, error: 'Method not allowed.' });
