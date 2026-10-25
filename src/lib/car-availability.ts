/**
 * The booking form's calendar check (client, 25 Oct 2026). Once a date and a
 * time are chosen, it asks /api/availability/ which car types are fully
 * booked for that trip (src/server/calendar.ts) and greys those cars out,
 * each with a WhatsApp link to ask the office, which may still bring in an
 * outside car.
 *
 * If the chosen car is one of them, the nearest free car that seats the
 * party is chosen instead (a bigger one first) and a note under the cars
 * says so, so the fare on the page always belongs to a car that can be
 * booked; when the first choice is free again it comes back. When every car
 * is booked, nothing is greyed out and the note points to WhatsApp: a
 * request sent anyway still reaches the office, which sees the clash on the
 * booking.
 *
 * It reads the form by field names only (kind, route, package, date, time,
 * pax, vehicle), so the page's own script needs nothing from it. Any failure
 * leaves every car open.
 */

export type AvailabilityWords = {
  /** On a booked car. */
  carFull: string;
  /** The WhatsApp link under it. */
  carAsk: string;
  /** Under the cars, when the chosen car was booked: {car} and {next}. */
  carFullNote: string;
  /** Under the cars, when every car is booked. */
  allFull: string;
  /** The WhatsApp message: {car}, {trip}, {date}, {time}. */
  carFullWa: string;
};

type Options = {
  /** The office's WhatsApp number, digits only. */
  whatsapp: string;
  words: AvailabilityWords;
  /** Car names by key. */
  vehicles: Record<string, string>;
  /** Seats by key: a car chosen in place of a booked one must fit the party. */
  seats?: Record<string, number>;
  /** The route or tour as people say it, for the WhatsApp message. */
  tripName: () => string;
};

const fill = (words: string, values: Record<string, string>) => words.replace(/\{([a-zA-Z]+)\}/g, (all, k: string) => values[k] ?? all);
const dayFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });

export function watchAvailability(form: HTMLFormElement, opts: Options): void {
  const radios = [...form.querySelectorAll<HTMLInputElement>('input[name=vehicle]')];
  if (!radios.length) return;
  const val = (n: string) => ((form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
  const kind = () => (form.querySelector<HTMLInputElement>('input[name=kind]:checked')?.value ?? 'taxi') as 'taxi' | 'package';

  const note = document.createElement('p');
  note.className = 'car-note';
  note.setAttribute('role', 'status');
  note.hidden = true;
  (radios[0]!.closest('fieldset') ?? radios[0]!.parentElement!).append(note);

  /** The car the visitor chose themselves, to go back to when it is free again. */
  let wanted = radios.find((r) => r.checked)?.value ?? '';
  let full = new Set<string>();
  let asked = '';
  let timer = 0;
  let pending: AbortController | null = null;

  const waLink = (car: string) => {
    const date = val('date');
    const text = fill(opts.words.carFullWa, {
      car: opts.vehicles[car] ?? car,
      trip: opts.tripName(),
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? dayFmt.format(new Date(`${date}T00:00:00Z`)) : date,
      time: val('time'),
    });
    return `https://wa.me/${opts.whatsapp}?text=${encodeURIComponent(text)}`;
  };

  function choose(r: HTMLInputElement) {
    r.checked = true;
    // The page's own script works the fare out again on change.
    r.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function draw() {
    const every = full.size > 0 && radios.every((r) => full.has(r.value));
    for (const r of radios) {
      const label = r.closest('label') ?? r.parentElement!;
      const isFull = full.has(r.value) && !every;
      label.toggleAttribute('data-full', isFull);
      r.disabled = isFull;
      let tag = label.querySelector<HTMLElement>('[data-full-tag]');
      if (isFull) {
        if (!tag) {
          tag = document.createElement('span');
          tag.className = 'car-full';
          tag.dataset.fullTag = '';
          tag.append(document.createElement('strong'), document.createTextNode(' '), Object.assign(document.createElement('a'), { target: '_blank', rel: 'noopener' }));
          label.append(tag);
        }
        tag.querySelector('strong')!.textContent = opts.words.carFull;
        Object.assign(tag.querySelector('a')!, { href: waLink(r.value), textContent: opts.words.carAsk });
      } else tag?.remove();
    }
    const current = radios.find((r) => r.checked);
    const want = radios.find((r) => r.value === wanted);
    note.hidden = true;
    note.replaceChildren();
    if (every) {
      note.append(opts.words.allFull, ' ', Object.assign(document.createElement('a'), { href: waLink(current?.value ?? wanted), target: '_blank', rel: 'noopener', textContent: opts.words.carAsk }));
      note.hidden = false;
      return;
    }
    if (want && full.has(want.value)) {
      // The nearest free car that seats the party, a bigger one first.
      const i = radios.indexOf(want);
      const pax = Math.max(1, parseInt(val('pax'), 10) || 1);
      const order = [...radios.slice(i + 1), ...radios.slice(0, i).reverse()].filter((r) => !full.has(r.value));
      const next = order.find((r) => (opts.seats?.[r.value] ?? Infinity) >= pax) ?? order[0];
      if (next && current !== next) choose(next);
      if (next) {
        note.append(
          fill(opts.words.carFullNote, { car: opts.vehicles[want.value] ?? want.value, next: opts.vehicles[next.value] ?? next.value }),
          ' ',
          Object.assign(document.createElement('a'), { href: waLink(want.value), target: '_blank', rel: 'noopener', textContent: opts.words.carAsk }),
        );
        note.hidden = false;
      }
    } else if (want && current !== want) choose(want);
  }

  async function check() {
    const date = val('date');
    const time = val('time');
    const trip = kind() === 'package' ? `package=${encodeURIComponent(val('package'))}` : `route=${encodeURIComponent(val('route'))}`;
    const key = date && time ? `${trip}&date=${date}&time=${time}` : '';
    if (key === asked) return;
    asked = key;
    pending?.abort();
    if (!key) {
      full = new Set();
      draw();
      return;
    }
    pending = new AbortController();
    try {
      const r = await fetch(`/api/availability/?${key}`, { signal: pending.signal });
      const body = r.ok ? ((await r.json()) as { full?: string[] }) : null;
      if (asked !== key) return;
      full = new Set(body?.full ?? []);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      full = new Set();
    }
    draw();
  }

  const soon = () => {
    clearTimeout(timer);
    timer = window.setTimeout(check, 250);
  };
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    // A car the visitor picks is their choice; one this script picks is not.
    if (t.name === 'vehicle') {
      if (e.isTrusted) wanted = t.value;
      if (e.isTrusted) draw();
      return;
    }
    soon();
  });
  form.addEventListener('input', (e) => {
    if ((e.target as HTMLInputElement).name !== 'vehicle') soon();
  });
  // A car chosen from a link (?vehicle=) is set before this runs.
  wanted = radios.find((r) => r.checked)?.value ?? wanted;
  soon();
}
