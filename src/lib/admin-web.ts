/**
 * Browser helpers for the website-editing forms (/admin/business/,
 * /admin/fares/, /admin/photos/, /admin/pages/). Imported only from
 * <script> tags; nothing here runs on the server.
 *
 *   - Lists of rows (stops, questions, itinerary days, profile links): a
 *     [data-list="x"] holding [data-row] items and a <template>; buttons
 *     [data-add-row="x"], [data-remove-row], [data-move="up"|"down"].
 *     [data-n] inside a row shows its number.
 *   - Character counters for boxes with data-count="min,max".
 *   - Text boxes that grow to fit their words (wireAutosize, also run by wireLists).
 *   - A form [data-web-form] is marked data-dirty once it changes (its save
 *     bar says so), with a warning before leaving with unsaved changes.
 */

function renumber(list: Element) {
  list.querySelectorAll(':scope > [data-row]').forEach((row, i) => {
    row.querySelectorAll('[data-n]').forEach((el) => (el.textContent = String(i + 1)));
    row.querySelectorAll<HTMLButtonElement>('[data-move="up"]').forEach((b) => (b.disabled = i === 0));
    row.querySelectorAll<HTMLButtonElement>('[data-move="down"]').forEach((b) => (b.disabled = row.nextElementSibling === null || !row.nextElementSibling.matches('[data-row]')));
  });
  const count = list.querySelectorAll(':scope > [data-row]').length;
  const max = Number((list as HTMLElement).dataset.max || 0);
  document.querySelectorAll<HTMLButtonElement>(`[data-add-row="${(list as HTMLElement).dataset.list}"]`).forEach((b) => (b.disabled = max > 0 && count >= max));
}

const changed = (el: Element) => el.closest('form')?.dispatchEvent(new Event('input', { bubbles: true }));

export function wireLists(): void {
  document.querySelectorAll('[data-list]').forEach(renumber);
  wireAutosize();
  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    const add = t.closest<HTMLButtonElement>('[data-add-row]');
    if (add) {
      const list = document.querySelector(`[data-list="${add.dataset.addRow}"]`);
      const tpl = list?.querySelector('template');
      if (!list || !tpl) return;
      const row = (tpl.content.firstElementChild as Element).cloneNode(true) as Element;
      list.insertBefore(row, tpl);
      renumber(list);
      row.querySelector<HTMLElement>('input, textarea, select')?.focus();
      changed(list);
      return;
    }
    const rm = t.closest('[data-remove-row]');
    if (rm) {
      const row = rm.closest('[data-row]');
      const list = row?.parentElement;
      if (!row || !list) return;
      const next = (row.nextElementSibling?.matches('[data-row]') ? row.nextElementSibling : row.previousElementSibling) as HTMLElement | null;
      row.remove();
      renumber(list);
      (next?.querySelector<HTMLElement>('[data-remove-row]') ?? document.querySelector<HTMLElement>(`[data-add-row="${(list as HTMLElement).dataset.list}"]`))?.focus();
      changed(list);
      return;
    }
    const mv = t.closest<HTMLButtonElement>('[data-move]');
    if (mv) {
      const row = mv.closest('[data-row]');
      const list = row?.parentElement;
      if (!row || !list) return;
      if (mv.dataset.move === 'up' && row.previousElementSibling?.matches('[data-row]')) list.insertBefore(row, row.previousElementSibling);
      if (mv.dataset.move === 'down' && row.nextElementSibling?.matches('[data-row]')) list.insertBefore(row.nextElementSibling, row);
      renumber(list);
      mv.focus();
      changed(list);
    }
  });
}

/** Text boxes in website forms grow to fit their words, so nothing is hidden behind a scroll bar. */
export function wireAutosize(): void {
  const fit = (t: HTMLTextAreaElement) => {
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight + 2}px`;
  };
  const all = () => document.querySelectorAll<HTMLTextAreaElement>('form[data-web-form] textarea.wf-input').forEach(fit);
  all();
  document.addEventListener('input', (e) => {
    if (e.target instanceof HTMLTextAreaElement && e.target.matches('textarea.wf-input')) fit(e.target);
  });
  // A row added from a list's template, and boxes that were hidden when the page loaded.
  new MutationObserver(all).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', all);
}

/** Character counters: "52 characters, aim for 30 to 60". */
export function wireCounters(): void {
  const paint = (input: HTMLInputElement | HTMLTextAreaElement) => {
    const out = document.querySelector<HTMLElement>(`[data-count-for="${input.id}"]`);
    const [lo, hi] = (input.dataset.count ?? '').split(',').map(Number);
    if (!out || !hi) return;
    const n = input.value.trim().length;
    out.textContent = `${n} characters, aim for ${lo} to ${hi}`;
    out.classList.toggle('is-off', n < lo || n > hi);
  };
  document.querySelectorAll<HTMLInputElement>('[data-count]').forEach((i) => {
    paint(i);
    i.addEventListener('input', () => paint(i));
  });
}

/** Marks a form data-dirty once something changes (its save bar says so), and asks before leaving unsaved changes. */
export function wireDirty(): void {
  document.querySelectorAll<HTMLFormElement>('form[data-web-form]').forEach((form) => {
    let dirty = false;
    const mark = () => {
      if (dirty) return;
      dirty = true;
      form.dataset.dirty = '';
    };
    form.addEventListener('input', mark);
    form.addEventListener('change', mark);
    form.addEventListener('submit', () => (dirty = false));
    window.addEventListener('beforeunload', (e) => {
      if (dirty) e.preventDefault();
    });
  });
}
