/**
 * The behaviour shared by the site's date and time fields (DatePicker.astro,
 * TimePicker.astro): a button that shows the value, a panel that floats
 * below it, and a hidden input that carries the value to the form. Each
 * field supplies its own panel; this opens and closes it the same way.
 */
export interface PickerHooks {
  /** The button's text when there is a value. */
  label: (value: string) => string;
  /** Gets the panel ready just before it shows; returns the element to focus. */
  prepare: () => HTMLElement | null | undefined;
  /** Runs on load and after every change of value. */
  sync?: (value: string) => void;
}

export function picker(root: HTMLElement, hooks: PickerHooks) {
  const input = root.querySelector<HTMLInputElement>('input[type=hidden]')!;
  const btn = root.querySelector<HTMLButtonElement>('.pk-trigger')!;
  const out = root.querySelector<HTMLElement>('.pk-value')!;
  const pop = root.querySelector<HTMLElement>('.pk-pop')!;
  const placeholder = root.dataset.placeholder!;

  function show() {
    const v = input.value;
    out.textContent = v ? hooks.label(v) : placeholder;
    out.classList.toggle('is-empty', !v);
    hooks.sync?.(v);
  }

  /** Lines the panel up with the field's left edge, or its right edge when that would run off the screen. */
  function place() {
    pop.classList.remove('pk-end');
    if (pop.getBoundingClientRect().right > document.documentElement.clientWidth - 8) pop.classList.add('pk-end');
  }

  function open() {
    const target = hooks.prepare();
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    place();
    target?.focus({ preventScroll: true });
    pop.scrollIntoView({ block: 'nearest' });
  }

  function close(refocus: boolean) {
    if (pop.hidden) return;
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (refocus) btn.focus();
  }

  /** Stores a value and tells the form; `done` also closes the panel. */
  function set(value: string, done = false) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    show();
    if (done) close(true);
  }

  btn.addEventListener('click', () => (pop.hidden ? open() : close(false)));
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && pop.hidden) { e.preventDefault(); open(); }
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); close(true); }
  });
  root.addEventListener('focusout', (e) => {
    const to = e.relatedTarget as Node | null;
    if (to && !root.contains(to)) close(false);
  });
  document.addEventListener('pointerdown', (e) => {
    if (!root.contains(e.target as Node)) close(false);
  });
  // A value restored by the browser (back button, form restore) is shown too.
  window.addEventListener('pageshow', show);
  show();

  return { input, set, close };
}

/**
 * Arrow-key movement inside a grid of buttons, so one Tab reaches the grid
 * and the arrows walk it. Only the button with tabindex 0 is in the Tab order.
 */
export function rove(list: HTMLElement[], cols: number) {
  list.forEach((b, i) => b.addEventListener('keydown', (e) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols, Home: -i, End: list.length - 1 - i };
    const to = e.key in step ? list[i + step[e.key]] : undefined;
    if (!to) return;
    e.preventDefault();
    list.forEach((x) => (x.tabIndex = x === to ? 0 : -1));
    to.focus();
  }));
}
