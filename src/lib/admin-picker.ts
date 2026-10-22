/**
 * The behaviour shared by the admin's date and time fields (DateField.astro,
 * TimeField.astro): a button that looks like the other boxes and shows the
 * value, a hidden input that carries it to the form, and a popover that opens
 * under the button on a laptop and slides up from the bottom on a phone, as
 * the lists' date range picker does. A popover shows above the popup it was
 * opened from, so a popup's scrolling never cuts it off.
 */
export interface FieldHooks {
  /** The button's text when there is a value. */
  label: (value: string) => string;
  /** Gets the panel ready just before it shows. */
  prepare: () => void;
  /** Once the panel shows: the element to put the keyboard on. */
  focus: () => HTMLElement | null | undefined;
  /** Runs on load and after every change of value. */
  sync?: (value: string) => void;
}

const wide = matchMedia('(min-width: 640px)');
const valueOf = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!;

export function pickerField(root: HTMLElement, hooks: FieldHooks) {
  const input = root.querySelector<HTMLInputElement>('input[type=hidden]')!;
  const trigger = root.querySelector<HTMLButtonElement>('[data-af-trigger]')!;
  const out = root.querySelector<HTMLElement>('[data-af-value]')!;
  const pop = root.querySelector<HTMLElement>('[data-af-pop]')!;
  const error = root.querySelector<HTMLElement>('[data-af-error]');
  const placeholder = root.dataset.placeholder ?? '';

  function show() {
    const v = input.value;
    out.textContent = v ? hooks.label(v) : placeholder;
    out.classList.toggle('is-empty', !v);
    if (v) invalid(false);
    hooks.sync?.(v);
  }
  // A value set from another script (input.value = ...) shows on the button too.
  Object.defineProperty(input, 'value', {
    configurable: true,
    get() { return valueOf.get!.call(this); },
    set(v: string) { valueOf.set!.call(this, v); show(); },
  });

  function invalid(on: boolean) {
    root.classList.toggle('is-invalid', on);
    if (error) error.hidden = !on;
  }

  /** Under the button, flipped above it when there is no room below; a sheet on a phone (CSS). */
  function place() {
    if (!wide.matches) {
      pop.style.removeProperty('top');
      pop.style.removeProperty('left');
      pop.style.removeProperty('min-width');
      return;
    }
    const r = trigger.getBoundingClientRect();
    pop.style.minWidth = `${r.width}px`;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    let top = r.bottom + 6;
    if (top + h > innerHeight - 12) top = r.top - h - 6 >= 12 ? r.top - h - 6 : Math.max(12, innerHeight - h - 12);
    pop.style.left = `${Math.max(12, Math.min(r.left, innerWidth - w - 12))}px`;
    pop.style.top = `${top}px`;
  }

  const onScroll = (e: Event) => {
    if (!pop.contains(e.target as Node)) place();
  };
  pop.addEventListener('beforetoggle', (e) => {
    if ((e as ToggleEvent).newState === 'open') hooks.prepare();
  });
  pop.addEventListener('toggle', (e) => {
    const open = (e as ToggleEvent).newState === 'open';
    root.classList.toggle('is-open', open);
    if (open) {
      place();
      hooks.focus()?.focus({ preventScroll: true });
      // Capture, so scrolling inside a popup moves the panel with its field too.
      addEventListener('scroll', onScroll, { passive: true, capture: true });
      addEventListener('resize', place);
    } else {
      removeEventListener('scroll', onScroll, { capture: true });
      removeEventListener('resize', place);
    }
  });

  // The browser cannot check a hidden input, so a required field checks itself when the form is sent.
  if (root.dataset.required !== undefined) {
    root.closest('form')?.addEventListener('submit', (e) => {
      if (input.value) return;
      e.preventDefault();
      invalid(true);
      trigger.focus();
      trigger.scrollIntoView({ block: 'nearest' });
    });
  }

  /** Stores a value and tells the form; `done` also closes the panel. */
  function set(value: string, done = false) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    if (done) {
      pop.hidePopover();
      trigger.focus({ preventScroll: true });
    }
  }

  window.addEventListener('pageshow', show);
  show();
  return { input, set };
}
