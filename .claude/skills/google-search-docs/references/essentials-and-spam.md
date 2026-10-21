# Search Essentials and the spam policies

Contents: 1. Search Essentials · 2. Technical requirements · 3. Key best
practices · 4. Spam policies · 5. Other demotions · 6. Sources

## 1. Search Essentials

The umbrella document. Three parts: technical requirements (the bare minimum
to be shown), spam policies (what gets a page or site demoted or removed) and
key best practices (what helps). Meeting all of it does not guarantee
crawling, indexing or ranking; appearing in Search costs nothing.

## 2. Technical requirements

1. **Googlebot isn't blocked.** Publicly reachable, not behind a login, not
   disallowed in robots.txt for Googlebot. A robots.txt block prevents
   crawling but not indexing: a blocked URL can still appear (URL-only) if
   it is linked. To keep a page out, use `noindex` and let it be crawled.
2. **The page works.** The server returns HTTP 200. 4xx/5xx pages are not
   indexed; a 200 page whose content looks like an error is a soft 404.
3. **The page has indexable content.** Text in a supported file type, not in
   violation of the spam policies.

## 3. Key best practices

- Create helpful, reliable, people-first content.
- Use the words people search with, in prominent places: title, main
  heading, alt text, link text.
- Make links crawlable (`<a href>`).
- Promote the site where its audience already gathers.
- Follow the specific guidance for images, video, structured data and
  JavaScript.
- Turn on the search features that fit the site (structured data).
- Control what appears with the documented methods (`noindex`, removals).

## 4. Spam policies

Each can lower ranking or remove pages or the whole site, via automated
systems (SpamBrain) or a manual action.

| Policy | Definition |
|---|---|
| Cloaking | Different content to crawlers and users to manipulate ranking or mislead. |
| Doorway abuse | Many similar pages or sites for specific queries or places that funnel to one destination. |
| Expired domain abuse | Buying a lapsed domain and repurposing it to game ranking with low-value content. |
| Hacked content | Content injected without permission: code, pages, hidden text, redirects. |
| Hidden text and link abuse | Text or links placed so people can't see them, to influence ranking. Accordions, tabs, sliders and tooltips are explicitly allowed. |
| Keyword stuffing | Unnatural repetition of words, numbers or location lists. |
| Link spam | Links built mainly to manipulate ranking: bought, sold, excessive swaps, automated. Paid links are fine with `rel="nofollow"` or `rel="sponsored"`. |
| Machine-generated traffic | Automated queries to Google, such as rank scraping. |
| Malicious practices | Malware, unwanted software, back-button hijacking (added April 2026). |
| Misleading functionality | Promising a tool or service and delivering ads or nothing. |
| Scaled content abuse | Mass-producing low-value pages, by AI, scraping or stitching, mainly to rank. |
| Scraping | Republishing others' content with little or no added value, including light rewording. |
| Site reputation abuse | Third-party content hosted to exploit the host's ranking signals. Manual actions outside the EEA; separate ranking inside the EEA (2026). |
| Sneaky redirects | Sending users or crawlers to substantially different content. |
| Thin affiliation | Affiliate pages that reuse merchant descriptions and reviews without original value. |
| User-generated spam | Spam through comments, forums, profiles, uploads. |
| Policy circumvention | Continuing a violation on a new subdomain, directory or site; can cost feature eligibility or broader removal. |
| Scam and fraud | Impersonating businesses, false business information, fake official support. |

Spam policies apply to content surfaced in generative AI responses as well
(confirmed May 2026). Google may act on spam-report submissions (April 2026).

## 5. Other demotions

- **Legal removals**: sites with a high volume of valid copyright,
  defamation, counterfeit or court-ordered removals may have other content
  demoted.
- **Personal-information removals**: sites with many removals tied to
  exploitative practices may be demoted, and the pattern generalised.

## 6. Sources

- https://developers.google.com/search/docs/essentials
- https://developers.google.com/search/docs/essentials/technical
- https://developers.google.com/search/docs/essentials/spam-policies
