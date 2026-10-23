/**
 * The website's fixed pages, and the files at its root a link may open.
 * Publish (src/server/content.ts) checks every link typed in the dashboard
 * against this list plus the route, package, destination and guide pages,
 * because one broken link stops the build and nothing goes live.
 * scripts/verify-build.mjs fails if this list and the built pages differ,
 * so a page added or removed in src/pages must be added or removed here.
 */
export const STATIC_PAGES: readonly string[] = [
  '/',
  '/about/',
  '/book/',
  '/cancellation-refund-policy/',
  '/contact/',
  '/destinations/',
  '/faq/',
  '/gallery/',
  '/guides/',
  '/photo-credits/',
  '/privacy/',
  '/taxi/',
  '/terms/',
  '/tour-packages/',
];

export const STATIC_FILES: readonly string[] = ['/sitemap-index.xml', '/llms.txt', '/llms-full.txt', '/feed.xml'];

/** The sections whose pages come from the dashboard's lists: /taxi/<route>/ and so on. */
export const LIST_SECTIONS = { taxi: 'route', 'tour-packages': 'package', destinations: 'destination', guides: 'guide' } as const;
