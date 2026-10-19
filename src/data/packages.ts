import type { Faq } from './routes';

/**
 * Tour packages. Prices are per person with two sharing a room and a private
 * car, the way the national sellers quote, so a traveller can compare like
 * with like. `fromPrice` is the lowest season price.
 *
 * TODO(pre-launch): the owner must confirm every price, hotel category and
 * inclusion below.
 */

export interface TourPackage {
  slug: string;
  name: string;
  /** Short name for titles (keep under ~25 chars). */
  short: string;
  nights: number;
  days: number;
  places: string[];
  fromPrice: number;
  priceNote: string;
  bestFor: string[];
  summary: string;
  itinerary: { title: string; detail: string }[];
  includes: string[];
  excludes: string[];
  faqs: Faq[];
  destinations: string[];
}

const COMMON_INCLUDES = [
  'Private car with driver for the whole trip, from Bagdogra Airport or NJP and back',
  'Hotel stay with breakfast and dinner, two sharing a room',
  'Fuel, tolls, parking and driver allowance',
  'All taxes (GST)',
  'WhatsApp support from our Bagdogra office every day of the trip',
];

const COMMON_EXCLUDES = [
  'Flights and train tickets',
  'Lunch, entry tickets, camera fees and joy rides',
  'Anything not listed under included',
];

export const PACKAGES: TourPackage[] = [
  {
    slug: 'darjeeling-gangtok-tour-package',
    short: 'Darjeeling Gangtok',
    name: 'Darjeeling and Gangtok',
    nights: 5,
    days: 6,
    places: ['Darjeeling', 'Gangtok', 'Tsomgo Lake'],
    fromPrice: 14500,
    priceNote: 'per person, two sharing, 3-star hotels',
    bestFor: ['First visit', 'Families', 'Couples'],
    summary:
      'Five nights split between Darjeeling and Gangtok, with Tiger Hill at sunrise, the toy train, Tsomgo Lake and Baba Mandir. It starts and ends at Bagdogra Airport or NJP with one private car for the whole trip.',
    itinerary: [
      { title: 'Bagdogra to Darjeeling', detail: 'Pickup at the airport or NJP and a 3-hour drive to Darjeeling. Evening free on the Mall.' },
      { title: 'Darjeeling sightseeing', detail: 'Tiger Hill sunrise, Ghum Monastery and Batasia Loop, then the zoo, the Himalayan Mountaineering Institute and a tea estate.' },
      { title: 'Darjeeling to Gangtok', detail: 'A 4.5-hour drive by the Teesta valley to Gangtok. Evening on MG Marg.' },
      { title: 'Tsomgo Lake and Baba Mandir', detail: 'A day trip to the glacial lake at 3,753 m. Nathula can be added from Wednesday to Sunday for Indian citizens.' },
      { title: 'Gangtok sightseeing', detail: 'Rumtek Monastery, Banjhakri Falls, Hanuman Tok and the Flower Exhibition Centre.' },
      { title: 'Gangtok to Bagdogra', detail: 'Drive to Bagdogra Airport or NJP for your onward journey.' },
    ],
    includes: [...COMMON_INCLUDES, 'Tsomgo Lake permit and Sikkim-registered car for the lake'],
    excludes: [...COMMON_EXCLUDES, 'Nathula permit and car supplement (about ₹5,000 per car)'],
    faqs: [
      {
        q: 'Can I start this tour from Gangtok instead?',
        a: 'Yes. Starting in Gangtok and ending in Darjeeling works the same way. Tell us your flight times and we will set the order.',
      },
    ],
    destinations: ['darjeeling', 'gangtok'],
  },
  {
    slug: 'gangtok-tsomgo-nathula-tour-package',
    short: 'Gangtok Nathula',
    name: 'Gangtok with Tsomgo Lake and Nathula',
    nights: 3,
    days: 4,
    places: ['Gangtok', 'Tsomgo Lake', 'Nathula Pass'],
    fromPrice: 9500,
    priceNote: 'per person, two sharing, 3-star hotel',
    bestFor: ['Short break', 'Snow', 'First visit'],
    summary:
      'Three nights in Gangtok with a day at Tsomgo Lake, Baba Mandir and Nathula Pass on the India–China border. It is the shortest trip that includes snow for most of the year.',
    itinerary: [
      { title: 'Bagdogra to Gangtok', detail: 'Pickup at the airport or NJP and a 5-hour drive on NH10. Evening on MG Marg.' },
      { title: 'Tsomgo Lake, Baba Mandir and Nathula', detail: 'A full day at high altitude. Nathula is open Wednesday to Sunday for Indian citizens.' },
      { title: 'Gangtok sightseeing', detail: 'Rumtek Monastery, Do Drul Chorten, Banjhakri Falls and Tashi viewpoint.' },
      { title: 'Gangtok to Bagdogra', detail: 'Drive back to Bagdogra Airport or NJP.' },
    ],
    includes: [...COMMON_INCLUDES, 'Tsomgo and Nathula permits with a Sikkim-registered car'],
    excludes: COMMON_EXCLUDES,
    faqs: [
      {
        q: 'What if Nathula is closed on my day?',
        a: 'Nathula sometimes closes for snow or army orders. If it does, you still visit Tsomgo Lake and Baba Mandir and we refund the Nathula supplement.',
      },
    ],
    destinations: ['gangtok'],
  },
  {
    slug: 'north-sikkim-lachung-yumthang-tour-package',
    short: 'North Sikkim Lachung',
    name: 'Gangtok and North Sikkim (Lachung, Yumthang, Zero Point)',
    nights: 5,
    days: 6,
    places: ['Gangtok', 'Lachung', 'Yumthang Valley', 'Zero Point'],
    fromPrice: 18500,
    priceNote: 'per person, two sharing, best available hotels in Lachung',
    bestFor: ['Snow', 'Adventure', 'Couples'],
    summary:
      'Two nights in Gangtok and two in Lachung, with Yumthang Valley and Zero Point at 4,724 m. Permits, a Sikkim-registered car for the north and all meals in Lachung are included.',
    itinerary: [
      { title: 'Bagdogra to Gangtok', detail: 'Pickup and a 5-hour drive to Gangtok.' },
      { title: 'Gangtok to Lachung', detail: 'A 6-hour drive north past the Seven Sisters Waterfall and Chungthang.' },
      { title: 'Yumthang Valley and Zero Point', detail: 'An early start for Zero Point, then the hot springs and flower meadows of Yumthang.' },
      { title: 'Lachung to Gangtok', detail: 'Drive back to Gangtok with a stop at Bhim Nala Falls.' },
      { title: 'Gangtok sightseeing', detail: 'Rumtek Monastery, Banjhakri Falls and MG Marg.' },
      { title: 'Gangtok to Bagdogra', detail: 'Drive back to Bagdogra Airport or NJP.' },
    ],
    includes: [...COMMON_INCLUDES, 'North Sikkim permit', 'All meals in Lachung'],
    excludes: [...COMMON_EXCLUDES, 'Zero Point car supplement where charged locally'],
    faqs: [
      {
        q: 'Can I add Lachen and Gurudongmar Lake?',
        a: 'Yes, as a 6-night version. Gurudongmar is at 5,430 m, so we only recommend it for healthy adults who have spent two nights at altitude first.',
      },
    ],
    destinations: ['gangtok', 'north-sikkim'],
  },
  {
    slug: 'darjeeling-tour-package',
    short: 'Darjeeling',
    name: 'Darjeeling short break',
    nights: 2,
    days: 3,
    places: ['Darjeeling', 'Tiger Hill', 'Mirik'],
    fromPrice: 7500,
    priceNote: 'per person, two sharing, 3-star hotel',
    bestFor: ['Weekend', 'Families', 'Tea lovers'],
    summary:
      'Two nights in Darjeeling with Tiger Hill at sunrise, the toy train joy ride and a tea estate tour, and Mirik lake on the way back to Bagdogra.',
    itinerary: [
      { title: 'Bagdogra to Darjeeling', detail: 'Pickup at the airport or NJP and a 3-hour drive by Kurseong.' },
      { title: 'Darjeeling sightseeing', detail: 'Tiger Hill sunrise, Batasia Loop, the zoo, a toy train joy ride and Happy Valley Tea Estate.' },
      { title: 'Darjeeling to Bagdogra by Mirik', detail: 'Drive down through Mirik lake and the tea gardens to the airport or NJP.' },
    ],
    includes: COMMON_INCLUDES,
    excludes: [...COMMON_EXCLUDES, 'Toy train joy-ride ticket'],
    faqs: [
      {
        q: 'Is three days enough for Darjeeling?',
        a: 'Yes, for the main sights. Add a night if you want a slower pace or a day trip to Kalimpong.',
      },
    ],
    destinations: ['darjeeling', 'mirik'],
  },
  {
    slug: 'dooars-jungle-safari-tour-package',
    short: 'Dooars Jungle Safari',
    name: 'Dooars jungle safari',
    nights: 2,
    days: 3,
    places: ['Lataguri', 'Gorumara', 'Jaldapara'],
    fromPrice: 8500,
    priceNote: 'per person, two sharing, forest resort',
    bestFor: ['Wildlife', 'Families', 'Weekend'],
    summary:
      'Two nights in the Dooars with a Gorumara watchtower safari and a Jaldapara rhino safari. Lataguri is only 2.5 hours from Bagdogra, so the trip fits a long weekend.',
    itinerary: [
      { title: 'Bagdogra to Lataguri', detail: 'Pickup and a 2.5-hour drive through the tea gardens. Afternoon Gorumara safari.' },
      { title: 'Jaldapara', detail: 'An early drive to Jaldapara for the rhino safari, then Chilapata forest.' },
      { title: 'Lataguri to Bagdogra', detail: 'Samsing and Suntalekhola on the way back, or straight to the airport.' },
    ],
    includes: [...COMMON_INCLUDES, 'One Gorumara and one Jaldapara jeep safari'],
    excludes: COMMON_EXCLUDES,
    faqs: [
      {
        q: 'Can I take this tour in July?',
        a: 'The parks close from 16 June to 15 September. The rest of the year the tour runs every day except that Gorumara safaris do not run on Thursdays.',
      },
    ],
    destinations: ['dooars'],
  },
  {
    slug: 'sikkim-darjeeling-honeymoon-package',
    short: 'Sikkim Honeymoon',
    name: 'Sikkim and Darjeeling honeymoon',
    nights: 6,
    days: 7,
    places: ['Gangtok', 'Pelling', 'Darjeeling'],
    fromPrice: 21500,
    priceNote: 'per person, two sharing, 4-star hotels with room decor',
    bestFor: ['Honeymoon', 'Couples'],
    summary:
      'Six nights across Gangtok, Pelling and Darjeeling in hand-picked hotels with mountain-view rooms, a candle-light dinner and a private Innova Crysta for the whole trip.',
    itinerary: [
      { title: 'Bagdogra to Gangtok', detail: 'Pickup in an Innova Crysta and drive to Gangtok. Welcome cake at the hotel.' },
      { title: 'Tsomgo Lake and Baba Mandir', detail: 'A day in the snow at Tsomgo.' },
      { title: 'Gangtok to Pelling', detail: 'Drive through Ravangla and Buddha Park to Pelling.' },
      { title: 'Pelling sightseeing', detail: 'The skywalk, Pemayangtse Monastery, Rabdentse ruins and Khecheopalri Lake.' },
      { title: 'Pelling to Darjeeling', detail: 'Drive through Jorethang to Darjeeling. Candle-light dinner.' },
      { title: 'Darjeeling sightseeing', detail: 'Tiger Hill sunrise, the toy train and a tea estate.' },
      { title: 'Darjeeling to Bagdogra', detail: 'Drive back to Bagdogra Airport or NJP.' },
    ],
    includes: [...COMMON_INCLUDES, 'Innova Crysta for the whole trip', 'One candle-light dinner and room decoration'],
    excludes: COMMON_EXCLUDES,
    faqs: [
      {
        q: 'Can we swap Pelling for North Sikkim?',
        a: 'Yes. Lachung in place of Pelling adds snow at Zero Point. The price changes slightly; ask for a quote.',
      },
    ],
    destinations: ['gangtok', 'pelling', 'darjeeling'],
  },
];

export const packageBySlug = (slug: string) => PACKAGES.find((p) => p.slug === slug);
