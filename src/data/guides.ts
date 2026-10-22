import { overlayList } from './published';

/** Guide pages. The bodies live in src/pages/guides/<slug>.astro; this list
 * feeds the index, llms.txt and each page's metadata. `published` is the day
 * the guide first went up and never moves; `updated` is the day its facts
 * last changed (and feeds the sitemap lastmod), so bump it only for a real
 * change. The dashboard can change a guide's title, description and summary
 * (see ./published.ts) but not add or remove one, since each has its own page. */
export const GUIDES_START = [
  {
    slug: 'sikkim-permit-guide',
    title: 'Sikkim permit guide: who needs one, where and how',
    description: 'Which places in Sikkim need a permit, the documents accepted, Nathula opening days, and the rules for foreign nationals.',
    /** The guide's answer-first paragraph, quoted in llms-full.txt. Keep it in step with the page. */
    summary: 'Indian citizens need no permit for Gangtok, Pelling or Namchi. A protected-area permit is needed for Tsomgo Lake, Nathula, Zuluk and North Sikkim, and it is arranged by a registered tour operator with a photo ID and two photos per person. Foreign nationals need a free Restricted Area Permit for all of Sikkim.',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'bagdogra-airport-transport-guide',
    title: 'Bagdogra Airport to Darjeeling and Gangtok: every way to travel',
    description: 'Private taxi, prepaid counter, app cabs, shared jeep, bus and helicopter compared on price, time and comfort.',
    /** The guide's answer-first paragraph, quoted in llms-full.txt. Keep it in step with the page. */
    summary: 'The fastest door-to-door way from Bagdogra Airport to the hills is a private taxi: about 3 hours to Darjeeling and about 5 to Gangtok at a fixed fare. Shared jeeps from Siliguri cost far less a seat but are slower and stop at town stands. App cabs serve the plains only.',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'best-time-to-visit-darjeeling-sikkim',
    title: 'Best time to visit Darjeeling and Sikkim, month by month',
    description: 'Weather, Kanchenjunga views, snow, crowds and what is open each month in Darjeeling, Gangtok, North Sikkim and the Dooars, with monsoon advice.',
    /** The guide's answer-first paragraph, quoted in llms-full.txt. Keep it in step with the page. */
    summary: 'The best time to visit Darjeeling and Sikkim is October to December for clear Kanchenjunga views, and March to May for spring flowers and mild weather. Come in January to March for snow at Tsomgo and Nathula. Avoid late June to September if you can, as rain and landslides block hill roads.',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'nathula-pass-guide',
    title: 'Nathula Pass guide: permit, opening days and what to expect',
    description: 'How to visit Nathula Pass from Gangtok: the permit, opening days, timings, Tsomgo Lake and Baba Mandir, altitude sickness and what to wear.',
    /** The guide's answer-first paragraph, quoted in llms-full.txt. Keep it in step with the page. */
    summary: 'Nathula Pass is the India–China border pass at 4,310 m, about 56 km from Gangtok. It is open only to Indian citizens, usually from Wednesday to Sunday, with a permit applied for a day ahead through a registered operator. Most visitors combine it with Tsomgo Lake and Baba Mandir in one day trip from Gangtok.',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'offbeat-places-north-bengal-sikkim',
    title: 'Offbeat places in North Bengal and Sikkim near Bagdogra',
    description: 'Quiet hill villages near Bagdogra Airport, from Lava and Rishop to Sittong, Zuluk and Okhrey, with drive times and why each is worth a night.',
    /** The guide's answer-first paragraph, quoted in llms-full.txt. Keep it in step with the page. */
    summary: 'The best offbeat places near Bagdogra Airport are Sittong, Chatakpur and Tinchuley (about 3 to 3.5 hours away), Lava, Lolegaon, Rishop and Kolakham (about 4 to 4.5 hours), and Zuluk on the Silk Route (about 6 to 7 hours, permit needed). Most have homestays, quiet forest and views of Kanchenjunga without the crowds of Darjeeling and Gangtok.',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
] as const;

export const GUIDES = overlayList('guide', GUIDES_START, (g) => g.slug, { fixed: true });

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug)!;
