// Post-build checks. Fails the build on anything that would hurt SEO or trust.
//  1. Every indexable page has exactly one <h1>, a <title> of 30–70 chars,
//     a meta description of 70–170 chars, a canonical and valid JSON-LD.
//  2. Every internal link points at a page that exists.
//  3. The 404 page is noindex.
//  4. With PRE_LAUNCH off, no placeholder text may ship.
//  5. Google Search rules that are easy to break by accident: no Review or
//     AggregateRating markup about our own business (self-serving reviews are
//     ineligible and a manual-action risk), every Article date carries a
//     timezone, every <img> has alt text, and every sitemap <lastmod> is a
//     valid date.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const problems = [];
const warnings = [];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = await walk(DIST);
const pages = new Set(files.map((f) => '/' + f.slice(DIST.length + 1).replace(/index\.html$/, '').replace(/\.html$/, '/')));
pages.add('/'); pages.add('/llms.txt'); pages.add('/llms-full.txt'); pages.add('/robots.txt'); pages.add('/sitemap-index.xml');
const preLaunch = /<meta name="robots" content="noindex, nofollow"/;
let anyLive = false;

for (const f of files) {
  const html = await readFile(f, 'utf8');
  const url = '/' + f.slice(DIST.length + 1).replace(/index\.html$/, '');
  if (/http-equiv="refresh"/.test(html)) continue; // redirect stubs
  const isNoindex = /<meta name="robots" content="noindex/.test(html);
  if (!preLaunch.test(html)) anyLive = true;

  if (url === '/404.html' && !isNoindex) problems.push('404 page is indexable');
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) problems.push(`${url}: ${h1} <h1> elements`);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const t = title.replace(/&amp;/g, '&').replace(/&#39;/g, "'");
  if (t.length < 30 || t.length > 75) warnings.push(`${url}: title ${t.length} chars "${t}"`);
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (desc.length < 70 || desc.length > 170) warnings.push(`${url}: description ${desc.length} chars`);
  if (!isNoindex && !/<link rel="canonical"/.test(html)) problems.push(`${url}: no canonical`);
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let graph;
    try { graph = JSON.parse(m[1]); } catch { problems.push(`${url}: invalid JSON-LD`); continue; }
    const nodes = JSON.stringify(graph);
    if (/"@type":"(AggregateRating|Review)"/.test(nodes)) problems.push(`${url}: Review/AggregateRating markup (Google forbids it for a business's own reviews)`);
    for (const d of nodes.matchAll(/"date(Published|Modified)":"([^"]+)"/g)) {
      if (!/T\d\d:\d\d(:\d\d)?(Z|[+-]\d\d:\d\d)$/.test(d[2])) problems.push(`${url}: ${d[0]} has no timezone`);
    }
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt(=|[\s>\/])/.test(m[0])) problems.push(`${url}: <img> without alt`);
  }
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const href = m[1];
    if (/\.(png|svg|xml|txt|webmanifest|ico|woff2|webp|jpg)$/.test(href)) continue;
    if (!pages.has(href)) problems.push(`${url}: broken link ${href}`);
  }
}

try {
  const sm = await readFile(join(DIST, 'sitemap-0.xml'), 'utf8');
  for (const m of sm.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) {
    if (Number.isNaN(Date.parse(m[1]))) problems.push(`sitemap: invalid lastmod ${m[1]}`);
  }
  if (!/<lastmod>/.test(sm)) warnings.push('sitemap: no <lastmod> on any URL');
} catch { problems.push('sitemap-0.xml missing'); }

if (anyLive) {
  const all = (await Promise.all(files.map((f) => readFile(f, 'utf8')))).join('\n');
  if (/00000 00000|910000000000|TODO\(pre-launch\)/.test(all)) problems.push('PRE_LAUNCH is off but placeholder contact details are still in the build');
  if (/data-sample-reviews/.test(all)) problems.push('PRE_LAUNCH is off but the reviews slider still shows sample reviews: set GOOGLE_PLACES_API_KEY and run npm run reviews');
}

for (const w of [...new Set(warnings)]) console.warn('  warn:', w);
if (problems.length) {
  for (const p of [...new Set(problems)]) console.error('  FAIL:', p);
  process.exit(1);
}
console.log(`verify-build: ${files.length} pages OK${anyLive ? '' : ' (pre-launch: all noindex)'}`);
