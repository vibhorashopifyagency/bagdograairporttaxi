/** Guide pages. The bodies live in src/pages/guides/<slug>.astro; this list
 * feeds the index, llms.txt and each page's metadata. `published` is the day
 * the guide first went up and never moves; `updated` is the day its facts
 * last changed (and feeds the sitemap lastmod), so bump it only for a real
 * change. */
export const GUIDES = [
  {
    slug: 'sikkim-permit-guide',
    title: 'Sikkim permit guide: who needs one, where and how',
    description: 'Which places in Sikkim need a permit, the documents accepted, Nathula opening days, and the rules for foreign nationals.',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'bagdogra-airport-transport-guide',
    title: 'Bagdogra Airport to Darjeeling and Gangtok: every way to travel',
    description: 'Private taxi, prepaid counter, app cabs, shared jeep, bus and helicopter compared on price, time and comfort.',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'best-time-to-visit-darjeeling-sikkim',
    title: 'Best time to visit Darjeeling and Sikkim, month by month',
    description: 'Weather, Kanchenjunga views, snow, crowds and what is open each month in Darjeeling, Gangtok, North Sikkim and the Dooars, with monsoon advice.',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'nathula-pass-guide',
    title: 'Nathula Pass guide: permit, opening days and what to expect',
    description: 'How to visit Nathula Pass from Gangtok: the permit, opening days, timings, Tsomgo Lake and Baba Mandir, altitude sickness and what to wear.',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'offbeat-places-north-bengal-sikkim',
    title: 'Offbeat places in North Bengal and Sikkim near Bagdogra',
    description: 'Quiet hill villages near Bagdogra Airport, from Lava and Rishop to Sittong, Zuluk and Okhrey, with drive times and why each is worth a night.',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
] as const;

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug)!;
