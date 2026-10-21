# Crawling and indexing

Contents: 1. robots.txt · 2. Robots meta and X-Robots-Tag · 3.
Canonicalization · 4. Sitemaps · 5. HTTP status codes and redirects · 6.
JavaScript · 7. Lazy loading · 8. Mobile-first indexing · 9. URL structure ·
10. Links · 11. Google's crawlers · 12. Sources

## 1. robots.txt

- One file per host (protocol + host + port), at the root, named
  `robots.txt`, UTF-8 plain text, written in a plain editor (word processors
  add curly quotes).
- Groups start with one or more `User-agent:` lines followed by `Allow:` /
  `Disallow:` rules; `#` comments. A crawler obeys **only the first, most
  specific group that matches it**; groups naming the same agent are merged.
  `User-agent: *` matches everything except AdsBot, which must be named.
- Paths start with `/`; directories end with `/`; rules are case-sensitive;
  `*` wildcards work in every rule except `Sitemap`. `Allow` can reopen a
  path inside a disallowed directory.
- `Sitemap:` takes a fully qualified URL; several lines are allowed. It does
  not block or allow anything.
- Everything is crawlable by default. Disallow does **not** deindex; it stops
  crawling, so any `noindex` or canonical on the blocked page is never seen.
- Use it to keep crawlers out of infinite spaces (internal search, calendars,
  filters), not to choose a canonical or hide a page from results.

## 2. Robots meta and X-Robots-Tag

Directives (comma-separated, case-insensitive; `name="robots"` for all,
`name="googlebot"` to target Google; read in `<head>` and in `<body>`):
`noindex`, `nofollow`, `none` (= both), `nosnippet` (no text snippet or video
preview; also stops the page being used as direct input to AI Overviews and
AI Mode), `max-snippet:[n]` (`0` = none, `-1` = Google's choice),
`max-image-preview:none|standard|large`, `max-video-preview:[seconds]`,
`notranslate`, `noimageindex`, `unavailable_after:[date]`, `indexifembedded`
(only with `noindex`). `noarchive`, `nocache` and `nositelinkssearchbox` are
ignored now. Conflicts resolve to the most restrictive rule, and
crawler-specific tags are combined with the general one.

`data-nosnippet` on `span`, `div` or `section` keeps that text out of
snippets; it is a boolean attribute, needs valid HTML, and must not be added
or removed by JavaScript.

Robots directives generally don't limit structured data used for rich
results (except creative-work descriptions under `max-snippet`).

`X-Robots-Tag` HTTP header: any directive, optionally prefixed by a user
agent; the way to control PDFs, images and other non-HTML files, and to set
rules site-wide in the server config. Meta tags and headers are only seen
if the URL can be crawled.

A typical indexable page: `index, follow, max-image-preview:large,
max-snippet:-1, max-video-preview:-1` (all optional; `index, follow` is the
default).

## 3. Canonicalization

- Google chooses one canonical among duplicates; you state a preference with
  a `<link rel="canonical">` in `<head>` (ignored elsewhere; only one), or
  the `Link: <…>; rel="canonical"` HTTP header for non-HTML. Use one method,
  not both.
- **Absolute URLs**, self-referencing on the canonical page itself.
- Keep every signal consistent: the sitemap lists canonicals, internal links
  point at canonicals, `hreflang` uses canonicals, the HTML canonical isn't
  changed by JavaScript.
- Prefer HTTPS: redirect http to https, keep certificates valid and matching
  the host, don't list http URLs in sitemaps or hreflang; HSTS helps.
- Pick one host (www or bare) and 301/308 the other. Use permanent redirects
  when retiring a duplicate; server-side redirects are fastest.
- Don't use robots.txt, the removals tool, `noindex` or URL fragments for
  canonicalization. `rel="canonical"` with `hreflang`, `lang`, `media` or
  `type` attributes is ignored.
- Trailing slash and case: pick one form, redirect the other, and link to
  it consistently.

## 4. Sitemaps

- Optional; a hint, not a guarantee. XML is the most capable (image, video,
  news and hreflang extensions); RSS/Atom and plain text (one URL per line,
  `.txt`) also work.
- ≤ 50,000 URLs and ≤ 50 MB uncompressed per file; split and group with a
  sitemap index. UTF-8, entity-escaped, absolute URLs, placed at the root
  (or submitted in Search Console if elsewhere).
- Only canonical URLs; one of mobile/desktop unless annotated.
- `<priority>` and `<changefreq>` are ignored. `<lastmod>` (W3C datetime) is
  used only when consistently and verifiably accurate: update it for
  substantive changes (main content, structured data, links), not a
  copyright year. Omit it rather than fake it.
- Submit via Search Console, the API, a `Sitemap:` line in robots.txt or
  WebSub; cross-site submission is possible for verified sites.

## 5. HTTP status codes and redirects

- **2xx**: content is passed on to indexing (not guaranteed). 204 = nothing
  to index. A 200 page that reads like an error, or is empty, is a soft 404
  and is dropped.
- **3xx**: Google follows up to 10 hops and processes the target. 301 and
  308 are strong canonical signals; 302, 303, 307 are weak. Content on the
  redirecting URL is ignored.
- **4xx**: content ignored; indexed URLs returning 4xx are removed over
  time. 401/403 don't slow crawling. 429 is treated as a server error.
- **5xx**: crawling slows, content ignored; persistent errors drop URLs.
- Serve a real 404 (or 410) for missing pages, and a `noindex` on the 404
  template so a host that returns 200 for it doesn't index it.
- Googlebot has file-size limits per content type (documented 2026 in the
  crawler docs); very large HTML is truncated.
- **Site moves with URL changes** (a redesign that changes paths counts, even
  on the same domain): map every old URL to its new equivalent and use
  server-side 301/308 redirects. "Keep the redirects for as long as possible,
  generally at least 1 year"; from users' perspective, indefinitely. "Don't
  redirect many old URLs to one irrelevant single URL destination, such as
  the home page" (it may be treated as a soft 404); a many-to-one redirect is
  fine only where content was merged. Images, downloads and other embedded
  URLs "need to be moved in the same way": keep the old URL or redirect it.
  A copy at a different path does nothing. Change of Address is only for a
  domain or subdomain change. (Checked 21 Oct 2026.)

## 6. JavaScript

- Crawl → render → index. Server-side or pre-rendering still helps speed and
  non-rendering clients. Blocked resources aren't rendered.
- Links must be `<a href>`; routing via the History API, not fragments.
- Set titles and descriptions server-side where possible; JavaScript may set
  them, but keep one canonical and don't let scripts change it.
- Return real status codes; in SPAs avoid soft 404s by redirecting to a
  server 404 or injecting `noindex` on the error view. Google may skip
  rendering pages that carry `noindex` in the initial HTML, so JavaScript
  cannot remove a `noindex`.
- Fingerprint asset filenames; the renderer may ignore cache headers.
- Shadow DOM is flattened; project light-DOM content with `<slot>`; check
  the rendered HTML in URL Inspection.
- Validate structured data generated by JavaScript in the rendered output.
- JavaScript-based paywalls have their own guidance (August 2025).

## 7. Lazy loading

Content must load when it enters the viewport without user action
(`loading="lazy"`, IntersectionObserver, or a library); Googlebot does not
scroll or click. Don't lazy-load above-the-fold content. Infinite scroll
needs paginated URLs with absolute page numbers, linked sequentially, with
the URL updated via the History API. Image and video URLs must appear in
`src` in the rendered HTML.

## 8. Mobile-first indexing

Google indexes the mobile rendering. Responsive design is recommended. The
mobile version must have the same primary content, headings, structured
data, title and meta description, robots meta, image URLs and alt text as
desktop; accordions and tabs are fine, removed content is not. Don't block
mobile resources in robots.txt. Separate-URL sites: canonical to desktop,
`alternate` with media query to mobile, matching error codes, hreflang
paired like for like, both verified in Search Console.

## 9. URL structure

Readable words in the audience's language; hyphens between words (not
underscores or run-together words); lowercase consistently (URLs are
case-sensitive); percent-encode non-ASCII; minimal parameters, separated by
`&`, comma-separated multi-values; no fragments for content changes; group
topics in directories on large sites. Avoid combinable filters that explode
into near-duplicates, session IDs and sort parameters (use cookies), infinite
calendars (nofollow them), and parent-relative links that create endless
paths. Block problematic dynamic URLs in robots.txt. Country targeting via
ccTLD or a country subdirectory. Keywords in the domain or path carry little
weight beyond breadcrumbs.

## 10. Links

- Crawlable means `<a href="…">`: absolute, relative or query URLs, also
  when inserted by JavaScript. Not crawlable: `<span href>`, `onclick`
  navigation, `javascript:` URLs, framework-only attributes.
- Anchor text: descriptive, concise, relevant to both pages, readable out of
  context; not "click here" or "read more"; not stuffed; not links chained
  back to back. Empty anchors fall back to `title`; image links use the
  image's `alt`.
- Internal: every page worth ranking gets at least one internal link, in
  context. External: link when it adds value; `nofollow` only for untrusted
  sources, `sponsored` for paid, `ugc` for user-submitted.

## 11. Google's crawlers (robots.txt tokens)

| Token | Purpose |
|---|---|
| `Googlebot` | Search (smartphone and desktop); also Images, Video, News, Discover. Obeys robots.txt and caching. |
| `Googlebot-Image` | Images, Discover, image-dependent features, favicons, logos. |
| `Googlebot-Video`, `Googlebot-News` | Video features; Google News. |
| `Storebot-Google` | Shopping surfaces. |
| `Google-InspectionTool` | Rich Results Test and URL Inspection; no product impact. |
| `GoogleOther`, `GoogleOther-Image`, `GoogleOther-Video` | Generic fetching for research; no product impact. |
| `Google-CloudVertexBot` | Site-requested crawls for Vertex AI Agents. |
| `Google-Extended` | Not a user agent; a robots.txt token that controls use of crawled content for training Gemini models and for grounding in Gemini apps and Vertex AI. **Does not affect Search inclusion, ranking or AI Overviews.** |
| `AdsBot-Google`, `AdsBot-Google-Mobile` | Ads landing-page checks; ignore `*`, must be named. |
| User-triggered fetchers (`Google-NotebookLM`, `Google-CWS`, `Google-Pinpoint`, Site Verifier, Read Aloud, Feedfetcher) | Act on a user's request; generally ignore robots.txt. |

AI Overviews and AI Mode are governed by Googlebot rules, not by a separate
token. The crawler reference moved to
https://developers.google.com/crawling/docs/ in November 2025.

## 12. Sources

- https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/http-network-errors
- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading
- https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing
- https://developers.google.com/search/docs/crawling-indexing/url-structure
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers
- https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
