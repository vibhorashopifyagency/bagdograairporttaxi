# Structured data

Contents: 1. How Google uses it · 2. General policies · 3. Retired and
unsupported types · 4. LocalBusiness · 5. Organization · 6. Article · 7.
Breadcrumb · 8. Review and AggregateRating · 9. Image licence metadata · 10.
WebSite and site name · 11. Speakable · 12. Carousels (beta) · 13. Testing ·
14. Sources

## 1. How Google uses it

Structured data gives explicit clues about a page's meaning and can unlock a
rich result. JSON-LD is recommended; Microdata and RDFa also work. It can sit
in `<head>` or `<body>`, and JSON-LD injected by JavaScript or a CMS widget
is read. Unsupported schema.org types are allowed but earn no feature. Google
never guarantees a rich result.

## 2. General policies

- Don't block structured-data pages with robots.txt, `noindex` or access
  control.
- Keep information current; stale time-sensitive content gets no rich
  result.
- Provide original content (yours or your users').
- **Mark up only what is visible to the reader.** The HTML must describe the
  same thing the markup describes.
- No irrelevant or misleading markup (fake reviews, wrong type for the
  content).
- Never use markup to deceive, impersonate or misrepresent ownership,
  affiliation or purpose.
- Include every **required** property or the item is ineligible; recommended
  properties improve the result.
- Reviews and ratings must come from actual users; otherwise manual action.
- Put markup on the page it describes; put the same markup on every
  duplicate, not just the canonical.
- Use the most specific type and properties.
- Image URLs in markup must be relevant, crawlable and indexable.
- Several items on one page: nest them, or use separate blocks linked by
  `@id`. Mark up the page's main item, and mark up every visible instance
  (all the reviews shown, not one).

Mobile-first indexing: the structured data on the mobile rendering must be
the same as on desktop.

## 3. Retired and unsupported types

| Type | Status |
|---|---|
| FAQPage | Rich result deprecated 8 May 2026, removed from Search from 7 May 2026, docs removed 15 June 2026. (Was already limited to government and health sites since September 2023.) |
| HowTo | Retired September 2023. |
| SpecialAnnouncement | Deprecated, effective 31 July 2025. |
| ClaimReview (fact check) | Deprecated 2025. |
| Course info, estimated salary (Occupation), learning video, vehicle listing | Docs removed 9 September 2025. Course **list** (ItemList of Course) remains. |
| Practice problems (Quiz) | Deprecated 5 November 2025, docs removed January 2026. |
| Sitelinks search box (SearchAction on WebSite) | Retired 2024. Keep WebSite for the site name. |
| Dataset | Used only by Dataset Search, not Google Search. |
| data-vocabulary.org breadcrumbs | Not eligible. |
| Book actions, EnergyConsumptionDetails | Deprecated 2025. |

Still supported (October 2026): Article, Breadcrumb, Carousel (with Recipe,
Course list, Restaurant, Movie), Course list, Dataset (Dataset Search),
Discussion forum, Education Q&A, Employer aggregate rating, Event, Image
metadata, Job posting, Local business, Math solver, Movie, Organization,
Product (merchant listing, product snippet, variants), Profile page, Q&A,
Recipe, Review snippet, Software app, Speakable, Subscription and paywalled
content, Vacation rental, Video.

## 4. LocalBusiness

Required: `name`, `address` (PostalAddress; more detail is better).
Recommended: `url` (the location's own working URL), `telephone` (with
country code), `geo` (latitude and longitude with **at least 5 decimal
places**), `openingHoursSpecification`, `priceRange` (numeric range or
currency signs, **under 100 characters** or it isn't shown), `department`
(nested LocalBusiness named "{store} {department}"), `menu` and
`servesCuisine` for food, plus every Organization property (section 5).

Opening hours: `opens`/`closes` as hh:mm (hh:mm:ss accepted), `dayOfWeek`
as full English names or schema.org URLs. Open 24 hours: `00:00`–`23:59`.
Closed all day: `00:00`–`00:00`. Past midnight: `closes` earlier than
`opens` in one specification. Seasonal: `validFrom`/`validThrough`.

`aggregateRating` and `review`: **only for sites that capture reviews of
other local businesses**. A business marking up reviews of itself is
ineligible (section 8).

Images are required only for the Restaurant carousel (limited providers):
crawlable, representative, 16x9/4x3/1x1, 50k+ pixels.

Use the most specific subtype (TravelAgency, Restaurant, Dentist…); several
types go in an array; `additionalType` is not supported. Put the markup on
the page about the business (homepage or About); it does not need to be on
every page, though a consistent `@id` graph everywhere is harmless. The
hours, phone and address must match the Google Business Profile.

## 5. Organization

No required properties; add what applies. `name`, `alternateName`,
`legalName`, `url`, `description`, `foundingDate` (ISO 8601), `address`
(two-letter `addressCountry`), `telephone`, `email`, `contactPoint`,
`sameAs` (profiles, review sites), `numberOfEmployees`, and identifiers:
`iso6523Code` (preferred; `0060:` DUNS, `0088:` GLN, `0199:` LEI), `vatID`
(a trust signal because users can look it up), `taxID` (matching the
address country, e.g. an Indian GSTIN), `naics`, `globalLocationNumber`.
Merchants: `hasMerchantReturnPolicy`, `hasShippingService`,
`hasMemberProgram`.

`logo`: URL or ImageObject, **at least 112x112**, crawlable, in a format
Google Images supports, legible on a white background. It steers the logo in
results and the knowledge panel.

## 6. Article (Article, NewsArticle, BlogPosting)

No required properties; recommended: `headline` (concise; long ones
truncate), `image`, `datePublished`, `dateModified`, `author` with
`author.name` and `author.url`.

- Images: crawlable, representative (not a logo), supported format,
  **multiple aspect ratios 16x9, 4x3, 1x1**, each width × height ≥ 50,000
  pixels. Several images go in an array.
- Dates: ISO 8601 **with timezone**, or Google assumes Googlebot's.
  `datePublished` is first publication; `dateModified` the last substantive
  change. Add them only when they are more accurate than what Google can
  infer; don't move them without a real change.
- Authors: one `author` object per author shown on the page; `Person` for
  people, `Organization` for an organisation; `author.name` is the name
  alone (no "by", titles or publisher); `author.url` or `sameAs` to a bio or
  profile. An in-site author page should carry ProfilePage markup.
- Multi-page articles: canonical to each page or the view-all, not page 1.
- Paywalled content: use the paywalled-content markup so it isn't cloaking.
- No markup is required for Top stories; it helps Google understand.

## 7. BreadcrumbList

At least two `ListItem`s, `position` from 1, each with `name` and `item`
(URL); the **last item may omit `item`** (Google uses the page URL). Model
the trail on a typical user path, not the URL. No item is needed for the host
or the current page. Several trails: an array of BreadcrumbList. Shown on
desktop only (January 2025).

## 8. Review and AggregateRating

Eligible `itemReviewed` types: Book, Course, CreativeWorkSeason,
CreativeWorkSeries, Episode, Event, Game, HowTo, LocalBusiness, MediaObject,
Movie, MusicPlaylist, MusicRecording, Organization, Product, Recipe,
SoftwareApplication. Employer reviews use EmployerAggregateRating.

**Self-serving reviews**: if the entity reviewed controls the reviews about
itself, pages using LocalBusiness or any Organization type are ineligible
for the star feature, including reviews embedded via a third-party widget.
Ratings must come directly from users, not be curated by editors.
LocalBusiness and Organization are valid only for sites that capture reviews
about *other* businesses.

Technical guidelines: reviews must be visible on the page; refer to a
specific item (nested or via `itemReviewed`); include an aggregate rating
when several reviews are shown; **don't aggregate reviews or ratings from
other websites**; no fake or undisclosed incentivised reviews (July 2026);
prefer ratings that come with a comment and the author's name (January
2025).

Review: required `author` (Person or Organization, a real name under 100
characters, not a promotional phrase), `itemReviewed` with `name` (unless
nested), `reviewRating.ratingValue`; recommended `datePublished`,
`bestRating` (default 5), `worstRating` (default 1). The individual rating
may be omitted only when both author and date are present.

AggregateRating: required `itemReviewed` (unless nested), `ratingValue`, and
`ratingCount` or `reviewCount`; recommended `bestRating`/`worstRating`.
Decimals use a dot.

## 9. Image licence metadata (ImageObject)

Required: `contentUrl` (the actual image URL; `url` is a weaker fallback)
and at least one of `license`, `creator`, `creditText`, `copyrightNotice`.
`license` (URL of the licence page) is required for the Licensable badge;
`acquireLicensePage` is where to get rights (checkout, contact or the
original source page). `creator` is a Person or Organization with `name`.
Add the markup on **every page where the image appears**. IPTC metadata
embedded in the file is the alternative (Web Statement of Rights, Licensor
URL, Copyright Notice, Creator, Credit Line); if both are present and
conflict, the structured data wins.

Preferred thumbnail (March 2026): Google reads `primaryImageOfPage`, an
`image` on the main entity, and `og:image`. Pick a relevant, representative,
high-resolution image; avoid logos, text-heavy images and extreme ratios.

## 10. WebSite and site name

Place `WebSite` on the homepage with `name` (how the site refers to itself
on the homepage) and `url` (the canonical homepage). Optional
`alternateName` in order of preference (an acronym, a short form; the
lowercase domain as the final fallback). One site name per domain or
subdomain; `www` and `m` count as the bare domain; subdirectories cannot
have their own. Put the same markup on homepage duplicates (http/https,
www/non-www). Other signals in descending weight: `og:site_name`, the
`<title>`, headings. If a WebSite node already exists, add to it rather than
creating a second.

## 11. Speakable

`speakable` on Article or WebPage, with `cssSelector` **or** `xPath` (not
both), pointing at two or three sentences (20–30 seconds of audio) per
section: headline and summary, not datelines, captions or attributions.
Beta, built for news, for English-speaking Google Assistant users in the
US. Harmless elsewhere; don't expect a result.

## 12. Carousels (beta)

An `ItemList` on a **summary page** (three or more `ListItem`s, each `item`
a LocalBusiness subtype, Product or Event with `image`, `name` and a unique
same-domain `url` that is a real detail page). All-in-one pages do not
qualify. Available only in the EEA (hotels, vacation rentals, ground
transport, flights, local businesses, things to do, products), Türkiye and
South Africa. Related regional features (aggregator and supplier units,
September 2026) are EEA-only.

## 13. Testing

Rich Results Test while developing; after deploy, URL Inspection on a few
pages (not blocked by robots.txt, `noindex` or a login); then watch the
Search Console rich-result status reports, which catch markup broken by a
template change. Validate markup that JavaScript generates in the rendered
HTML.

## 14. Sources

- https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- https://developers.google.com/search/docs/appearance/structured-data/search-gallery
- https://developers.google.com/search/docs/appearance/structured-data/local-business
- https://developers.google.com/search/docs/appearance/structured-data/organization
- https://developers.google.com/search/docs/appearance/structured-data/article
- https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- https://developers.google.com/search/docs/appearance/structured-data/review-snippet
- https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata
- https://developers.google.com/search/docs/appearance/site-names
- https://developers.google.com/search/docs/appearance/structured-data/speakable
- https://developers.google.com/search/docs/appearance/structured-data/carousels-beta
- https://developers.google.com/search/docs/appearance/structured-data/faqpage (now a deprecation notice)
- https://developers.google.com/search/updates
