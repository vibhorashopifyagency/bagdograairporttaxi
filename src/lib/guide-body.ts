/**
 * The main text of a travel guide, as blocks the admin can edit in the
 * dashboard: headings, paragraphs, small grey notes, bullet lists and tables.
 * Every piece of text uses the page-words marks (src/lib/rich-text.ts):
 * [a link](/taxi/), **bold** and fill-ins such as {updated} or
 * {darjeelingSedan}, so a fare quoted in a guide follows the fare chart.
 *
 * Pure functions: the build renders guides with them, the dashboard checks
 * saves with them and previews blocks with them. The guide layout gives each
 * heading its id and builds the contents list from them.
 */
import { linksIn, wordsToHtml, wordsToText, type WordVars } from './rich-text';

export type GuideBlock =
  | { type: 'heading'; text: string }
  | { type: 'text'; text: string }
  | { type: 'note'; text: string }
  | { type: 'list'; items: string[] }
  /** `head` is the header row (empty for none); with `rowHeads` each row's first cell is its label. */
  | { type: 'table'; head: string[]; rows: string[][]; rowHeads?: boolean };

export type GuideBlockType = GuideBlock['type'];

/** What each kind of block is called in the dashboard. */
export const BLOCK_NAMES: Record<GuideBlockType, string> = {
  heading: 'Heading',
  text: 'Paragraph',
  note: 'Small note',
  list: 'Bullet list',
  table: 'Table',
};

/** The guide's blocks as HTML, in the markup the guide pages have always had. */
export function guideBodyHtml(blocks: readonly GuideBlock[], vars: WordVars): string {
  const w = (s: string) => wordsToHtml(s, vars);
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'heading':
          return `<h2>${w(b.text)}</h2>`;
        case 'text':
          return `<p>${w(b.text)}</p>`;
        case 'note':
          return `<p class="text-sm text-muted">${w(b.text)}</p>`;
        case 'list':
          return `<ul>${b.items.map((x) => `<li>${w(x)}</li>`).join('')}</ul>`;
        case 'table': {
          const head = b.head.length ? `<thead><tr>${b.head.map((x) => `<th>${w(x)}</th>`).join('')}</tr></thead>` : '';
          const rows = b.rows.map((r) => `<tr>${r.map((x, i) => (b.rowHeads && i === 0 ? `<th>${w(x)}</th>` : `<td>${w(x)}</td>`)).join('')}</tr>`).join('');
          return `<div class="table-scroll not-prose"><table>${head}<tbody>${rows}</tbody></table></div>`;
        }
      }
    })
    .join('');
}

/** Every piece of text in the blocks, for checks (fill-ins, links) and search. */
export function blockTexts(blocks: readonly GuideBlock[]): string[] {
  return blocks.flatMap((b) => (b.type === 'list' ? b.items : b.type === 'table' ? [...b.head, ...b.rows.flat()] : [b.text]));
}

/** Every link in the blocks: where it goes. */
export const blockLinks = (blocks: readonly GuideBlock[]) => blockTexts(blocks).flatMap((t) => linksIn(t).map((l) => l.href));

/** The blocks as plain text, one block per line, for reading time and llms-full.txt. */
export function guideBodyText(blocks: readonly GuideBlock[], vars: WordVars): string {
  const t = (s: string) => wordsToText(s, vars);
  return blocks
    .map((b) => {
      if (b.type === 'heading') return `## ${t(b.text)}`;
      if (b.type === 'list') return b.items.map((x) => `- ${t(x)}`).join('\n');
      if (b.type === 'table') return [b.head, ...b.rows].filter((r) => r.length).map((r) => r.map(t).join(' | ')).join('\n');
      return t(b.text);
    })
    .join('\n\n');
}
