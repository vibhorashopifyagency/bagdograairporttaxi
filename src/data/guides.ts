/** Guide pages. The bodies live in src/pages/guides/<slug>.astro; this list
 * feeds the index, llms.txt and each page's metadata. */
export const GUIDES = [
  {
    slug: 'sikkim-permit-guide',
    title: 'Sikkim permit guide: who needs one, where and how',
    description: 'Which places in Sikkim need a permit, the documents accepted, Nathula opening days, and the rules for foreign nationals.',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'bagdogra-airport-transport-guide',
    title: 'Bagdogra Airport to Darjeeling and Gangtok: every way to travel',
    description: 'Private taxi, prepaid counter, app cabs, shared jeep, bus and helicopter compared on price, time and comfort.',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
] as const;

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug)!;
