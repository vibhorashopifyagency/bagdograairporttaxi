/**
 * The list under an admin search box as someone types: the first bookings
 * and customers that match, from /admin/api/search/. Arrow keys move through
 * it, Enter opens the highlighted one (or sends the box as usual when none
 * is), Esc closes it. Works on any <input data-typeahead> inside a form.
 * Browser only.
 */
type BookingHit = { ref: string; name: string; trip: string; when: string; status: string; tone: string; href: string };
type CustomerHit = { id: string; name: string; phone: string; href: string };
type Result = { ok: boolean; q: string; bookings: BookingHit[]; customers: CustomerHit[]; bookingTotal: number; customerTotal: number };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** Wraps the matching part of a name or reference in <mark>. */
function mark(text: string, q: string): string {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || i < 0) return esc(text);
  return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
}

export function wireTypeahead(input: HTMLInputElement): void {
  const form = input.form;
  if (!form) return;
  const box = document.createElement('div');
  box.className = 'ta-pop';
  box.id = `${input.id || 'ta'}-list`;
  box.setAttribute('role', 'listbox');
  box.setAttribute('aria-label', 'Matching bookings and customers');
  box.hidden = true;
  form.style.position = 'relative';
  form.append(box);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', box.id);
  input.autocomplete = 'off';

  // Choosing a booking for a quick action (Send itinerary, Record payment ...) opens that popup on it.
  const pick = form.querySelector<HTMLInputElement>('input[name=pick]')?.value ?? '';
  let timer = 0;
  let seq = 0;
  let active = -1;
  const options = () => [...box.querySelectorAll<HTMLAnchorElement>('[role=option]')];

  function setActive(i: number) {
    const list = options();
    active = list.length ? (i + list.length) % list.length : -1;
    list.forEach((o, n) => o.setAttribute('aria-selected', String(n === active)));
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', list[active]!.id);
      list[active]!.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }

  function close() {
    box.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function render(r: Result) {
    const q = r.q;
    const all = `/admin/search/?q=${encodeURIComponent(q)}`;
    let n = 0;
    const opt = (href: string, inner: string) => `<a role="option" id="${box.id}-${n++}" aria-selected="false" class="ta-item" href="${esc(href)}">${inner}</a>`;
    let html = '';
    if (r.bookings.length) {
      html += `<div class="ta-group" role="presentation">Bookings${r.bookingTotal > r.bookings.length ? ` <span>${r.bookingTotal.toLocaleString('en-IN')} in all</span>` : ''}</div>`;
      html += r.bookings
        .map((b) =>
          opt(
            pick ? `${b.href}?do=${encodeURIComponent(pick)}` : b.href,
            `<span class="ta-ref">${mark(b.ref, q)}</span><span class="ta-main"><strong>${mark(b.name, q)}</strong><span>${esc(b.trip)} · ${esc(b.when)}</span></span><span class="a-badge ${esc(b.tone)}">${esc(b.status)}</span>`,
          ),
        )
        .join('');
    }
    if (r.customers.length) {
      html += `<div class="ta-group" role="presentation">Customers${r.customerTotal > r.customers.length ? ` <span>${r.customerTotal.toLocaleString('en-IN')} in all</span>` : ''}</div>`;
      html += r.customers
        .map((c) => opt(c.href, `<span class="ta-avatar" aria-hidden="true">${esc(initials(c.name))}</span><span class="ta-main"><strong>${mark(c.name, q)}</strong><span>${esc(c.phone)}</span></span>`))
        .join('');
    }
    if (!html) html = `<p class="ta-empty">Nothing matches “${esc(q)}”. Try part of a name, the last four digits of a mobile number, or a BAT- reference.</p>`;
    else html += opt(all, `<span class="ta-all">See every result for “${esc(q)}”</span>`);
    box.innerHTML = html;
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
  }

  async function lookup() {
    const q = input.value.trim();
    if (q.length < 2) return close();
    const mine = ++seq;
    try {
      const res = await fetch(`/admin/api/search/?q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const r: Result = await res.json();
      // An older answer arriving after a newer one is dropped.
      if (mine === seq && document.activeElement === input) render(r);
    } catch {
      /* offline: the box still searches when Enter is pressed */
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(lookup, 180);
  });
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2) lookup();
  });
  input.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      options()[active]!.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });
  input.addEventListener('blur', () => setTimeout(() => !box.contains(document.activeElement) && close(), 150));
  // A tap on a result must land before the blur hides the list.
  box.addEventListener('mousedown', (e) => e.preventDefault());
  document.addEventListener('click', (e) => {
    if (!form.contains(e.target as Node)) close();
  });
}
