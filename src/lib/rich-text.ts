/**
 * Page words (src/data/page-text.ts) are plain text with a few small marks,
 * so the admin can keep a link, a bold phrase or a live number without
 * writing HTML:
 *   [words](/taxi/)  a link: a page on this site, https://, mailto: or tel:
 *   **words**        bold
 *   *words*          the accent colour where the design has one (the home
 *                    page's lime word), italic anywhere else
 *   {fromFare}       a fill-in, written in at build from the fares, the
 *                    policies or the business details, so it never goes stale
 * Pure functions: the build renders pages with them, the dashboard checks
 * saves with them and the page editor previews drafts with them.
 */

/** A fill-in's value: as plain text (titles, search text) and, when it differs, as HTML (a <time>, a link). */
export interface WordVar {
  text: string;
  html?: string;
  /** What it is, for the dashboard's list of fill-ins: "Lowest airport fare". */
  label?: string;
}
export type WordVars = Record<string, WordVar>;

/** Escapes text the same way Astro escapes {expressions}, so an unedited page comes out byte for byte as before. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>'"]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === "'" ? '&#39;' : '&quot;'));
}

const TOKEN = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;
const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
/** Where a link may go: a page here, a secure site, an email or a phone number. */
export const SAFE_HREF = /^(\/[a-zA-Z0-9\-._~/?#=&%]*|https:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:\+?[0-9]+)$/;

/** The fill-ins a text uses, without braces. */
export function tokensIn(src: string): string[] {
  return [...src.matchAll(TOKEN)].map((m) => m[1]);
}

/** The links a text holds, with where each goes. */
export function linksIn(src: string): { words: string; href: string }[] {
  return [...src.matchAll(LINK)].map((m) => ({ words: m[1], href: m[2] }));
}

/** The words as HTML: escaped, marks turned into tags, fill-ins written in. An unknown fill-in stays as typed. */
export function wordsToHtml(src: string, vars: WordVars = {}, opts: { accent?: string } = {}): string {
  let out = escapeHtml(src);
  // Links first, so a bold or accent mark inside the words still works. An unsafe address is left as typed.
  out = out.replace(LINK, (all, words: string, href: string) => {
    const raw = href.replace(/&amp;/g, '&');
    return SAFE_HREF.test(raw) ? `<a href="${href}">${words}</a>` : all;
  });
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, (_, pre: string, words: string) => `${pre}${opts.accent ? `<span class="${opts.accent}">${words}</span>` : `<em>${words}</em>`}`);
  return out.replace(TOKEN, (all, name: string) => {
    const v = vars[name];
    return v ? (v.html ?? escapeHtml(v.text)) : all;
  });
}

/** The words as plain text, for a page title or search description: fill-ins written in, marks dropped. */
export function wordsToText(src: string, vars: WordVars = {}): string {
  return src
    .replace(LINK, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    .replace(TOKEN, (all, name: string) => vars[name]?.text ?? all);
}
