// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { GUIDES } from './src/data/guides';
import { SITE } from './src/data/site';

// Sitemap <lastmod>. Google only trusts it when it is consistently accurate,
// so a page gets one only where the site records a real change date: the
// homepage, fares and packages (SITE.contentUpdated), each guide (its own
// `updated`) and the destination guides (SITE.destinationsUpdated). Other
// pages are listed without a date rather than with a made-up one.
/** @param {string} pathname */
const lastmod = (pathname) => {
  if (pathname === '/') return SITE.contentUpdated;
  const guide = pathname.match(/^\/guides\/([^/]+)\/$/);
  if (guide) return GUIDES.find((g) => g.slug === guide[1])?.updated;
  if (/^\/(taxi|tour-packages|book)\//.test(pathname)) return SITE.contentUpdated;
  if (/^\/destinations\/[^/]+\/$/.test(pathname)) return SITE.destinationsUpdated;
  return undefined;
};

// Every public page still prerenders to static HTML, CSS is inlined so
// nothing blocks first paint, and the only font is a self-hosted, preloaded
// Inter. The Vercel adapter adds server routes for the admin area (/admin/)
// and the API (/api/): only files with `export const prerender = false` run
// on the server, so the public site never waits on the database.
export default defineConfig({
  site: 'https://bagdograairporttaxi.com',
  trailingSlash: 'always',
  adapter: vercel({ maxDuration: 15 }),
  build: {
    inlineStylesheets: 'always',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  // Old-site pages and images are 301-redirected at the host: vercel.json is
  // the master copy; public/_redirects (Netlify, Cloudflare) and
  // public/.htaccess (Apache/cPanel) mirror it, checked by verify-build.mjs.
  integrations: [
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return (
          !pathname.startsWith('/404') &&
          !pathname.startsWith('/book/thanks') &&
          !pathname.startsWith('/admin') &&
          !pathname.startsWith('/api') &&
          !pathname.startsWith('/trip')
        );
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
