# Content quality: helpful content, E-E-A-T, generative AI, ranking systems

Contents: 1. The self-assessment · 2. Who, How, Why · 3. E-E-A-T · 4.
Generative-AI content · 5. The named ranking systems · 6. Sources

Use this file when judging a page by eye. None of it is checkable by script.

## 1. The self-assessment

Google publishes these as questions to ask of your own pages. Answering
"no" to several is the signal that a page is written for search engines.

**Content and quality**
- Does the content provide original information, reporting, research or
  analysis?
- Does it provide a substantial, complete or comprehensive description of
  the topic?
- Does it provide insightful analysis or interesting information beyond the
  obvious?
- Where it draws on other sources, does it add real value and originality
  rather than copying or rewording them?
- Does the main heading or page title give a descriptive, helpful summary,
  without exaggeration or shock?
- Is this a page you would bookmark, share with a friend or recommend?
- Would you expect to see it in or referenced by a printed magazine,
  encyclopedia or book?
- Does it provide substantial value compared with other pages in the
  results?
- Any spelling or stylistic issues? Does it look sloppy or hastily produced?
- Is it mass-produced or outsourced across many creators or sites so that
  individual pages get little care?

**Expertise**
- Does it build trust through clear sourcing, evidence of expertise, and
  information about the author or site (author page, About page)?
- Would someone researching the site see it as trusted or recognised as an
  authority on its topic?
- Is it written or reviewed by an expert or enthusiast who demonstrably
  knows the topic well?
- Any easily verified factual errors?

**People-first**
- Does the site have an existing or intended audience that would find the
  content useful if they came directly?
- Does it show first-hand expertise and depth (actually visiting the place,
  using the product)?
- Does the site have a primary purpose or focus?
- Will the reader leave feeling they learned enough to achieve their goal,
  and that the experience was satisfying?

**Warning signs of search-engine-first content**
- Made primarily to attract search visits.
- Lots of content on many topics hoping some ranks.
- Extensive automation to produce content across topics.
- Mainly summarising what others say without adding value.
- Trending topics the site would not otherwise cover.
- Readers feel they need to search again for better information.
- Writing to a word count because "Google prefers" one (it doesn't; there is
  no minimum or maximum).
- Entering a niche without real expertise to capture traffic.
- Promising an answer to a question with no confirmed answer.
- Changing page dates to look fresh when nothing substantial changed.
- Adding or removing content mainly to seem fresh.

## 2. Who, How, Why

- **Who** created it: bylines where readers expect them, leading to
  information about the author; no fabricated identities.
- **How** it was made: where automation or AI contributed, make that evident
  (a disclosure, a note on method) when a reader would want to know.
- **Why**: made to help people, not to attract search visits.

## 3. E-E-A-T

Experience, Expertise, Authoritativeness, Trustworthiness. Not a direct
ranking factor; Google's systems look for a mix of signals that align with
it, and weight it more on YMYL topics (health, money, safety, society).
**Trust is the most important part.** Main-content quality is judged on
effort, originality, talent or skill, and accuracy; attribution does not
substitute for original effort. Page experience should be good across many
aspects, not one or two.

## 4. Generative-AI content

- AI is useful for research and for structuring original content; the
  output must still meet Search Essentials and the spam policies.
- Generating many pages with AI without adding value is scaled content
  abuse.
- Models predict words rather than retrieve facts, so fact-check everything
  AI produced before publishing: body text, titles, meta descriptions,
  structured data, alt text.
- Give readers context on how automation was used. For ecommerce,
  AI-generated images need IPTC `TrainedAlgorithmicMedia` metadata, and
  AI-generated product titles and descriptions must be labelled.
- The Search Quality Rater Guidelines sections on scaled content abuse
  (4.6.5) and low-effort, low-originality content (4.6.6) describe what
  raters flag; rater scores do not directly change ranking.

## 5. The named ranking systems

Useful for explaining *why* a recommendation exists.

| System | What it does |
|---|---|
| BERT, neural matching, RankBrain, MUM | Language understanding: intent, concepts, synonyms; pages rank without the exact words. |
| Passage ranking | Scores individual sections, so a clear, self-contained passage can rank on its own. |
| Freshness systems | Prefer newer content where the query wants it (events, releases). |
| Original content systems | Favour original reporting and primary pages over pages that cite them. |
| Reviews system | Rewards insightful, first-hand review content. |
| Link analysis and PageRank | Links as a signal of topic and usefulness (one of many). |
| Deduplication | Hides near-identical results. |
| Site diversity | Usually at most two results per site; subdomains count as the root domain. |
| Exact-match domain | Limits credit for a domain made of the query words. |
| Reliable information systems | Elevate authoritative pages, demote low quality, add advisories when confidence is low. |
| Removal-based demotion | Demotes sites with high volumes of valid removals. |
| Spam detection (SpamBrain) | Identifies spam content and behaviour. |
| Crisis information, local news | Situational. |

Retired into core ranking: Helpful content system (March 2024), Panda
(2015), Penguin (2016), Hummingbird (2013). Core updates now roll
continuously in smaller steps (documented December 2025).

## 6. Sources

- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- https://developers.google.com/search/docs/appearance/ranking-systems-guide
- https://developers.google.com/search/docs/appearance/core-updates
