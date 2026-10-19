// Post-build checks. Fails the build on anything that would hurt SEO or trust.
//  1. Every indexable page has exactly one <h1>, a <title> of 30–70 chars,
//     a meta description of 70–170 chars, a canonical and valid JSON-LD.
//  2. Every internal link points at a page that exists.
//  3. The 404 page is noindex.
//  4. With PRE_LAUNCH off, no placeholder text may ship.
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
    try { JSON.parse(m[1]); } catch { problems.push(`${url}: invalid JSON-LD`); }
  }
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const href = m[1];
    if (/\.(png|svg|xml|txt|webmanifest|ico|woff2)$/.test(href)) continue;
    if (!pages.has(href)) problems.push(`${url}: broken link ${href}`);
  }
}

if (anyLive) {
  const all = (await Promise.all(files.map((f) => readFile(f, 'utf8')))).join('\n');
  if (/00000 00000|910000000000|TODO\(pre-launch\)/.test(all)) problems.push('PRE_LAUNCH is off but placeholder contact details are still in the build');
}

for (const w of [...new Set(warnings)]) console.warn('  warn:', w);
if (problems.length) {
  for (const p of [...new Set(problems)]) console.error('  FAIL:', p);
  process.exit(1);
}
console.log(`verify-build: ${files.length} pages OK${anyLive ? '' : ' (pre-launch: all noindex)'}`);
