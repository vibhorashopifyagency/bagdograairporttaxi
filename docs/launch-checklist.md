# Launch checklist

The build is complete and aligned with Google Search Central's documentation
(21 Oct 2026; `npm run audit:google` reports no failures). The items below
need the owner, because they are facts about the business that the site must
not guess. Find every remaining placeholder in the code with:

```sh
grep -rn "TODO(pre-launch)" src/
```

## Status on 21 Oct 2026

Done: office coordinates (26.703019, 88.337305); hours decided as Open 24
hours; Google reviews copied from the Business Profile (API key pending);
all Google-docs fixes (no self-serving review markup, Article dates and
images, image licence metadata, sitemap lastmod, HSTS); llms.txt and
robots.txt rewritten; 404 page configured for every supported host.

Pending from the owner (details in the sections below): the main phone,
email and WhatsApp confirmation; registered legal name and founding year;
GSTIN; profile URLs for `sameAs`; registrations; the four claims in section
4; fares and package prices; payment page URL; own photos; Places API key;
and the Business Profile hours changed to Open 24 hours.

## 1. Business details (`src/data/site.ts`)
- [ ] Main phone number, `tel:` link and WhatsApp number (one number everywhere)
- [ ] Booking email address
- [x] Office map coordinates: 26.703019, 88.337305 (set 21 Oct 2026)
- [ ] Office street address must match the Google Business Profile exactly
- [ ] Change the Google Business Profile hours to **Open 24 hours** so they match the site (the listing showed Mon–Sat 08:00–22:00 on 20 Oct 2026)
- [ ] Google Business Profile link (`mapsUrl`)
- [ ] Registered business name and year founded
- [ ] GSTIN (shows in the footer and on About once set, and goes into the structured data as `taxID`)
- [ ] Profile URLs for `sameAs`: Google Business Profile, TripAdvisor, Facebook, Instagram, Justdial

## 2. Policies (`POLICY` in `src/data/site.ts`)
The site shows these numbers next to every Book button. Confirm or change:
- [ ] Advance: 20%
- [ ] Free waiting after landing: 60 minutes
- [ ] Free cancellation: up to 24 hours before pickup; 50% refund inside 24 hours
- [ ] Refund time: 5 working days
- [ ] Night charge: ₹300 from 22:00 to 06:00
- [ ] Tour-package cancellation tiers on `/cancellation-refund-policy/`

## 3. Fares and packages
- [ ] Every fare in `src/data/routes.ts` (set inside the market ranges from the competitor research)
- [ ] Every package price, hotel category and inclusion in `src/data/packages.ts`
- [ ] Update `faresUpdated` / `faresUpdatedLabel` in `site.ts` when fares change

## 4. Claims to confirm are true
- [ ] West Bengal taxis go into Gangtok with no change of car
- [ ] Drivers are police-verified
- [ ] "We reply within 15 minutes, day or night" (`/taxi/` page)
- [ ] ID copies for permits are deleted within 30 days (privacy page)

## 5. Payment
- [ ] Create a Razorpay / Cashfree / PhonePe payment page and put its URL in
      `PAYMENT.advanceUrl`. Until then the "Pay advance securely" button is
      hidden and the booking page says the link is sent on WhatsApp.

## 6. Photos
The site ships with licensed Wikimedia Commons photographs of every
destination and car type, fetched and resized by `scripts/fetch-photos.mjs`
and credited on `/photo-credits/` (CC BY and CC BY-SA require that page to
stay linked from the footer).
- [ ] Replace the stock car photos with photos of the actual fleet: drop the
      files into `public/img/` as `car-sedan-{400,800,1600}.webp` (same for
      `car-suv`, `car-innova`, `car-traveller`) and update the entries in
      `src/data/photos.json` (set `artist` to the business name and `license`
      to `All rights reserved`)
- [ ] Add photos of the office and drivers on the About page the same way
- [ ] Run `npm run og` after changing the hero photo so the share card matches

## 7. Google reviews (live data in place, API key makes it automatic)
The rating badge and the reviews slider now use the listing's real figures:
4.9 from 129 reviews and its ten most relevant reviews, copied verbatim from
the Google Business Profile on 20 Oct 2026 into
`src/data/google-reviews.json` (listing: Bagdogra Airport Taxi, behind Ashok
Nagar Club; place ID `ChIJgebDZQJH5DkR9JC1zX1LUU0`). They are shown as HTML
only: Google's review-snippet guidelines do not allow a business to mark up
its own reviews or ratings copied from Google, so there is no
AggregateRating or Review schema and the build fails if any is added.
The "x months ago" labels are as of that date, so set up the feed below and
they refresh with every build. Hours: the site says Open 24 hours (decided
21 Oct 2026); update the Business Profile to match (section 1).
- [ ] In Google Cloud, create a Maps Platform API key with **Places API (New)**
      enabled (restrict it to that API)
- [ ] Set `GOOGLE_PLACES_API_KEY` in the host's build environment. The place
      ID is already pinned in `scripts/fetch-google-reviews.mjs`; set
      `GOOGLE_PLACE_ID` only to override it
- [ ] Run `GOOGLE_PLACES_API_KEY=... npm run reviews` once and check that the
      rating and count it writes match the listing
- [ ] Rebuild daily (a scheduled deploy hook) so the rating and the latest
      reviews stay current. Google returns the five most relevant reviews.
- [ ] Add registrations you hold (tourism department, IATO/TAAI) to
      `BUSINESS.registrations` in `src/data/site.ts`

## 7a. Brand
- [ ] The logo is the Jai Jawan Travels badge with its olive ring recoloured
      to the site's ink and lime (`scripts/brand/logo-master*.png`; run
      `npm run og` after replacing it). Confirm `legalName` ("Jai Jawan
      Travels") and the About page line about the owner being an Army veteran,
      both taken from the current site and the logo
- [ ] Replace or add to the gallery (`src/data/gallery.ts`) with the
      business's own photos of cars, drivers and trips

## 8. Go live
- [ ] Set `PRE_LAUNCH = false` in `src/data/site.ts`. The build fails if
      placeholder contact details are still present.
- [ ] Deploy `dist/` (Vercel, Netlify, Cloudflare Pages or the current cPanel host)
- [ ] Confirm the host serves `404.html` with a real 404 status. It is
      configured for all four hosts: Vercel (static, or through the Astro
      adapter the admin area uses), Netlify and Cloudflare Pages serve the
      prerendered `404.html` with a 404 status automatically, and
      `public/.htaccess` sets `ErrorDocument 404 /404.html` for Apache/cPanel.
      Prove it after deploy with `npm run check:live` (below)
- [ ] Run `npm run check:live` (`node scripts/check-live.mjs https://bagdograairporttaxi.com`):
      it checks the 404 status, the http and www redirects, HSTS, robots.txt,
      the sitemap, that the homepage is indexable, that llms.txt is live, and
      that every old-site page and image redirects permanently to its new
      equivalent (and the old `/404.php` returns a real 404)
- [ ] Before launch, in the existing Search Console property, look at
      Performance (Web and Search type: Image) and the Pages report for any
      old URL with impressions that `vercel.json` does not redirect yet, and
      add it. The redirects there cover the 11 pages in the old sitemap, 5
      pages its menu linked to, and 61 old image URLs (collected 21 Oct 2026)
- [ ] Keep the old-site redirects in `vercel.json` permanently (Google: "as
      long as possible, generally at least 1 year"). The domain is not
      changing, so do not use Search Console's Change of Address tool
- [ ] A few weeks after launch, the Pages report should list the old `.php`
      URLs as "Page with redirect", not "Not found (404)" or "Soft 404"
- [ ] Submit `https://bagdograairporttaxi.com/sitemap-index.xml` in Google Search Console and Bing Webmaster Tools
- [ ] Request removal of the old `/404.php` URL in Search Console
- [ ] Run `npm run audit:google` on the final build and clear every FAIL
- [ ] Test with Google's Rich Results Test on the homepage, a route page, a package page and a guide page (expect Breadcrumb, Article, LocalBusiness/Organization and image-licence items; no FAQ, which Google retired)
- [ ] In Search Console, use URL Inspection on the same pages to confirm they are crawlable and the structured data is read
