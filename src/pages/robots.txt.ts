import type { APIRoute } from 'astro';
import { PRE_LAUNCH, SITE } from '../data/site';

/**
 * robots.txt, generated so it can never drift from the PRE_LAUNCH switch.
 *
 * The old site's robots.txt refused crawlers (the 19 Oct 2026 research could
 * not even fetch the homepage). This one allows everything. Nothing on the
 * site is private: the booking form runs in the browser and there is no admin
 * area. The crawlers that matter for search and for AI answers are named in
 * their own groups because, per Google's robots.txt rules, a crawler obeys
 * only the most specific group that names it, so a later `*` rule can never
 * silently shut one out. Google's AdsBot ignores `*` altogether.
 *
 * Content-Signal is the robots.txt extension (contentsignals.org, 2025) that
 * states how crawled content may be used: in search results, as input to AI
 * answers, and for training. All three are a yes here, on purpose: an AI
 * assistant that has read this site quotes its fares and policies correctly.
 */
const GROUPS: [string, string[]][] = [
  ['Search engines', ['Googlebot', 'Googlebot-Image', 'Googlebot-Video', 'Bingbot', 'DuckDuckBot', 'Slurp', 'YandexBot', 'Baiduspider', 'Applebot', 'SeznamBot', 'Qwantbot']],
  ['Google Ads landing-page checks (they ignore the * group, so they are named)', ['AdsBot-Google', 'AdsBot-Google-Mobile', 'Mediapartners-Google']],
  ['Google crawlers that feed Gemini grounding and other Google products', ['Google-Extended', 'GoogleOther', 'Google-CloudVertexBot', 'Google-InspectionTool']],
  ['OpenAI: ChatGPT search, browsing and training', ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot']],
  ['Anthropic: Claude search, browsing and training', ['Claude-SearchBot', 'Claude-User', 'ClaudeBot']],
  ['Perplexity', ['PerplexityBot', 'Perplexity-User']],
  ['Other assistants and answer engines', ['Applebot-Extended', 'Meta-ExternalAgent', 'Meta-ExternalFetcher', 'Amazonbot', 'DuckAssistBot', 'YouBot', 'cohere-ai', 'MistralAI-User', 'Bytespider', 'PetalBot', 'CCBot']],
];

export const GET: APIRoute = () => {
  // The dev server always shows the launch version so it can be reviewed.
  const body = PRE_LAUNCH && !import.meta.env.DEV
    ? `# ${SITE.name}: pre-launch build. Nothing here should be indexed yet.\nUser-agent: *\nDisallow: /\n`
    : [
        `# robots.txt for ${SITE.name}: ${SITE.url}`,
        '# Every page is public and may be crawled, indexed, quoted and used to answer questions.',
        `# Summaries for language models: ${SITE.url}/llms.txt (index) and ${SITE.url}/llms-full.txt (full text).`,
        `# Structured data (JSON-LD) is on every page; the travel-guide feed is ${SITE.url}/feed.xml.`,
        '',
        '# Content signals (contentsignals.org): search results yes, AI answers yes, AI training yes.',
        'Content-Signal: search=yes, ai-input=yes, ai-train=yes',
        '',
        'User-agent: *',
        'Allow: /',
        '',
        ...GROUPS.flatMap(([label, agents]) => [`# ${label}`, ...agents.map((ua) => `User-agent: ${ua}`), 'Allow: /', '']),
        `Sitemap: ${SITE.url}/sitemap-index.xml`,
        '',
      ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
