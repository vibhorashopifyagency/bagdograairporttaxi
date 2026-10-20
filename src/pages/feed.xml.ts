import type { APIRoute } from 'astro';
import { PRE_LAUNCH, SITE } from '../data/site';
import { GUIDES } from '../data/guides';

/**
 * RSS feed of the travel guides (linked from every page's <head>). Feed
 * readers and AI crawlers use it to notice when a guide is updated, which is
 * a freshness signal the answer engines weigh. Built from the same GUIDES
 * list as the guides index, so it can never list a page that does not exist.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rfc822 = (iso: string) => new Date(`${iso}T00:00:00+05:30`).toUTCString();

export const GET: APIRoute = () => {
  const items = PRE_LAUNCH
    ? []
    : [...GUIDES].sort((a, b) => b.updated.localeCompare(a.updated)).map((g) => {
        const url = `${SITE.url}/guides/${g.slug}/`;
        return [
          '    <item>',
          `      <title>${esc(g.title)}</title>`,
          `      <link>${url}</link>`,
          `      <guid isPermaLink="true">${url}</guid>`,
          `      <pubDate>${rfc822(g.updated)}</pubDate>`,
          `      <description>${esc(g.description)}</description>`,
          '    </item>',
        ].join('\n');
      });
  const latest = GUIDES.map((g) => g.updated).sort().at(-1) ?? SITE.contentUpdated;
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${esc(SITE.name)}: travel guides</title>`,
    `    <link>${SITE.url}/guides/</link>`,
    `    <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml" />`,
    `    <description>${esc(`Practical guides from a local Bagdogra taxi operator: Sikkim permits, getting from Bagdogra Airport to Darjeeling and Gangtok, Nathula Pass, the best months to travel and offbeat places near the airport.`)}</description>`,
    `    <language>${SITE.locale.toLowerCase()}</language>`,
    `    <lastBuildDate>${rfc822(latest)}</lastBuildDate>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
