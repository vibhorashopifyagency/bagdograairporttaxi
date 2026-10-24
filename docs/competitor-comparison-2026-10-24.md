# Live preview vs the biggest North Bengal competitors

> **Status note (added 24 Oct 2026, `main`).** The comparison below was run
> against branch `astro-redesign` at commit d775b99 (20 Oct), which is 33
> commits behind `main`. Several of its "fix next" items were already done on
> `main` before the check, and the rest of the code-level items were applied
> on 24 Oct:
>
> | Item | State on `main` |
> |---|---|
> | 2. Review / AggregateRating schema | Removed 21 Oct; the build fails if either is added |
> | 3. Keep the vercel.app copy out of Google | Done 24 Oct: `vercel.json` sends `X-Robots-Tag: noindex` on any `*.vercel.app` host |
> | 4. Mobile speed: 500 KB of logo PNGs | Done 24 Oct: header, footer, admin and trip page use 128 px WebPs (about 9 KB each); the 512 px PNGs stay for the schema `logo` and old-site redirects |
> | 4. Mobile speed: home DOM / HTML weight | Done 24 Oct: icons are drawn once as an SVG sprite and referenced with `<use>` (home HTML drops by about 150 KB uncompressed). See the measurements at the end of this file |
> | 5. Old URL redirects | Mapped one-to-one 21 Oct (77 URLs). The `*.php → /` catch-all stays for unknown stray URLs; every URL the old site actually published has its own target |
> | 10. Destination meta descriptions | Done 24 Oct: template shortened so every destination is under 160 characters |
> | 6. Missing route pages | Done 24 Oct: 10 new routes (Darjeeling ↔ Gangtok, Gangtok ↔ Pelling, Siliguri → Kalimpong and Mirik, Gangtok → Lachung, Bagdogra → Lachung, Lachen and Zuluk), 42 in all. North Sikkim and Silk Route transfers are priced as two legs (your car to Gangtok or Rongli, then the Sikkim-registered SUV the rules require). Yumthang is a day trip from Lachung, not a transfer, so it has no page. Fares are set at the existing per-km level and flagged for the owner |
> | 7. Gangtok local details | Done 24 Oct: the Bagdogra → Gangtok route now answers the Deorali drop rule (relaxed by the July 2022 taxi-association agreement), private taxi vs shared jeep vs helicopter, and what happens when NH10 closes |
> | 8. Publishing rhythm | Started 24 Oct with two dated guides: taxi vs helicopter vs shared jeep, and NH10 road status with the NH717A alternative. Both carry a "last checked" date the dashboard moves on with each publish |
> | 9. "From city" package pages | Done 24 Oct: `/tour-packages/from/` Kolkata, Delhi, Mumbai, Bengaluru, Hyderabad and Chennai, each with the nonstop flight time, the train option and what day 1 can hold, plus every package. Fixed words are a dashboard template; city facts are in `src/data/from-cities.ts` |
> | 1, 11–15 | Owner and off-page work: go live, reviews (on hold at the owner's request), listings, links, registrations, post-launch measurement. See `launch-checklist.md` |

Checked 24 Oct 2026. Our side is https://bagdograairporttaxi.vercel.app (branch `astro-redesign`, commit d775b99). Builds on the 19 Oct competitor research and the North Bengal Tourism comparison, without redoing them.

## Verdict

**On-page, we are already ahead of every competitor checked.** No rival combines our schema coverage, one fixed fare used everywhere, published cancellation terms, a full llms.txt and a crawler-friendly robots.txt. On those points the nearest local rival, darjeelingsikkimtaxi.com, is clearly behind.

**Off-page, we start from zero, and that is where rankings are decided.** Today we rank for none of the four key queries. Two reasons: the preview is noindex on purpose, and the live bagdograairporttaxi.com is still the old PHP site. The leaders win on size and age. darjeelingsikkimtaxi.com has 283 URLs, 94 blog posts and was updated two days ago. northbengaltourism.com has 500+ pages and 668 Google reviews. oneway.cab, MakeMyTrip and Gozo carry national domain authority. Expect 3 to 6 months after launch before we compete on the head terms. Long-tail route pages and AI answers should come sooner, because that is where our structure is strongest (inferred).

**Speed is good on desktop but not yet ~1s on mobile.** Mobile Lighthouse is 81–82 with LCP about 5 s. The main causes are two 250 KB logo PNGs and slow rendering of the hero image. This is the one place we went backwards since the 19 Oct build scored 100.

## How this was checked, and its limits
- **The preview blocks every crawler.** Its robots.txt is `Disallow: /`, which is the PRE_LAUNCH setting working as designed, so no outside tool can read it. I built the same commit locally twice: once as deployed (pre-launch) and once with `PRE_LAUNCH = false` to see exactly what Google will get at launch. All "our site" numbers below come from the launch build.
- **Lighthouse ran locally** (Lighthouse 12, Chromium, gzip on, simulated mobile 4G). Vercel's CDN and Brotli usually make real numbers a bit better. Competitor Lighthouse runs failed because Google's PageSpeed API refused requests from this sandbox (quota), and the sandbox can't open most competitor sites directly. Run them yourself on [PageSpeed Insights](https://pagespeed.web.dev/): darjeelingsikkimtaxi.com, northbengaltourism.com, easoride.com, oneway.cab.
- **Competitor schema:** the page reader strips JSON-LD, so "none seen" is not proof of none. Confirm the top 3 with Google's Rich Results Test.
- **Search results come from a US-based search tool.** They show who ranks, not the exact google.co.in order from Siliguri. Google Maps and AI answer engines (ChatGPT, Perplexity, AI Overviews) could not be queried directly.

---

## 1. Scorecard

Scores out of 5. "Us" means the launch build of the preview. Where a competitor wasn't checked on a row, it says so.

| Area | Us (at launch) | darjeelingsikkimtaxi.com | northbengaltourism.com | easoride.com | Wizzride | oneway.cab | MakeMyTrip / Gozo |
|---|---|---|---|---|---|---|---|
| Titles and meta | **5** keyword + fare + distance on every route | 4 ("Fixed Fare 2026", but fares are "indicative") | 3 | 4 | 2 (no H1) | 4 (fare in title) | 4 |
| Schema / structured data | **5** 27 types, 66/66 pages | 1 none seen | 1 none seen | 1 none seen | 1 none seen | 1 none seen | 2 (not verified) |
| robots.txt for AI crawlers | **5** 25 bots named and allowed | 5 names GPTBot, ClaudeBot, PerplexityBot, Google-Extended | 4 open, no AI rules | 4 open | 3 open, heavy blocks | 4 open | n/a |
| llms.txt | **5** 11 KB index + 51 KB full file, with fares and policies | 0 (404) | 3 (~300 words, rules and contacts only) | 0 (404) | 4 (~120 links) | 2 (~230 words) | 0 |
| Sitemap | 4 (66 URLs, valid) | 5 (283 URLs, lastmod 22 Oct) | 3 (500+ URLs, lastmod frozen May 2025) | 3 | 3 (lastmod Apr 2026) | 4 | 5 |
| Route pages from Bagdogra/NJP/Siliguri | 4 (20 pages) | **5** (121 taxi URLs, incl. Lachen, Lachung, Zuluk, Yumthang, "from city") | 1 (5 region pages) | 2 (one long guide) | 3 | 4 (template) | 5 (hundreds, template) |
| Tour packages | 4 (16, priced, day-wise) | 3 (18) | **5** (38 Sikkim packages, no prices) | 1 | 0 | 0 | 5 (84+ at MMT) |
| Content depth / freshness | 3 (5 guides, 11 destinations, ~1,500 words per route page) | **5** (94 blog posts, updated this week) | 4 (140 offbeat pages) | 4 | 2 | 1 (~400 words of template) | 2 |
| Fare transparency | **5** one source, "updated Oct 2026", inclusions listed | 2 (table and FAQ disagree) | 1 (no prices) | 2 (cards vs chart disagree) | 1 (no fares) | 4 | 3 |
| Trust: policies, payment, business details | 4 (cancellation, refund, 20% advance, address, phone; payment link and GSTIN still missing) | 2 (2 phones, 2 emails, no policy) | 3 (tourism badges, no payment) | 2 (3 WhatsApp numbers) | 4 (cancellation page, online booking) | 3 (app, no phone) | 5 |
| Reviews shown | 4 (4.9 from 129 Google reviews, 10 shown) | 1 (none on route page) | **5** (668 Google, 4.5) | 1 | 4 (claims 4.8 Google, no count; 515 TripAdvisor) | 4 (4.4 from 5.95K) | 4 |
| Mobile speed (Lighthouse) | 3 (81–82, LCP ~5 s) | not tested | not tested | not tested | not tested | not tested | not tested |
| Search visibility today (4 key queries) | **0** (noindex; old site not ranking) | 3 | 2 (packages) | 3 | 3 | **5** | 5 |
| **On-page total (rows 1–11, max 55)** | **48** | 33 | 33 | 24 | 27 | 31 | ~35 (robots not checked) |

How to read it: on everything a page can control, we lead. Off the page (authority, age, review count, rankings), the incumbents lead, and only launch plus time closes that gap.

---

## 2. Our preview in detail (launch build)

| Check | Result |
|---|---|
| Pages | 67 built, 66 in the sitemap (photo credits is correctly noindex). 20 route pages, 16 packages, 11 destinations, 5 guides, plus FAQ, booking, policies, about, contact, gallery |
| Titles | All 30–71 characters. Route pattern "Bagdogra Airport to Gangtok Taxi Fare ₹3,500 (125 km)". Home "Bagdogra Airport Taxi from ₹600 \| Darjeeling, Gangtok & Sikkim Cabs" |
| Meta descriptions | 73–182 characters. Destination pages run long (up to 182) and will be cut |
| Canonical | Points to https://bagdograairporttaxi.com/ (correct) |
| Schema | `TravelAgency` + `LocalBusiness` with full address, geo, 24h hours, phone, payment methods, areaServed. `TaxiService` + `Offer` on 20 routes, `TouristTrip` + `Offer` on 16 packages, `FAQPage` on 54 pages, `BreadcrumbList` on 65, `Article`, `TouristDestination`, `ImageGallery`. **`AggregateRating` is on all 66 pages, and the home page has `Review` markup copied from Google (see fix 2)** |
| robots.txt (launch) | Allows all, names 25 search and AI bots, points to the sitemap and llms files |
| llms.txt | Business summary, NAP, rating, policies, every route with km, hours and fares, then packages and guides. llms-full.txt is 51 KB. **This is the best llms.txt in the market** |
| Pre-launch state | `Disallow: /` and noindex on every page. Expected; this is why the URL can't be fetched or ranked |
| Remaining placeholders | 12 `TODO(pre-launch)` items: confirm phone/WhatsApp, legal name, founding year, office coordinates, GSTIN, social profile URLs, registrations, payment link, plus fares and packages to confirm |

**Lighthouse (local, launch build)**

| Page | Mobile perf | Desktop perf | A11y | Best practices | SEO | Mobile LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Home | 81 | 98 | 97 | 96 | 100 | 5.1 s | 0 | 30 ms |
| Bagdogra → Gangtok route | 82 | 97 | 96 | 100 | 100 | 5.0 s | 0 | 0 ms |
| Darjeeling Gangtok package | 78* | – | 96 | 100 | 100 | 5.7 s* | 0 | 0 ms |

*Package page was measured without gzip, so it reads low.

What slows mobile down:
1. `logo.png` (249 KB) and `logo-dark.png` (266 KB) load on every page for a logo shown at about 40 px. The fix saves about 500 KB.
2. The hero image is the LCP element, and 66% of LCP is "render delay", meaning the image loads fast but waits to paint. It is a full-bleed `object-cover` image (1343 px tall on mobile) behind other content.
3. The home page has 3,433 DOM elements (493 KB of HTML before compression, 51 KB gzipped). Large inline SVG illustration and the reviews block are the likely sources.
4. Images could be smaller: `gangtok-800.webp` and `toy-train-800.webp` are served at 800 px where 400 px is enough on mobile.

---

## 3. Competitors: what changed or was newly found since 19 Oct

**darjeelingsikkimtaxi.com, still the one to beat locally.**
- Sitemap now has **283 URLs**: 121 taxi pages, 18 tour pages and 94 blog posts. The last update was 22 Oct 2026, so they publish actively.
- Route coverage we don't have: Bagdogra to Lachen, Lachung, Zuluk and Yumthang; Darjeeling ↔ Gangtok ↔ Pelling; Gangtok to Lachen and Lachung; NJP to Pelling and Sikkim; Kolkata and Delhi to Darjeeling; "Sikkim Darjeeling taxi from Bangalore / Chennai / Hyderabad / Ahmedabad / Kolkata".
- The Bagdogra to Gangtok page is strong: about 2,000 words and 15 sections, including "The Deorali drop rule", Gangtok-city vs rest-of-Sikkim permits, and private taxi vs shared jeep. It has 11 FAQs.
- Weak spots: hatchback ₹3,800–4,500 and Innova Crysta ₹5,500–6,500+ conflict with its own FAQ, the title says "Fixed Fare" while the body says "indicative", it shows two phone numbers and two emails, no reviews, no cancellation terms and no online payment.
- Its robots.txt names and allows the AI crawlers, but llms.txt returns 404.

**oneway.cab, the strongest ranker for route queries.** It came up first for both Bagdogra → Gangtok and Bagdogra → Darjeeling cab searches. Title "Bagdogra Airport To Gangtok Cab @ ₹4349 \| Get Up to ₹500 Off". Fares: hatchback ₹4,349, sedan ₹4,549, SUV ₹5,899. It shows 4.4 from 5.95K reviews. The page itself is thin, about 400 words of template, with no permit, Deorali or NH10 content, FAQ answers that don't render, and no phone number. It wins on domain authority and URL volume, not on content.

**Wizzride.** The home page has no H1 and no fares. It claims "4.8 ★ Google Rating" with no count. It has cancellation-policy and cancel-ticket pages and a good llms.txt (~120 links). It does not rank for the private-taxi queries in this check.

**northbengaltourism.com.** No change since the earlier comparison: 500+ pages, 668 Google reviews, a short llms.txt (about 300 words of rules and contacts, not a content index), sitemap lastmod frozen at May 2025.

**easoride.com.** Still ranks for "Bagdogra airport taxi". No llms.txt (404). Its sitemap was updated 23 Oct.

**New in package results:** adorablevacation.com, naturewings.com, touristhubindia.com and esikkimtourism.in hold "Sikkim tour package from Bagdogra". Adorable Vacation's page has a day-wise 8-day itinerary and a price grid from ₹19,900 to ₹72,200 by hotel category, but no reviews, no FAQ, no exclusions and no address. Our packages already beat that on structure. They win on age and links.

---

## 4. Search visibility today

| Query | Who shows up (US search tool, 24 Oct) | Us |
|---|---|---|
| Bagdogra airport taxi | darjeeling-tourism.com, jayantitravels.in, sikkimtravellers.com, easoride.com, siliguritravels.com, cabinsikkim.com, gotaxisiliguri.com, siliguritaxis.com, wizzride.com, Uber IXB page | Not present |
| Bagdogra to Gangtok taxi | oneway.cab (2 pages), easemytrip, MakeMyTrip, goeazycab, Gozo blog, sikkimtravellers tariff, broomboomcabs, unchartedlens | Not present |
| Bagdogra to Darjeeling cab | oneway.cab (2), easemytrip, wticabs, jayantitravels, Wizzride, Gozo, ddcab, MakeMyTrip, cabbazar | Not present |
| Sikkim tour package from Bagdogra | naturewings, touristhubindia, adorablevacation (2), esikkimtourism, triptotemples, helloindiatour | Not present |
| "bagdograairporttaxi.com" (brand) | MakeMyTrip, Uber, darjeeling-tourism.com. **Our own domain did not appear** | Not present |

Expected while the preview is noindex. The worrying one is the brand search: the old site doesn't rank even for its own domain name, so the new site starts with almost no existing ranking to carry over.

**AI answers (inferred).** For "what is the taxi fare from Bagdogra to Gangtok", the sources search returns are blogs (Gozo blog, unchartedlens, discoverwithdheeraj) and rome2rio, not operators. That's the slot our route pages and llms.txt are built to win, because they open with a direct answer, a dated fare and FAQ schema.

---

## 5. Ranked list of what to fix next

Ranked by how much each moves rankings and bookings. (See the status note at the top for which of these are now done on `main`.)

**Launch-critical (do before or at launch)**
1. **Finish the owner items and go live.** Every day on noindex is a day of zero rankings. Clear the 12 `TODO(pre-launch)` items (phone/WhatsApp confirmation, GSTIN, legal name, coordinates, social `sameAs` URLs, payment link, fares), flip `PRE_LAUNCH`, point bagdograairporttaxi.com at Vercel, and submit the sitemap in Search Console and Bing Webmaster Tools.
2. **Change how the review schema is used.** `AggregateRating` sits on all 66 pages, and the home page marks up Google reviews as `Review`. Google's rules say reviews copied from another site (Google Maps) and self-served business ratings aren't eligible for star snippets. Repeating the rating sitewide can count as spammy markup. Keep the visible Google badge and slider, but drop `Review` from the JSON-LD and keep `AggregateRating` off route and package pages (or remove it entirely). The rating still reaches Google through the Business Profile itself.
3. **Keep the vercel.app copy out of Google after launch.** Once `PRE_LAUNCH` is off, bagdograairporttaxi.vercel.app will serve the same indexable pages as the real domain. Canonical tags help, but add a host rule in `vercel.json` to 301 `*.vercel.app` to bagdograairporttaxi.com, or send `X-Robots-Tag: noindex` on that host.
4. **Get mobile speed back to ~1 s.** Replace `logo.png`/`logo-dark.png` (515 KB together) with an SVG or a 2–5 KB WebP sized for 40 px; keep `logo.png` only for the schema `logo` field. Remove the hero image's render delay: serve a 400–600 px mobile crop, preload it, and check that no CSS or font swap is holding the paint. Cut home DOM size (3,433 nodes), for example by lazy-rendering the reviews slider and simplifying the inline SVG. Target: mobile Lighthouse 95+, LCP under 2.5 s.
5. **Old URL redirects.** `/:path*.php → /` sends every old PHP page to the home page, which Google treats like a soft 404. Map the old URLs one-to-one where a match exists (check the old site's indexed URLs in Search Console first), and let the rest 404.

**First month after launch (closes the gap with darjeelingsikkimtaxi.com)**
6. **Add the missing route pages** (same template, ~1,500 words, fare table, FAQs): Bagdogra to Lachung, Lachen, Zuluk, Yumthang; Darjeeling ↔ Gangtok; Gangtok ↔ Pelling; NJP to Pelling and Kalimpong; Siliguri to Kalimpong and Mirik; Gangtok to Lachung. That takes us from 20 to about 32 route pages.
7. **Add the local details darjeelingsikkimtaxi.com uses on its Gangtok page:** the Deorali taxi-stand drop rule, where West Bengal cars can and can't go in Sikkim, private taxi vs shared jeep with per-seat fares, and NH10 vs the Rishi Road alternative when NH10 closes. These are the exact facts AI answers quote.
8. **Start a regular publishing rhythm.** The leader posts several times a month. Aim for 2–4 dated posts a month: road status (NH10, North Sikkim permits), snow and seasonal updates, Puja and holiday rush, and "taxi vs helicopter vs shared jeep". Each one should link to the matching route page.
9. **"From city" landing pages** for packages: Sikkim tour package from Kolkata, Mumbai, Bangalore, Delhi, Hyderabad. darjeelingsikkimtaxi.com and adorablevacation.com rank with these and they're cheap to build from existing package data.
10. **Trim destination meta descriptions** to 155 characters or less (several are 160–182).

**Off-page (where the incumbents really win)**
11. **Reviews engine.** 129 Google reviews vs North Bengal Tourism's 668. Send a review link by WhatsApp after every trip; 20–30 a month gets us past 300 in about six months. Set `GOOGLE_PLACES_API_KEY` so the count on the site refreshes itself.
12. **Same name, address and phone everywhere:** Google Business Profile (categories Taxi service + Tour operator, services with prices, photos), Bing Places, Justdial, TripAdvisor (claim the unrated "Bagdogra Taxi" listing if it's ours), Facebook, Instagram. Then add them all to `sameAs`.
13. **Earn local links:** hotels and homestays in Darjeeling, Gangtok and Pelling (a "recommended transfer partner" link), travel bloggers who write Bagdogra guides (the Gozo blog, unchartedlens and discoverwithdheeraj all rank for fare questions), and the Sikkim and West Bengal tourism directories, if we're registered.
14. **Registrations and badges.** northbengaltourism.com shows Ministry of Tourism, IRCTC and NATTA. Add any we hold (Sikkim Tourism registration, West Bengal tourism, IATO/TAAI) to `BUSINESS.registrations`, plus the GSTIN.

**Measure after launch**
15. Run PageSpeed Insights on the live domain and on the four competitors above, and the Rich Results Test on home, a route and a package. Track the four key queries in Search Console weekly. Re-run this comparison about 6 weeks after launch.

---

## Sources
- Our build: repo vibhorashopifyagency/bagdograairporttaxi, branch `astro-redesign`, commit d775b99 (built locally, pre-launch and launch modes)
- https://www.darjeelingsikkimtaxi.com/robots.txt · /sitemap.xml · /bagdogra-airport-to-gangtok-taxi
- https://northbengaltourism.com/robots.txt · /llms.txt
- https://easoride.com/robots.txt · /sitemap.xml
- https://wizzride.com/ · /robots.txt · /sitemap.xml · /llms.txt
- https://oneway.cab/robots.txt · /llms.txt · https://oneway.cab/bagdogra-airport/gangtok/fare
- https://hurryupcabs.com/robots.txt · /llms.txt
- https://adorablevacation.com/sikkim-tour-packages-from-bagdogra-njp-siliguri/
- Search results for: Bagdogra airport taxi; Bagdogra to Gangtok taxi; Bagdogra to Darjeeling cab; Sikkim tour package from Bagdogra; bagdograairporttaxi.com; taxi fare from Bagdogra airport to Gangtok 2026 (standard and extended search, 24 Oct 2026)

## Measurements after the 24 Oct fixes on `main`

Lighthouse 12, mobile preset (simulated 4G, 4× CPU slowdown), headless Chrome, both builds served locally with gzip from the same machine, two runs per page. "Before" is `main` at 248acee built in a clean worktree; "after" is the same commit plus the 24 Oct changes (sprite icons, WebP logos, shorter descriptions). Both builds skipped the dashboard content pull.

| Page | Perf before → after | LCP before → after | Page weight before → after | LCP render delay before → after |
|---|---|---|---|---|
| Home | 77–78 → **97** | 6.2–6.4 s → **2.5 s** | 1,159 KB → **663 KB** | 5.0 s → 2.0 s |
| Bagdogra → Gangtok route | 81 → **96–98** | 5.1 s → **2.4–2.7 s** | 772 KB → **276 KB** | 3.6 s → 1.8–2.1 s |
| Darjeeling–Gangtok package | 83 → **99** | 4.8 s → **2.1 s** | 776 KB → **280 KB** | 3.3–3.6 s → 1.5–1.6 s |

FCP (0.9–1.1 s), TBT (0 ms) and CLS (0) did not change. The two 250 KB logo PNGs were the main cost: on simulated 4G they competed with the hero photo for the whole first two seconds, which Lighthouse reported as "render delay" on the hero. Home HTML went from 646 KB to 566 KB uncompressed (75 KB to 71 KB gzipped); the remaining 1.5–2 s of render delay is parsing the page itself (about 4,100 DOM nodes, 99 KB of inlined CSS, four copies of the mega-menu hill illustration at 6 KB each), which is the next thing to trim if a higher score is wanted.

Vercel's CDN adds Brotli and HTTP/2, so live numbers should be a little better than these. Re-check on PageSpeed Insights after launch.
