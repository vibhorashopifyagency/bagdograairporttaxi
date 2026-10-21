// Launch-day checks against the deployed site. Everything here is a hosting
// behaviour that the build cannot prove on its own: status codes, redirects
// and headers. Run after every deploy:
//
//   node scripts/check-live.mjs https://bagdograairporttaxi.com
//
// Exits 1 if anything Google documents as a requirement fails.
import { readFile } from 'node:fs/promises';

const base = process.argv[2];
if (!base) { console.error('usage: node scripts/check-live.mjs https://example.com'); process.exit(2); }
const origin = new URL(base).origin;
const host = new URL(origin).hostname;
const results = [];
const check = (ok, name, detail) => { results.push({ ok, name, detail }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`); };
const get = (url, opts = {}) => fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'check-live/1 (+site owner)' }, ...opts });

try {
  // 1. A missing page returns a real 404 (not a 200 "soft 404" and not a redirect home).
  const nf = await get(`${origin}/this-page-does-not-exist-${Date.now()}/`);
  check(nf.status === 404, 'missing page returns 404', `status ${nf.status}`);
  const nfBody = await nf.text();
  check(/noindex/.test(nfBody), '404 page carries noindex');

  // 2. http and www redirect permanently to the canonical https host.
  for (const [label, url] of [['http → https', `http://${host}/`], ['www → bare host', `https://www.${host}/`]]) {
    try {
      const r = await get(url);
      const loc = r.headers.get('location') ?? '';
      check([301, 308].includes(r.status) && loc.startsWith(`${origin}/`), `${label} is a permanent redirect`, `status ${r.status} → ${loc || 'none'}`);
    } catch (e) { check(false, `${label} is a permanent redirect`, e.message); }
  }

  // 3. Homepage: 200, indexable, canonical, HSTS.
  const home = await get(`${origin}/`);
  const html = await home.text();
  check(home.status === 200, 'homepage returns 200', `status ${home.status}`);
  check(!/<meta name="robots" content="noindex/.test(html), 'homepage is indexable (no noindex)');
  check(new RegExp(`<link rel="canonical" href="${origin}/"`).test(html), 'homepage has a self-referencing canonical');
  check(!!home.headers.get('strict-transport-security'), 'HSTS header present', home.headers.get('strict-transport-security') ?? 'missing');
  check(/application\/ld\+json/.test(html), 'homepage has JSON-LD');

  // 4. robots.txt open, with a sitemap line; sitemap reachable.
  const robots = await (await get(`${origin}/robots.txt`)).text();
  check(!/^Disallow:\s*\/\s*$/m.test(robots), 'robots.txt does not block the site');
  check(new RegExp(`^Sitemap:\\s*${origin}/sitemap-index\\.xml`, 'm').test(robots), 'robots.txt names the sitemap');
  const sm = await get(`${origin}/sitemap-index.xml`);
  check(sm.status === 200 && /xml/.test(sm.headers.get('content-type') ?? ''), 'sitemap-index.xml is served as XML', `status ${sm.status}, ${sm.headers.get('content-type')}`);

  // 5. llms.txt is the real file, not the pre-launch stub.
  const llms = await (await get(`${origin}/llms.txt`)).text();
  check(!/Not published yet/.test(llms) && /## Quick answers/.test(llms), 'llms.txt is the launch version');

  // 6. Every old-site page and image in vercel.json redirects permanently to
  //    its new equivalent, and that target loads. Google asks for these to
  //    stay at least a year and warns that sending many old URLs to the home
  //    page is treated as a soft 404, so the old error page must be a real 404.
  const { redirects } = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const old = redirects.filter((r) => !r.has && !/[:(*]/.test(r.source));
  const head = (url) => get(url, { method: 'HEAD' });
  const hops = await Promise.all(old.map(async ({ source, destination }) => {
    const r = await head(`${origin}${source}`);
    const loc = r.headers.get('location') ?? '';
    const ok = [301, 308].includes(r.status) && !!loc && new URL(loc, origin).href === new URL(destination, origin).href;
    return ok ? null : `${source}: ${r.status} → ${loc || 'none'}`;
  }));
  const badHops = hops.filter(Boolean);
  check(!badHops.length, `${old.length} old-site URLs redirect permanently to their new page or image`, badHops.slice(0, 5).join('; ') + (badHops.length > 5 ? `; and ${badHops.length - 5} more` : ''));
  const targets = [...new Set(old.map((r) => r.destination))];
  const loads = await Promise.all(targets.map(async (t) => [t, (await head(new URL(t, origin).href)).status]));
  const badTargets = loads.filter(([, s]) => s !== 200).map(([t, s]) => `${t}: ${s}`);
  check(!badTargets.length, `all ${targets.length} redirect targets return 200`, badTargets.join('; '));
  const gone = await head(`${origin}/404.php`);
  check(gone.status === 404, 'old /404.php returns 404, not a redirect home', `status ${gone.status}`);
  const stray = await head(`${origin}/no-such-old-page.php`);
  check([301, 308].includes(stray.status), 'any other old .php URL redirects permanently', `status ${stray.status} → ${stray.headers.get('location') ?? 'none'}`);
} catch (e) {
  check(false, 'site reachable', e.message);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
