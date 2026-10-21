import type { APIRoute } from 'astro';
import { PRE_LAUNCH, SITE } from '../data/site';
import { llmsIndex } from '../lib/llms';

// Gated on PRE_LAUNCH like robots.txt: a pre-launch build must not hand out
// a full site summary while robots.txt says Disallow. The dev server (npm run
// dev) always shows the launch version so it can be reviewed.
export const GET: APIRoute = () =>
  new Response(PRE_LAUNCH && !import.meta.env.DEV ? `# ${SITE.name}\n\n> Not published yet.\n` : llmsIndex(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
