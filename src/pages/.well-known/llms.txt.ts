import type { APIRoute } from 'astro';
import { PRE_LAUNCH, SITE } from '../../data/site';
import { llmsIndex } from '../../lib/llms';

/**
 * The same llms.txt at the /.well-known/ path some AI crawlers and audit
 * tools look for first. One source (src/lib/llms.ts), two addresses.
 */
export const GET: APIRoute = () =>
  new Response(PRE_LAUNCH ? `# ${SITE.name}\n\n> Not published yet.\n` : llmsIndex(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
