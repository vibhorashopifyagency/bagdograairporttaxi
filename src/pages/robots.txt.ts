import type { APIRoute } from 'astro';
import { PRE_LAUNCH, SITE } from '../data/site';

/**
 * robots.txt, generated so it can never drift from the PRE_LAUNCH switch.
 *
 * The old site's robots.txt refused crawlers (the 19 Oct 2026 research could
 * not even fetch the homepage). This one allows everything, and names the
 * search and AI crawlers explicitly so a later wildcard rule can't silently
 * shut them out. Nothing on this site is private: the booking form runs in
 * the browser and there is no admin area to hide.
 */
const AI_AND_SEARCH_AGENTS = [
  // Search engines
  'Googlebot', 'Googlebot-Image', 'Bingbot', 'DuckDuckBot', 'Slurp', 'YandexBot', 'Applebot',
  // Google Ads landing-page checks ignore `*`, so they are named
  'AdsBot-Google', 'AdsBot-Google-Mobile',
  // AI answer engines and assistants
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended', 'Amazonbot', 'Meta-ExternalAgent',
  'DuckAssistBot', 'cohere-ai', 'MistralAI-User', 'CCBot',
];

export const GET: APIRoute = () => {
  const body = PRE_LAUNCH
    ? `# ${SITE.name}: pre-launch build. Nothing here should be indexed yet.\nUser-agent: *\nDisallow: /\n`
    : [
        `# ${SITE.name}: ${SITE.url}`,
        '# Every page is public. AI assistants and answer engines are welcome.',
        '# Plain-text summaries for language models: /llms.txt and /llms-full.txt',
        '',
        'User-agent: *',
        'Allow: /',
        '',
        ...AI_AND_SEARCH_AGENTS.flatMap((ua) => [`User-agent: ${ua}`]),
        'Allow: /',
        '',
        `Sitemap: ${SITE.url}/sitemap-index.xml`,
        '',
      ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
