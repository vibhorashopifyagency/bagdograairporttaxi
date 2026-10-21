# Search appearance and page experience

Contents: 1. Title links · 2. Snippets and meta descriptions · 3. Images ·
4. Favicon · 5. Sitelinks · 6. Page experience · 7. Core Web Vitals · 8.
Intrusive interstitials · 9. AI Overviews and AI Mode · 10. Preferred
Sources · 11. Search Console · 12. Sources

## 1. Title links

Google builds the title link from the `<title>`, the main visible title and
`<h1>`, `og:title`, other prominent text, anchor text pointing at the page,
and WebSite markup. Best practice:

- A `<title>` on every page; descriptive and concise (long titles truncate
  to the device width); no vague "Home" or "Profile".
- Distinct per page. Shared patterns must add page-specific details;
  "micro-boilerplate" titles that differ only in a number get rewritten.
- No keyword stuffing; no prices that change quickly (flight prices are the
  example).
- Brand: full on the homepage; on inner pages the site name at the start or
  end, separated by hyphen, colon or pipe. Google may drop a site name that
  it already shows in the result.
- One clearly dominant main heading, ideally the first `<h1>`, in the same
  language and script as the content.
- Google rewrites titles that are half-empty, obsolete (old year), inaccurate,
  boilerplate, or when no heading is clearly the main one.

## 2. Snippets and meta descriptions

Snippets come mostly from page content, sometimes from the meta description
when it describes the page better, and vary by query. No length limit;
truncated to the device. Write one or two specific, human-readable sentences
per page that summarise the whole page; include useful facts (price, author,
date). Identical descriptions across pages are useless; site-level text is
fine on the homepage and aggregation pages. Programmatic descriptions are
encouraged for database-driven sites if they are specific and varied.
Controls: `nosnippet`, `max-snippet:[n]`, `data-nosnippet`. Keep content
visible by default (no "read more" that hides it), don't force scroll
position on load, and don't strip the URL hash on load.

## 3. Images

- Indexed only from `<img src>` (also inside `<picture>`/`srcset`, which
  must keep a `src` fallback); CSS backgrounds are not indexed. Supported:
  BMP, GIF, JPEG, PNG, WebP, SVG, AVIF. Match extension to format. Large
  data URIs bloat the page.
- Reuse the same URL for the same image everywhere.
- Image sitemaps help Google find images it wouldn't otherwise (CDN domains
  allowed; verify the CDN host in Search Console).
- Sharp, high-quality, optimised images; place them near relevant text on
  pages about the subject.
- Alt text is the most important attribute: informative, in context, not
  stuffed. Inline SVG uses `<title>`. Short descriptive filenames.
- Preferred thumbnail: `primaryImageOfPage` or the main entity's `image`,
  and `og:image`; relevant, representative, high resolution; no logos,
  text-heavy images or extreme aspect ratios.
- Structured data with an `image` property is required for image badges.
- Opt out of inline full-size display by returning 200/204 to Google
  referrers; use the removal method to leave Images entirely.

## 4. Favicon

Square, at least 8x8 and recommended larger than 48x48 (multiples of 48 are
convenient); BMP, GIF, ICO, PNG, JPEG, PPM, TIFF (listed August 2026); linked
from the homepage with `rel="icon"` (also `shortcut icon`, `apple-touch-icon`,
`apple-touch-icon-precomposed`); the file crawlable by Googlebot-Image and
the homepage by Googlebot; one per hostname; a stable URL. Inappropriate
imagery is replaced with a default icon.

## 5. Sitelinks

Automated. Help them with informative, compact titles and headings, a logical
structure with internal links to important pages, concise anchor text that
matches the target, and no repeated content. Remove a sitelink by `noindex`
or removing the page. The sitelinks search box markup is retired.

## 6. Page experience

Self-assessment: good Core Web Vitals; HTTPS; works well on mobile; ads
don't distract from or interfere with content; no intrusive interstitials;
main content is easy to tell apart from the rest. There is no single
page-experience signal; Core Web Vitals are the part core ranking uses
directly, the rest matters for users. Relevance still wins over experience.

## 7. Core Web Vitals

Good thresholds, measured on real users (field data, 75th percentile):
**LCP ≤ 2.5 s**, **INP < 200 ms**, **CLS < 0.1**. Tools: Search Console's
Core Web Vitals report, PageSpeed Insights, web.dev guides. Common fixes:
preload the hero image and fonts, set width/height on images, inline
critical CSS, avoid late-injected banners, keep main-thread work small.

## 8. Intrusive interstitials

Anything that obscures the content, usually promotional: full-page
interstitials, dialogs over the content, or being sent to a separate consent
page. Allowed: legally required interstitials (age gates, cookie consent),
and small banners that take a small fraction of the screen (the recommended
alternative). For mandatory interstitials, overlay the content so Google can
still index it, verify Googlebot and serve gated content without the gate,
and never redirect every request to one consent page.

## 9. AI Overviews and AI Mode

Eligibility is the same as for a snippet: indexed, snippet-eligible, meeting
the technical requirements. **No special markup, file or AI-specific text
file is needed**; `llms.txt` is not used by Google (June 2026). Both features
may "fan out" into several related searches, so clear, self-contained
passages on specific sub-questions get cited. Recommendations: allow
crawling (including at the CDN), strong internal linking, good page
experience, important information as text (with supporting images and
video), accurate Merchant Center and Business Profile data, Search Console
verified. Controls: Googlebot robots.txt rules; `nosnippet`,
`data-nosnippet`, `max-snippet`, `noindex`. Traffic appears in the
Performance report under "Web" (AI Overviews from August 2025, AI Mode from
June 2025). Google-Extended governs Gemini training and grounding, not these
features. Spam policies apply to AI-surfaced content.

## 10. Preferred Sources

Readers can mark a domain or subdomain (not a subdirectory) as preferred;
its content is then more likely to appear in Top Stories, and in AI Mode and
AI Overviews for that reader, with a "preferred" badge. Optional button:
`https://news.google.com/swg/js/v1/publisher.js` with
`<div google-add-preferred-source-btn>`, or a deeplink to
`https://www.google.com/preferences/source?q=yourdomain`. Framed around news
publishers.

## 11. Search Console

Verify ownership; check the Page indexing report; submit the sitemap and
watch the Sitemaps report; monitor Performance (queries, pages, countries;
AI features included); Core Web Vitals; rich-result status reports; Manual
actions; URL Inspection to see the rendered page, index status, request a
crawl and check robots/noindex. Check monthly or after changes; Google emails
new issues. Guidance on judging third-party SEO tools was added June 2026.

## 12. Sources

- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/search/docs/appearance/snippet
- https://developers.google.com/search/docs/appearance/google-images
- https://developers.google.com/search/docs/appearance/favicon-in-search
- https://developers.google.com/search/docs/appearance/sitelinks
- https://developers.google.com/search/docs/appearance/page-experience
- https://developers.google.com/search/docs/appearance/core-web-vitals
- https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/appearance/preferred-sources
- https://developers.google.com/search/docs/monitor-debug/search-console-start
