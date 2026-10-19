// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

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
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
