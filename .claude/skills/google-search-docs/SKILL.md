---
name: google-search-docs
description: Google Search Central (developers.google.com/search/docs) distilled into an audit-and-fix playbook for a website codebase: Search Essentials, spam policies, helpful-content and E-E-A-T self-assessment, structured data rules per type (what is required, what is retired, what gets a manual action), crawling and indexing (robots.txt, robots meta, canonicals, sitemaps, status codes, JavaScript, mobile-first), and appearance (title links, snippets, images, favicons, site names, page experience, AI Overviews). Use this whenever the user mentions Google Search, Googlebot, Search Console, rich results, structured data or schema.org/JSON-LD, sitemaps, canonical tags, robots.txt, indexing, "SEO" in the Google sense, a ranking drop, a manual action, AI Overviews/AI Mode visibility, or asks to "follow Google's guidelines", "check against Google's docs" or "implement Google's recommendations", even when they don't say "Google Search Central". Includes a dependency-free audit script for a built static site.
---

# Google Search Central, as a working skill

Google's own documentation is the only source that says what Google Search
requires, what earns a feature, and what triggers a manual action. Most SEO
advice drifts from it. This skill keeps the rules close, with the source URL
beside each one, and a script that checks a built site against the ones that
can be checked mechanically.

Two facts shape how to use it:

- **The docs change.** In 2025–2026 Google retired the FAQ, HowTo,
  SpecialAnnouncement, ClaimReview, course-info, practice-problem and several
  other rich results, added spam policies, and documented AI Overviews. Every
  reference file here carries its source URL. When a decision rests on a rule
  that might have moved (a rich-result type, a crawler token, a policy), fetch
  the source page before relying on the summary, and fold what you learn back
  into the reference file. `references/changelog-2025-2026.md` is the fastest
  way to see what moved recently.
- **Trust comes first.** Google's content guidance says trust is the most
  important part of E-E-A-T, and its structured-data policy says markup must
  describe what is visible on the page. Nearly every rule below is a form of
  "don't claim what the page doesn't show." When in doubt, make the page
  honest first and the markup second.

## Workflow

1. **Find the stack and the build output.** Static sites (Astro, Next export,
   Hugo, Eleventy, plain HTML) can be audited from their output directory;
   framework sites from a crawl of the running site. Locate where `<head>` is
   assembled, where structured data is built, where robots.txt and the sitemap
   come from, and whether a verification/CI script already enforces anything.
2. **Run the audit** on the built output:
   ```sh
   node <this skill>/scripts/audit-site.mjs dist            # human report
   node <this skill>/scripts/audit-site.mjs dist --json     # for scripting
   ```
   It checks the mechanical rules: title links, snippets, canonicals, robots
   meta, viewport, images (src and alt), crawlable links and anchor text,
   favicon size, JSON-LD validity, retired types, breadcrumb shape, Article
   dates and images, LocalBusiness/Organization details, self-serving review
   markup, FAQ answer visibility, sitemap URLs and lastmod, robots.txt, and
   the 404 page. `FAIL` means Google documents it as a requirement,
   eligibility rule or manual-action risk; `WARN` is a documented best
   practice; `INFO` is worth knowing. Exit code 1 on any FAIL, so it can run
   in CI after the build.
3. **Read the page the way a rater would**, using the self-assessment
   questions in `references/content-quality.md`. The script cannot see thin
   or copied content, a byline that leads nowhere, a date bumped without a
   change, or a location list stuffed into a footer.
4. **Fix in this order**, because each layer is wasted without the one above:
   1. Technical requirements: crawlable, returns 200, indexable text, not
      blocked by robots.txt when a `noindex` is supposed to be read.
   2. Spam and manual-action risks: self-serving review markup, markup for
      content that isn't visible, hidden text, doorway pages, scaled
      low-value pages, misleading business information.
   3. Canonical, sitemap and internal-link consistency (one URL per page,
      every signal naming the same URL).
   4. Title, meta description, one clear main heading per page.
   5. Structured data that Google still uses, complete with required
      properties, dated with timezones, with crawlable image URLs.
   6. Images, page experience, AI-feature eligibility.
5. **Verify**: rebuild, re-run the audit, then test one page of each template
   in the Rich Results Test and the URL Inspection tool once the site is live.
   Google re-crawls on its own schedule (days to weeks).
6. **Leave a guard behind.** If the project has a build-verification step, add
   the rules you fixed to it so they cannot silently return. Where the project
   has a launch checklist or README, record what was deliberately left out and
   why (for instance "no AggregateRating on the business: self-serving").

## The rules that matter most, in one screen

These are the ones that decide eligibility or risk a manual action. Details
and sources are in the references.

- **Three technical requirements**: Googlebot not blocked, HTTP 200,
  indexable content. Blocking a URL in robots.txt does not keep it out of the
  index; `noindex` does, and only if the URL can be crawled.
- **Review markup is not for your own business.** `LocalBusiness` and
  `Organization` `aggregateRating`/`review` are only valid on sites that
  review *other* businesses. Ratings may not be aggregated from other sites.
  Embedding a Google rating as `AggregateRating` on your own business breaks
  both rules. Show the rating as HTML; leave it out of the markup.
- **Markup describes visible content.** Every marked-up fact, answer, price
  and image must be on the page. Fake or non-user reviews, and "FAQ" answers
  the page doesn't show, are manual-action territory.
- **Retired rich results** (no Google feature any more): FAQ (May 2026),
  HowTo, SpecialAnnouncement, ClaimReview, course info, estimated salary,
  learning video, vehicle listing, practice problems, sitelinks search box.
  Harmless to keep for other engines; never add them for Google.
- **Dates**: `datePublished`/`dateModified` in ISO 8601 *with a timezone*,
  never derived from the build time, and never bumped without a real change
  (Google names that as a search-engine-first signal).
- **Canonical**: absolute URL, in `<head>`, self-referencing on the canonical
  page, the same URL in the sitemap and in internal links. HTTPS preferred;
  redirect http and the non-preferred host with 301/308.
- **Sitemap**: canonical URLs only, absolute, UTF-8, under 50,000 URLs/50 MB;
  `priority` and `changefreq` are ignored; `lastmod` is used only when it is
  consistently accurate, so omit it rather than fake it.
- **Title link**: a `<title>` on every page, distinct per page, descriptive,
  brand at the end on inner pages, one clearly dominant `<h1>`. Google
  rewrites half-empty, boilerplate, stale or keyword-stuffed titles.
- **Images**: an `<img>` with `src` (CSS backgrounds and srcset-only are not
  indexed), descriptive `alt`, descriptive filenames, near relevant text.
  For the result thumbnail set `primaryImageOfPage`/`image` in schema and
  `og:image`. Article images in 16x9, 4x3 and 1x1 at 50k+ pixels. Image URLs
  in markup must be crawlable.
- **Links**: `<a href>` only; descriptive anchor text; `nofollow`/`sponsored`
  /`ugc` where they apply, not on every external link.
- **Mobile-first**: the same content, headings, structured data, robots meta
  and image URLs on the mobile rendering; nothing behind a tap.
- **Page experience**: Core Web Vitals (LCP ≤ 2.5 s, INP < 200 ms, CLS < 0.1)
  are the only part that ranking uses directly; HTTPS, no intrusive
  interstitials, and content distinguishable from ads are expected.
- **AI Overviews and AI Mode** need nothing special: indexed, snippet-eligible
  pages qualify; `nosnippet`, `data-nosnippet`, `max-snippet` and `noindex`
  limit what they can use. `Google-Extended` controls Gemini training and
  grounding, not Search or its AI features. `llms.txt` is not used by Google.
- **Site name** comes from `WebSite` markup on the homepage (`name`, `url`,
  optional `alternateName` such as the bare domain), then `og:site_name`,
  then the title. **Favicon**: square, at least 48x48, linked from the
  homepage, crawlable by Googlebot-Image.

## Reference files

Read the one that matches the question; each starts with a table of contents
and ends with its sources.

| File | Covers |
|---|---|
| `references/essentials-and-spam.md` | Search Essentials, the technical requirements, every spam policy with its definition, legal/personal-information demotions |
| `references/content-quality.md` | The helpful-content self-assessment questions, E-E-A-T, Who/How/Why, generative-AI content guidance, the named ranking systems |
| `references/structured-data.md` | General structured-data policies; LocalBusiness, Organization, Article, Breadcrumb, Review/AggregateRating, ImageObject licence, WebSite, Speakable, carousels; the retired list |
| `references/crawling-indexing.md` | Technical requirements, robots.txt, robots meta and X-Robots-Tag, canonicalization, sitemaps, HTTP status codes, JavaScript, lazy loading, mobile-first, URL structure, links, Google's crawler tokens |
| `references/appearance-and-page-experience.md` | Title links, snippets, images, favicon, site names, sitelinks, page experience, Core Web Vitals, interstitials, AI features, Preferred Sources, Search Console |
| `references/changelog-2025-2026.md` | Dated list of documentation changes, so a rule can be checked for freshness |

## Judgement calls the script cannot make

- **Service-area lists.** A footer or paragraph listing every town served is
  legitimate for a local service business and "keyword stuffing" when it is
  there to rank for each town. Keep such lists short, honest and useful to a
  visitor (linked to a page that actually serves that place), and never
  repeat them on every page in several forms.
- **Programmatic pages** (one page per route, product or location). Google
  encourages generated titles and descriptions when they are specific and
  varied, and treats pages that differ only in a swapped place name as
  doorway or scaled-content abuse. Each page needs facts that only apply to
  it (its own price, distance, timings, tips, FAQs).
- **Bylines.** Google asks whether it is clear who created the content and
  whether the byline leads to information about them. "Written by our team"
  with no link is a weak answer; a link to an About page with real people is
  a reasonable one for a small business. Disclose automation where a reader
  would want to know.
- **Accordions and tabs** are fine (Google names them as allowed); content
  that only loads after a click or scroll is not, because Googlebot does not
  interact.
- **Pre-launch sites.** `noindex` plus `Disallow: /` is self-defeating on
  launch day: once robots.txt opens, the `noindex` must already be gone or
  Google indexes nothing, and while robots.txt is closed any linked URL can
  still be indexed without content. Flip both in the same deploy.

## When the user asks about something not covered here

Fetch the relevant page under https://developers.google.com/search/docs/
(the left-hand navigation groups them as Fundamentals, Crawling and indexing,
Ranking and search appearance, Monitoring and debugging, Guides), summarise
the rule with its URL, and add it to the matching reference file so the next
run has it.
