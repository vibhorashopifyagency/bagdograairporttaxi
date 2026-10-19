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
| Photo list, licences and alt text (generated) | `scripts/fetch-photos.mjs`, `src/data/photos.json` |
| Sample reviews shown until the Google feed is connected | `src/data/reviews-sample.json` |
| JSON-LD builders | `src/lib/schema.ts` |
| llms.txt / llms-full.txt content | `src/lib/llms.ts` |

Change a fare once in `routes.ts` and it updates the route page, the fare
chart, the booking form, the JSON-LD offers and llms.txt together.

## SEO, AEO and GEO built in

- JSON-LD on every page from one `@id` graph: TravelAgency/LocalBusiness,
  WebSite, BreadcrumbList, TaxiService with per-car Offers, TouristTrip with
  day-wise itinerary, TouristDestination, Article and FAQPage.
- Answer-first opening paragraph on every route, package and guide page, so
  answer engines can quote it.
- `robots.txt` (generated) welcomes search and AI crawlers by name.
- `/llms.txt` and `/llms-full.txt` generated from the same data as the pages.
- Sitemap (`/sitemap-index.xml`), canonical tags, Open Graph and Twitter cards,
  geo meta tags, web manifest.
- Real 404 page with `noindex`.
- 301s from the old `.php` URLs for Apache (`public/.htaccess`),
  Netlify/Cloudflare (`public/_redirects`) and Vercel (`vercel.json`).

## Before launch

See [docs/launch-checklist.md](docs/launch-checklist.md). While `PRE_LAUNCH`
is `true`, every page is `noindex` and robots.txt blocks crawling.
