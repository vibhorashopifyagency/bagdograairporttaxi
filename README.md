# bagdograairporttaxi.com

The redesigned site for Bagdogra Airport Taxi: fixed-fare airport taxis and tour
packages across North Bengal and Sikkim. Built with Astro 7 and Tailwind CSS 4,
fully static, with no client framework.

## Run it

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # builds to dist/, then runs scripts/verify-build.mjs
npm run preview
npm run photos    # re-fetch and resize the photographs (only after editing scripts/fetch-photos.mjs)
```

Node 22.12 or newer.

## Where things live

| What | File |
|---|---|
| Business name, phone, address, policies, `PRE_LAUNCH` switch | `src/data/site.ts` |
| Every taxi fare, route facts and route FAQs | `src/data/routes.ts` |
| Cars | `src/data/vehicles.ts` |
| Tour packages | `src/data/packages.ts` |
| Destination guides | `src/data/destinations.ts` |
| Site-wide FAQs | `src/data/faqs.ts` |
| Which photo goes with which place, package, route or guide | `src/lib/photos.ts` |
| Photo list, licences and alt text (generated), plus the 16x9 / 4x3 / 1x1 crops Google reads from Article and image markup | `scripts/fetch-photos.mjs`, `src/data/photos.json` |
| Google rating, count and reviews (real, copied 20 Oct 2026; refreshed by the API once a key is set) | `src/data/google-reviews.json` |
| Photo gallery entries and categories | `src/data/gallery.ts` |
| Brand badge masters (ink/lime recolour of the Jai Jawan Travels logo) | `scripts/brand/` |
| JSON-LD builders | `src/lib/schema.ts` |
| llms.txt / llms-full.txt content | `src/lib/llms.ts` |

Change a fare once in `routes.ts` and it updates the route page, the fare
chart, the booking form, the JSON-LD offers and llms.txt together.

## SEO, AEO and GEO built in

- JSON-LD on every page from one `@id` graph: TravelAgency/LocalBusiness,
  WebSite, WebPage (with `dateModified` and `speakable` where the page opens
  with an answer), BreadcrumbList, TaxiService with per-car Offers,
  TouristTrip with day-wise itinerary, TouristDestination, Article and FAQPage.
  Every page image is an `ImageObject` with the photographer, licence and
  source (Google's image-licence feature), in three aspect ratios. All dates
  carry the +05:30 timezone.
- No Review or AggregateRating markup, deliberately: Google's review-snippet
  rules make a business's own reviews, and ratings copied from Google,
  ineligible and a manual-action risk. The rating and reviews are shown as
  plain HTML. `scripts/verify-build.mjs` fails the build if the markup comes
  back. (Google also retired the FAQ rich result in May 2026; the FAQPage
  markup stays for Bing and answer engines.)
- Answer-first opening paragraph on every route, package and guide page, so
  answer engines can quote it. The homepage tells the trip as a six-chapter
  story (`src/components/JourneyStory.astro`) with the policies woven in.
- `robots.txt` (generated) welcomes search and AI crawlers by name.
- `/llms.txt` (also at `/.well-known/llms.txt`) and `/llms-full.txt`
  generated from the same data as the pages.
- `/feed.xml`: RSS of the travel guides, linked from every page's `<head>`,
  plus `article:modified_time` on every page that has a date.
- Sitemap (`/sitemap-index.xml`) with `lastmod` only where the site records a
  real change date (homepage, fares, packages, guides, destinations), canonical
  tags, Open Graph and Twitter cards, geo meta tags, web manifest.

### Agent skills for content work

`.claude/skills/` holds four Claude Code skills installed with
`npx skills add` (pinned in `skills-lock.json`), so content edits follow the
same playbook every time:

| Skill | Use it for |
|---|---|
| `seo-content-writer` | Writing or revising a page: keyword in title/H1/first 100 words, E-E-A-T review, internal links |
| `ai-search-optimization` | Answer Engine Optimization: question headings, answer-first paragraphs, FAQ and schema patterns, llms.txt |
| `improve-aeo-geo` | Code-level audit of the site for AI crawlers: robots, schema, headings, freshness, feeds |
| `write-seo-geo-content` | New guide pages written to be quoted by ChatGPT, Perplexity and AI Overviews, with verified sources only |
| `google-search-docs` | Google Search Central's documentation as an audit-and-fix playbook (Essentials, spam policies, structured data per type, crawling, titles, images, AI Overviews), with a changelog of 2025–26 rule changes. Written in this repo, not installed with `npx skills`. `npm run audit:google` runs its checker on `dist/` |

Homepage section order and the reasoning behind it are in the comment at the
top of `src/pages/index.astro`.
- Real 404 page with `noindex`.
- 301s from the old `.php` URLs for Apache (`public/.htaccess`),
  Netlify/Cloudflare (`public/_redirects`) and Vercel (`vercel.json`).

## Before launch

See [docs/launch-checklist.md](docs/launch-checklist.md). While `PRE_LAUNCH`
is `true`, every page is `noindex` and robots.txt blocks crawling.
