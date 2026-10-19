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
- [ ] Real photos of the fleet, drivers and office (About page and car cards)
- [ ] Destination photos to replace the illustrated tiles (WebP, ~1200 px)

## 7. Reviews
- [ ] Once there are real Google reviews, add a reviews section and
      `AggregateRating` schema. Do not add ratings that are not on the page.

## 8. Go live
- [ ] Set `PRE_LAUNCH = false` in `src/data/site.ts`. The build fails if
      placeholder contact details are still present.
- [ ] Deploy `dist/` (Vercel, Netlify, Cloudflare Pages or the current cPanel host)
- [ ] Make sure the host serves `404.html` with a real 404 status
- [ ] Submit `https://bagdograairporttaxi.com/sitemap-index.xml` in Google Search Console and Bing Webmaster Tools
- [ ] Request removal of the old `/404.php` URL in Search Console
- [ ] Test with Google's Rich Results Test on the homepage, a route page and a package page
