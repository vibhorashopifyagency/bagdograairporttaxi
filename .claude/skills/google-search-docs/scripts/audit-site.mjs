#!/usr/bin/env node
// Audits a built static site (a directory of HTML files) against the rules in
// Google Search Central's documentation. No dependencies; Node 18+.
//
//   node audit-site.mjs <dist-dir> [--site https://example.com] [--json]
//
// Every check names the Google document it comes from, so a failure can be
// read up on. "FAIL" is something Google documents as a requirement, an
// eligibility rule or a spam/manual-action risk; "WARN" is a documented best
// practice the page falls short of; "INFO" is worth knowing but not wrong.
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
if (!dir) { console.error('usage: audit-site.mjs <dist-dir> [--site https://example.com] [--json]'); process.exit(2); }
const siteArg = args.includes('--site') ? args[args.indexOf('--site') + 1] : undefined;
const asJson = args.includes('--json');

const DOCS = {
  essentials: 'https://developers.google.com/search/docs/essentials',
  technical: 'https://developers.google.com/search/docs/essentials/technical',
  title: 'https://developers.google.com/search/docs/appearance/title-link',
  snippet: 'https://developers.google.com/search/docs/appearance/snippet',
  canonical: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
  robotsMeta: 'https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag',
  robotsTxt: 'https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt',
  sitemap: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap',
  sdPolicies: 'https://developers.google.com/search/docs/appearance/structured-data/sd-policies',
  review: 'https://developers.google.com/search/docs/appearance/structured-data/review-snippet',
  article: 'https://developers.google.com/search/docs/appearance/structured-data/article',
  breadcrumb: 'https://developers.google.com/search/docs/appearance/structured-data/breadcrumb',
  localBusiness: 'https://developers.google.com/search/docs/appearance/structured-data/local-business',
  organization: 'https://developers.google.com/search/docs/appearance/structured-data/organization',
  siteName: 'https://developers.google.com/search/docs/appearance/site-names',
  images: 'https://developers.google.com/search/docs/appearance/google-images',
  links: 'https://developers.google.com/search/docs/crawling-indexing/links-crawlable',
  favicon: 'https://developers.google.com/search/docs/appearance/favicon-in-search',
  mobile: 'https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing',
  updates: 'https://developers.google.com/search/updates',
  interstitials: 'https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials',
};

// Structured data types Google has retired (no rich result any more) or
// never supported in Search. Harmless, but they earn nothing on Google.
const RETIRED_TYPES = {
  FAQPage: 'FAQ rich result retired May 2026',
  HowTo: 'HowTo rich result retired 2023',
  SpecialAnnouncement: 'retired July 2025',
  ClaimReview: 'fact-check markup retired 2025',
  Course: 'course info retired 2025 (Course list ItemList still supported)',
  LearningResource: 'learning video retired 2025',
  Occupation: 'estimated salary retired 2025',
  Vehicle: 'vehicle listing retired 2025',
  Quiz: 'practice problems retired Nov 2025',
  SiteNavigationElement: 'never used by Google Search',
  SearchAction: 'sitelinks search box retired 2024',
};
const SELF_TYPES = ['LocalBusiness', 'Organization', 'Corporation', 'TravelAgency', 'Store', 'Restaurant', 'Hotel', 'Dentist', 'Physician', 'LegalService', 'AutoRepair', 'Plumber', 'HomeAndConstructionBusiness', 'ProfessionalService', 'MedicalBusiness', 'FoodEstablishment', 'LodgingBusiness', 'FinancialService', 'RealEstateAgent'];

const findings = [];
const add = (level, page, check, message, doc) => findings.push({ level, page, check, message, doc: DOCS[doc] ?? doc });

async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

// Attribute value, '' for a bare attribute (how Astro and others render alt=""), null when absent.
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}(?:\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+)))?(?=[\\s>/])`, 'i'));
  if (!m) return null;
  return m.slice(2).find((v) => v !== undefined) ?? '';
};
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (html) => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Flatten a JSON-LD document into a list of typed nodes (graph, nested, arrays).
function nodes(json) {
  const out = [];
  const visit = (v, parent) => {
    if (Array.isArray(v)) return v.forEach((x) => visit(x, parent));
    if (!v || typeof v !== 'object') return;
    if (v['@type']) out.push({ node: v, parent });
    for (const [k, x] of Object.entries(v)) if (k !== '@context') visit(x, v);
  };
  visit(json, null);
  return out;
}
const typesOf = (n) => (Array.isArray(n['@type']) ? n['@type'] : [n['@type']]).filter(Boolean);
const hasTz = (d) => typeof d === 'string' && /T\d\d:\d\d(:\d\d(\.\d+)?)?(Z|[+-]\d\d:?\d\d)$/.test(d);

const files = await walk(dir);
if (files.length === 0) { console.error(`no .html files under ${dir}`); process.exit(2); }
const titles = new Map();
const descriptions = new Map();
const pageUrls = new Set();
let siteOrigin = siteArg ? new URL(siteArg).origin : undefined;
let ownIds = new Set();
let homepageHasWebSite = false;
let anyIndexable = false;

for (const f of files) {
  const html = await readFile(f, 'utf8');
  const rel = '/' + relative(dir, f).replace(/\\/g, '/');
  const page = rel.replace(/index\.html$/, '');
  if (/http-equiv=["']?refresh/i.test(html)) continue;
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? '';

  // Robots meta: what the page asks for.
  const robotsTags = [...head.matchAll(/<meta\b[^>]*\bname\s*=\s*["']?(robots|googlebot)["']?[^>]*>/gi)].map((m) => attr(m[0], 'content') ?? '');
  const robots = robotsTags.join(',').toLowerCase();
  const noindex = /\bnoindex\b|\bnone\b/.test(robots);
  if (!noindex) anyIndexable = true;
  if (/\bnofollow\b/.test(robots) && !noindex) add('WARN', page, 'robots-nofollow', 'nofollow on an indexable page stops Google following its links; rarely intended.', 'robotsMeta');
  if (/\bnoarchive\b|\bnocache\b|\bnositelinkssearchbox\b/.test(robots)) add('INFO', page, 'robots-ignored', 'noarchive/nocache/nositelinkssearchbox are ignored by Google now.', 'robotsMeta');
  if (/<meta\b[^>]*\bname\s*=\s*["']?keywords/i.test(head)) add('INFO', page, 'meta-keywords', 'Google does not use the keywords meta tag.', 'essentials');

  // Title link.
  const title = decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim();
  if (!title) add('FAIL', page, 'title-missing', 'No <title>. Google builds the title link from it first.', 'title');
  else {
    if (!noindex) titles.set(title, [...(titles.get(title) ?? []), page]);
    if (title.length < 15) add('WARN', page, 'title-short', `Title "${title}" is too short to describe the page; half-empty titles get rewritten.`, 'title');
    if (title.length > 70) add('INFO', page, 'title-long', `Title is ${title.length} characters; Google truncates to the device width.`, 'title');
    const words = title.toLowerCase().match(/[a-z0-9₹]+/g) ?? [];
    const repeated = [...new Set(words.filter((w) => w.length > 3 && words.filter((x) => x === w).length >= 3))];
    if (repeated.length) add('WARN', page, 'title-stuffing', `Word repeated three or more times in the title: ${repeated.join(', ')}.`, 'title');
  }
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1]));
  if (h1s.length === 0) add('WARN', page, 'h1-missing', 'No <h1>. Google wants one clear main title; without it, it picks from other prominent text.', 'title');
  if (h1s.length > 1) add('WARN', page, 'h1-multiple', `${h1s.length} <h1> elements; several equally prominent headings make the main title unclear.`, 'title');

  // Snippet.
  const desc = decode(attr(head.match(/<meta\b[^>]*\bname\s*=\s*["']?description["']?[^>]*>/i)?.[0] ?? '', 'content') ?? '');
  if (!desc && !noindex) add('WARN', page, 'description-missing', 'No meta description; Google then writes the snippet from the page text alone.', 'snippet');
  if (desc && !noindex) descriptions.set(desc, [...(descriptions.get(desc) ?? []), page]);
  if (desc && desc.length < 50) add('WARN', page, 'description-short', `Meta description is ${desc.length} characters; too short to summarise the page.`, 'snippet');

  // Canonical.
  const canonTags = [...head.matchAll(/<link\b[^>]*\brel\s*=\s*["']?canonical["']?[^>]*>/gi)].map((m) => attr(m[0], 'href'));
  if (!noindex) {
    if (canonTags.length === 0) add('WARN', page, 'canonical-missing', 'No rel=canonical. A self-referencing canonical is the recommended way to state the preferred URL.', 'canonical');
    if (canonTags.length > 1) add('FAIL', page, 'canonical-multiple', `${canonTags.length} canonical tags; Google ignores conflicting ones.`, 'canonical');
    for (const c of canonTags) {
      if (!c) continue;
      if (!/^https?:\/\//.test(c)) add('FAIL', page, 'canonical-relative', `Canonical "${c}" is not an absolute URL.`, 'canonical');
      else {
        const u = new URL(c);
        siteOrigin ??= u.origin;
        if (u.hash) add('FAIL', page, 'canonical-fragment', 'Canonical URL contains a fragment; Google ignores it.', 'canonical');
        if (u.protocol !== 'https:') add('WARN', page, 'canonical-http', 'Canonical is http; Google prefers https.', 'canonical');
        if (u.origin === siteOrigin && u.pathname !== page && u.pathname !== page.replace(/\/$/, '') && u.pathname !== page + 'index.html') add('INFO', page, 'canonical-elsewhere', `Canonical points to ${u.pathname}; fine if this page is a deliberate duplicate.`, 'canonical');
        pageUrls.add(u.href);
      }
    }
    // Canonical in body is ignored.
    const bodyCanon = html.replace(head, '').match(/<link\b[^>]*\brel\s*=\s*["']?canonical/i);
    if (bodyCanon) add('FAIL', page, 'canonical-in-body', 'rel=canonical outside <head> is ignored.', 'canonical');
  }
  if (noindex && canonTags.length) add('INFO', page, 'noindex-with-canonical', 'noindex and canonical together send mixed signals; drop the canonical on noindex pages.', 'canonical');

  // Viewport (mobile-first indexing).
  if (!/<meta\b[^>]*\bname\s*=\s*["']?viewport/i.test(head)) add('WARN', page, 'viewport-missing', 'No viewport meta; the page is indexed mobile-first.', 'mobile');

  // Element checks run on the markup without <script> and <style>, whose text can look like tags.
  const markup = html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, '');

  // Images.
  for (const m of markup.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/\ssrc\s*=/i.test(tag)) add('FAIL', page, 'img-no-src', 'An <img> without src: Google only indexes images referenced by src (srcset alone, or CSS, is not enough).', 'images');
    if (attr(tag, 'alt') === null) add('WARN', page, 'img-no-alt', `<img> without alt (${(attr(tag, 'src') ?? '').slice(0, 60)}). Alt text is the most important image signal.`, 'images');
    const src = attr(tag, 'src') ?? '';
    if (/^data:/.test(src) && src.length > 20000) add('INFO', page, 'img-data-uri', 'Large inline data: image; it adds page weight and is not indexed as an image.', 'images');
  }

  // Links.
  for (const m of markup.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const tag = m[0].match(/<a\b[^>]*>/i)[0];
    const href = attr(tag, 'href');
    if (href === null) { add('WARN', page, 'a-no-href', 'An <a> without href is not crawlable.', 'links'); continue; }
    if (/^javascript:/i.test(href)) add('WARN', page, 'a-javascript', `javascript: link "${href.slice(0, 40)}" is not crawlable.`, 'links');
    const inner = text(m[1]);
    const hasImgAlt = /<img\b[^>]*\salt\s*=\s*["'][^"']+/i.test(m[1]);
    const label = attr(tag, 'aria-label') ?? attr(tag, 'title');
    if (!inner && !hasImgAlt && !label) add('WARN', page, 'a-empty', `Empty link to ${href.slice(0, 60)}: no anchor text, image alt or label.`, 'links');
    if (/^(click here|here|read more|more|learn more|link)$/i.test(inner)) add('INFO', page, 'a-generic', `Generic anchor text "${inner}" for ${href.slice(0, 60)}.`, 'links');
  }
  for (const m of markup.matchAll(/<(span|div|button)\b[^>]*\bhref\s*=/gi)) add('WARN', page, 'href-on-non-anchor', `href on <${m[1]}> is not a link Google follows.`, 'links');

  // Favicon (homepage only).
  if (page === '/' ) {
    const icons = [...head.matchAll(/<link\b[^>]*\brel\s*=\s*["']?(shortcut icon|icon|apple-touch-icon(-precomposed)?)["']?[^>]*>/gi)];
    if (icons.length === 0) add('WARN', page, 'favicon-missing', 'No favicon link on the homepage.', 'favicon');
    const sizes = icons.map((i) => attr(i[0], 'sizes')).filter(Boolean);
    if (icons.length && sizes.length && !sizes.some((s) => (parseInt(s, 10) || 0) >= 48)) add('WARN', page, 'favicon-small', `Favicon sizes ${sizes.join(', ')}: Google recommends at least 48x48 (square).`, 'favicon');
  }

  // Structured data.
  const blocks = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const pageText = text(html).toLowerCase();
  for (const b of blocks) {
    let json;
    try { json = JSON.parse(b[1]); } catch (e) { add('FAIL', page, 'jsonld-invalid', `JSON-LD does not parse: ${e.message.slice(0, 80)}`, 'sdPolicies'); continue; }
    const all = nodes(json);
    for (const { node, parent } of all) {
      const types = typesOf(node);
      for (const t of types) {
        if (RETIRED_TYPES[t]) add('INFO', page, 'sd-retired', `${t} markup: ${RETIRED_TYPES[t]}. Harmless, but it earns no Google feature.`, 'updates');
        if (SELF_TYPES.includes(t) && node['@id']) ownIds.add(node['@id']);
      }
      if (types.includes('WebSite') && page === '/') {
        homepageHasWebSite = true;
        if (!node.name || !node.url) add('WARN', page, 'website-name', 'WebSite node needs name and url for Google to use it for the site name.', 'siteName');
      }
      if (types.includes('BreadcrumbList')) {
        const items = node.itemListElement ?? [];
        if (items.length < 2) add('FAIL', page, 'breadcrumb-short', 'BreadcrumbList needs at least two ListItems.', 'breadcrumb');
        items.forEach((it, i) => {
          if (it.position !== i + 1) add('WARN', page, 'breadcrumb-position', `Breadcrumb position ${it.position} at index ${i}; positions should run 1..n.`, 'breadcrumb');
          if (!it.name && !(it.item && typeof it.item === 'object' && it.item.name)) add('FAIL', page, 'breadcrumb-name', 'Breadcrumb ListItem without a name.', 'breadcrumb');
          if (i < items.length - 1 && !it.item) add('FAIL', page, 'breadcrumb-item', 'Breadcrumb ListItem without item URL (only the last one may omit it).', 'breadcrumb');
        });
      }
      if (types.some((t) => ['Article', 'NewsArticle', 'BlogPosting'].includes(t))) {
        for (const k of ['datePublished', 'dateModified']) if (node[k] && !hasTz(node[k])) add('WARN', page, 'article-date-tz', `${k} "${node[k]}" has no timezone; Google assumes Googlebot's.`, 'article');
        if (!node.image) add('WARN', page, 'article-image', 'Article without image; Google recommends 16x9, 4x3 and 1x1 images.', 'article');
        if (!node.author) add('WARN', page, 'article-author', 'Article without author; Google recommends author.name and author.url.', 'article');
        if (node.author && typeof node.author === 'object' && !Array.isArray(node.author) && !node.author['@id'] && !node.author.name) add('WARN', page, 'article-author-name', 'Article author has no name.', 'article');
        if (typeof node.headline === 'string' && node.headline.length > 110) add('INFO', page, 'article-headline', `Headline is ${node.headline.length} characters; long headlines truncate.`, 'article');
      }
      if (types.some((t) => SELF_TYPES.includes(t)) || types.some((t) => /Business|Store|Service|Agency|Shop|Restaurant|Hotel|Clinic|Salon|Dealer/.test(t))) {
        if (node.logo && typeof node.logo === 'string' && !/^https?:\/\//.test(node.logo)) add('WARN', page, 'org-logo-url', 'Organization logo should be an absolute, crawlable URL (min 112x112).', 'organization');
        if (node.geo && (String(node.geo.latitude ?? '').split('.')[1] ?? '').length < 5) add('WARN', page, 'localbusiness-geo', `geo coordinates "${node.geo.latitude}, ${node.geo.longitude}" have fewer than 5 decimal places.`, 'localBusiness');
        if (typeof node.priceRange === 'string' && node.priceRange.length >= 100) add('FAIL', page, 'localbusiness-pricerange', 'priceRange of 100+ characters is not displayed.', 'localBusiness');
        if (node.aggregateRating || node.review) add('FAIL', page, 'self-serving-review', `${types.join('/')} carries aggregateRating/review: review markup on LocalBusiness/Organization is only for sites that review other businesses (self-serving reviews are ineligible and a manual-action risk).`, 'review');
      }
      if (types.includes('Review') || types.includes('AggregateRating')) {
        const reviewed = node.itemReviewed;
        const ref = reviewed && typeof reviewed === 'object' ? reviewed['@id'] : undefined;
        const reviewedTypes = reviewed && typeof reviewed === 'object' ? typesOf(reviewed) : [];
        const parentTypes = parent ? typesOf(parent) : [];
        if ((ref && ownIds.has(ref)) || reviewedTypes.some((t) => SELF_TYPES.includes(t)) || parentTypes.some((t) => SELF_TYPES.includes(t))) {
          add('FAIL', page, 'self-serving-review', `${types[0]} about the site's own business: ineligible for review snippets and a manual-action risk.`, 'review');
        }
        if (types.includes('Review')) {
          if (!node.author) add('FAIL', page, 'review-author', 'Review without author (Person or Organization with a name).', 'review');
          const name = node.author && typeof node.author === 'object' ? node.author.name : node.author;
          if (typeof name === 'string' && name.length >= 100) add('FAIL', page, 'review-author-long', 'Review author name of 100+ characters makes the page ineligible.', 'review');
          if (!node.reviewRating && !(node.author && node.datePublished)) add('FAIL', page, 'review-rating', 'Review needs reviewRating, or both author and datePublished.', 'review');
        }
        if (types.includes('AggregateRating')) {
          if (node.ratingValue === undefined) add('FAIL', page, 'aggregate-value', 'AggregateRating without ratingValue.', 'review');
          if (node.ratingCount === undefined && node.reviewCount === undefined) add('FAIL', page, 'aggregate-count', 'AggregateRating needs ratingCount or reviewCount.', 'review');
          if (typeof node.ratingValue === 'string' && node.ratingValue.includes(',')) add('FAIL', page, 'aggregate-decimal', 'ratingValue must use a dot, not a comma.', 'review');
        }
      }
      // Content parity: a marked-up answer should be on the page.
      if (types.includes('Question') && node.acceptedAnswer?.text) {
        const probe = text(String(node.acceptedAnswer.text)).toLowerCase().slice(0, 40);
        if (probe.length > 10 && !pageText.includes(probe)) add('WARN', page, 'sd-not-visible', `FAQ answer starting "${probe}" is not visible in the page text; markup must describe visible content.`, 'sdPolicies');
      }
      if (types.includes('ImageObject')) {
        const u = node.contentUrl ?? node.url;
        if (typeof u === 'string' && !/^https?:\/\//.test(u)) add('WARN', page, 'image-url', `ImageObject URL "${u}" should be absolute and crawlable.`, 'images');
      }
    }
  }
  if (!noindex && blocks.length === 0) add('INFO', page, 'sd-none', 'No structured data on an indexable page.', 'sdPolicies');

  // Interstitials: a quick heuristic for full-screen overlays shown on load.
  if (/class="[^"]*\b(modal|popup|interstitial|overlay)\b[^"]*"[^>]*\bopen\b|<dialog[^>]*\bopen\b/i.test(markup)) add('WARN', page, 'interstitial', 'A dialog/overlay appears open on load; intrusive interstitials hurt page experience.', 'interstitials');
}

// Cross-page checks.
for (const [t, pages] of titles) if (pages.length > 1) add('WARN', pages.join(', '), 'title-duplicate', `Same title on ${pages.length} pages: "${t}". Each page needs distinct title text.`, 'title');
for (const [d, pages] of descriptions) if (pages.length > 1) add('WARN', pages.join(', '), 'description-duplicate', `Same meta description on ${pages.length} pages: "${d.slice(0, 60)}…".`, 'snippet');
if (!homepageHasWebSite && files.some((f) => /(^|\/)index\.html$/.test(relative(dir, f)) && relative(dir, f) === 'index.html')) add('WARN', '/', 'website-missing', 'No WebSite structured data on the homepage; it is the strongest site-name signal.', 'siteName');

// Sitemap(s).
const smFiles = (await readdir(dir)).filter((n) => /^sitemap.*\.xml$/.test(n));
if (smFiles.length === 0) add('INFO', '/', 'sitemap-missing', 'No sitemap*.xml at the root. Optional, but it lets Google find pages and read lastmod.', 'sitemap');
for (const n of smFiles) {
  const xml = await readFile(join(dir, n), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1].trim()));
  if (/<priority>|<changefreq>/.test(xml)) add('INFO', '/' + n, 'sitemap-ignored-tags', 'priority and changefreq are ignored by Google.', 'sitemap');
  if (locs.length > 50000) add('FAIL', '/' + n, 'sitemap-size', 'More than 50,000 URLs in one sitemap.', 'sitemap');
  if (!/<urlset|<sitemapindex/.test(xml)) add('FAIL', '/' + n, 'sitemap-format', 'Not a urlset or sitemapindex.', 'sitemap');
  let hasLastmod = false;
  for (const m of xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) {
    hasLastmod = true;
    if (Number.isNaN(Date.parse(m[1]))) add('FAIL', '/' + n, 'sitemap-lastmod', `Invalid lastmod "${m[1]}" (use W3C datetime).`, 'sitemap');
  }
  if (/<urlset/.test(xml) && !hasLastmod) add('INFO', '/' + n, 'sitemap-no-lastmod', 'No lastmod on any URL; Google uses it when it is accurate.', 'sitemap');
  for (const l of locs) {
    if (!/^https?:\/\//.test(l)) add('FAIL', '/' + n, 'sitemap-relative', `Sitemap URL "${l}" is not absolute.`, 'sitemap');
    else if (/^http:/.test(l)) add('WARN', '/' + n, 'sitemap-http', `Sitemap lists an http URL: ${l}`, 'canonical');
    if (/<urlset/.test(xml) && pageUrls.size && anyIndexable && !pageUrls.has(l) && !/\.(xml|txt|pdf)$/.test(l)) add('WARN', '/' + n, 'sitemap-noncanonical', `${l} is in the sitemap but no indexable page declares it as canonical (noindex, missing, or a different canonical).`, 'sitemap');
  }
}

// robots.txt.
try {
  const rt = await readFile(join(dir, 'robots.txt'), 'utf8');
  if (/^\uFEFF/.test(rt)) add('WARN', '/robots.txt', 'robots-bom', 'robots.txt starts with a byte-order mark.', 'robotsTxt');
  if (!/^sitemap:\s*https?:\/\//im.test(rt)) add('INFO', '/robots.txt', 'robots-sitemap', 'No absolute Sitemap: line in robots.txt.', 'robotsTxt');
  const groups = rt.split(/\n(?=user-agent:)/i);
  for (const g of groups) {
    const agents = [...g.matchAll(/^user-agent:\s*(.+)$/gim)].map((m) => m[1].trim());
    if (/^disallow:\s*\/\s*$/im.test(g) && agents.some((a) => a === '*' || /googlebot/i.test(a))) add(anyIndexable ? 'FAIL' : 'INFO', '/robots.txt', 'robots-blocks-all', `"Disallow: /" for ${agents.join(', ')}: Google cannot crawl, and noindex tags on blocked pages are never seen.`, 'technical');
  }
  for (const m of rt.matchAll(/^(allow|disallow):\s*([^\s#]+)/gim)) if (!m[2].startsWith('/') && m[2] !== '') add('WARN', '/robots.txt', 'robots-path', `Rule path "${m[2]}" should start with /.`, 'robotsTxt');
} catch { add('INFO', '/robots.txt', 'robots-missing', 'No robots.txt in the build output (a missing file means everything may be crawled).', 'robotsTxt'); }

// 404 page.
const notFound = files.find((f) => /(^|\/)404\.html$/.test(relative(dir, f)));
if (notFound) {
  const html = await readFile(notFound, 'utf8');
  if (!/<meta\b[^>]*\bname\s*=\s*["']?robots["']?[^>]*\bnoindex/i.test(html)) add('WARN', '/404.html', '404-indexable', 'The 404 page has no noindex; make sure the host also serves it with a real 404 status, or it becomes a soft 404.', 'technical');
}

// Report.
const order = { FAIL: 0, WARN: 1, INFO: 2 };
findings.sort((a, b) => order[a.level] - order[b.level] || a.check.localeCompare(b.check) || a.page.localeCompare(b.page));
if (asJson) { console.log(JSON.stringify({ pages: files.length, findings }, null, 2)); }
else {
  // Site-wide markup repeats the same finding on every page, so the report
  // groups by check, then by distinct message, and lists the pages under it.
  const counts = { FAIL: 0, WARN: 0, INFO: 0 };
  const grouped = new Map();
  for (const f of findings) {
    counts[f.level]++;
    const k = `${f.level} ${f.check}`;
    const g = grouped.get(k) ?? { doc: f.doc, messages: new Map() };
    g.messages.set(f.message, [...(g.messages.get(f.message) ?? []), f.page]);
    grouped.set(k, g);
  }
  console.log(`Google Search Central audit: ${files.length} pages in ${dir}\n`);
  for (const [k, g] of grouped) {
    const total = [...g.messages.values()].reduce((n, p) => n + p.length, 0);
    console.log(`${k}  (${total} on ${new Set([...g.messages.values()].flat()).size} pages)  ${g.doc}`);
    for (const [msg, pages] of [...g.messages].slice(0, 6)) {
      const where = pages.length > 3 ? `${pages.slice(0, 3).join(', ')} … +${pages.length - 3}` : pages.join(', ');
      console.log(`   ${msg}\n      ${where}`);
    }
    if (g.messages.size > 6) console.log(`   … and ${g.messages.size - 6} more distinct messages`);
    console.log('');
  }
  console.log(`${counts.FAIL} fail, ${counts.WARN} warn, ${counts.INFO} info (distinct: ${grouped.size} checks)`);
}
process.exit(findings.some((f) => f.level === 'FAIL') ? 1 : 0);
