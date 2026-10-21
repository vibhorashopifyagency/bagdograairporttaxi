// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { GUIDES } from './src/data/guides';
import { SITE } from './src/data/site';

// Sitemap <lastmod>. Google only trusts it when it is consistently accurate,
// so a page gets one only where the site records a real change date: the
// homepage, fares and packages (SITE.contentUpdated), each guide (its own
// `updated`) and the destination guides (SITE.destinationsUpdated). Other
// pages are listed without a date rather than with a made-up one.
const lastmod = (pathname) => {
  if (pathname === '/') return SITE.contentUpdated;
  const guide = pathname.match(/^\/guides\/([^/]+)\/$/);
  if (guide) return GUIDES.find((g) => g.slug === guide[1])?.updated;
  if (/^\/(taxi|tour-packages|book)\//.test(pathname)) return SITE.contentUpdated;
  if (/^\/destinations\/[^/]+\/$/.test(pathname)) return SITE.destinationsUpdated;
  return undefined;
};

// Same setup as vibhora.com: every page prerenders to static HTML, CSS is
// inlined so nothing blocks first paint, and the only font is a self-hosted,
// preloaded Inter. No adapter, so the output deploys to any static host
// (Vercel, Netlify, Cloudflare Pages or the current cPanel/Apache server).
export default defineConfig({
  site: 'https://bagdograairporttaxi.com',
  trailingSlash: 'always',
  build: {
    inlineStylesheets: 'always',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  // Old .php URLs are 301-redirected at the host: public/_redirects
  // (Netlify, Cloudflare), public/.htaccess (Apache/cPanel) and vercel.json.
  integrations: [
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return !pathname.startsWith('/404') && !pathname.startsWith('/book/thanks');
      },
      serialize: (item) => {
        const date = lastmod(new URL(item.url).pathname);
        if (date) item.lastmod = date;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
