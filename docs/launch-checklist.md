# Launch checklist

The build is complete. The items below need the owner, because they are facts
about the business that the site must not guess. Find every remaining
placeholder with:

```sh
grep -rn "TODO(pre-launch)" src/
```

## 1. Business details (`src/data/site.ts`)
- [ ] Main phone number, `tel:` link and WhatsApp number (one number everywhere)
- [ ] Booking email address
- [ ] Office street address and map coordinates (must match Google Business Profile exactly)
- [ ] Google Business Profile link (`mapsUrl`)
- [ ] Registered business name and year founded
- [ ] GSTIN (shows in the footer and on About once set)
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
The rating badge, the reviews slider and the AggregateRating/Review schema
now use the listing's real figures: 4.9 from 129 reviews and its ten most
relevant reviews, copied verbatim from the Google Business Profile on
20 Oct 2026 into `src/data/google-reviews.json` (listing: Bagdogra Airport
Taxi, behind Ashok Nagar Club; place ID `ChIJgebDZQJH5DkR9JC1zX1LUU0`).
The "x months ago" labels are as of that date, so set up the feed below and
they refresh with every build. Note the live site shows hours as Mon–Sat
08:00–22:00 while `BUSINESS.hours` says open 24 hours: pick one and keep it
the same on the site and the Google listing.
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
- [ ] Make sure the host serves `404.html` with a real 404 status
- [ ] Submit `https://bagdograairporttaxi.com/sitemap-index.xml` in Google Search Console and Bing Webmaster Tools
- [ ] Request removal of the old `/404.php` URL in Search Console
- [ ] Test with Google's Rich Results Test on the homepage, a route page and a package page
