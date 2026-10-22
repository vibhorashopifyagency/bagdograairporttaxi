import { overlayList } from './published';
import type { Faq } from './routes';

/**
 * Tour packages. Prices are per person with two sharing a room and a private
 * car, the way the national sellers quote, so a traveller can compare like
 * with like. `fromPrice` is the lowest season price.
 *
 * TODO(pre-launch): the owner must confirm every price, hotel category and
 * inclusion below.
 *
 * These are the starting copy: a package changed, added or removed in the
 * dashboard replaces what is written here (see ./published.ts).
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

export const PACKAGES_START: TourPackage[] = [
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
  {
    slug: 'silk-route-zuluk-tour-package',
    short: 'Silk Route Zuluk',
    name: 'Old Silk Route: Zuluk, Nathang and Aritar',
    nights: 4,
    days: 5,
    places: ['Aritar', 'Zuluk', 'Nathang Valley', 'Thambi viewpoint'],
    fromPrice: 13500,
    priceNote: 'per person, two sharing, homestays with all meals',
    bestFor: ['Offbeat', 'Photographers', 'Snow'],
    summary:
      'Four nights on the old trade route between India and Tibet: the Zuluk hairpin loops, sunrise over Kanchenjunga from Thambi viewpoint, the high Nathang valley and Aritar lake. Stays are in village homestays, and the permit and a Sikkim-registered car are included.',
    itinerary: [
      { title: 'Bagdogra to Aritar', detail: 'Pickup at the airport or NJP and a 4.5-hour drive by Rhenock to Aritar. Evening walk around Lampokhari lake.' },
      { title: 'Aritar to Zuluk', detail: 'Permit check at Rongli, then the climb to Zuluk at about 2,900 m. Homestay with dinner.' },
      { title: 'Thambi viewpoint, Nathang and Kupup', detail: 'An early start for sunrise on the 32 hairpin bends, then Nathang valley, Old Baba Mandir and Kupup lake when the road is open.' },
      { title: 'Zuluk to Rongli or Rhenock', detail: 'A slow drive down with stops at Lingtam and the Rongli river. Night in a lower village.' },
      { title: 'Back to Bagdogra', detail: 'Drive back to Bagdogra Airport or NJP.' },
    ],
    includes: [...COMMON_INCLUDES, 'Silk Route protected area permit', 'Sikkim-registered car for Zuluk and Nathang', 'All meals in Zuluk'],
    excludes: COMMON_EXCLUDES,
    faqs: [
      {
        q: 'Do foreigners get a permit for the Silk Route?',
        a: 'No. Zuluk and Nathang are open to Indian citizens only. Foreign travellers can stay in Aritar and Rinchenpong instead.',
      },
      {
        q: 'When does it snow on the Silk Route?',
        a: 'Snow is likely in Nathang and Kupup from late December to March. Roads can close for a day or two after heavy snow, so keep a spare day.',
      },
    ],
    destinations: ['silk-route'],
  },
  {
    slug: 'lava-lolegaon-rishop-tour-package',
    short: 'Lava Lolegaon Rishop',
    name: 'Lava, Lolegaon and Rishop',
    nights: 3,
    days: 4,
    places: ['Lava', 'Lolegaon', 'Rishop', 'Neora Valley'],
    fromPrice: 9500,
    priceNote: 'per person, two sharing, resorts and homestays',
    bestFor: ['Offbeat', 'Families', 'Nature'],
    summary:
      'Three quiet nights in the forests above Kalimpong: the monastery village of Lava on the edge of Neora Valley National Park, the canopy walk at Lolegaon and the Kanchenjunga view from Rishop. Less traffic than Darjeeling and only about 3.5 hours from Bagdogra.',
    itinerary: [
      { title: 'Bagdogra to Lava', detail: 'Pickup and a drive by Sevoke and Gorubathan to Lava. Evening at the Kagyu monastery.' },
      { title: 'Rishop and Neora Valley', detail: 'A short drive and walk to Rishop for the range, then the Neora Valley forest gate and Changey Falls.' },
      { title: 'Lava to Lolegaon', detail: 'Drive to Lolegaon for the Heritage Forest canopy walk and sunrise at Jhandi Dara.' },
      { title: 'Back to Bagdogra', detail: 'Down through Kalimpong to Bagdogra Airport or NJP.' },
    ],
    includes: COMMON_INCLUDES,
    excludes: [...COMMON_EXCLUDES, 'Neora Valley entry permit and guide, where taken'],
    faqs: [
      {
        q: 'Is Neora Valley National Park open all year?',
        a: 'The park closes in the monsoon, usually from mid June to mid September. Lava and Lolegaon stay open, and the forests are at their greenest then.',
      },
    ],
    destinations: ['lava', 'kalimpong'],
  },
  {
    slug: 'kolakham-sittong-offbeat-tour-package',
    short: 'Kolakham Sittong',
    name: 'Kolakham, Sittong and Chatakpur',
    nights: 3,
    days: 4,
    places: ['Kolakham', 'Sittong', 'Chatakpur', 'Changey Falls'],
    fromPrice: 9000,
    priceNote: 'per person, two sharing, homestays with all meals',
    bestFor: ['Offbeat', 'Couples', 'Bird watching'],
    summary:
      'Three villages that most tour sellers skip: Kolakham facing Kanchenjunga, the orange orchards of Sittong and the forest hamlet of Chatakpur inside Senchal sanctuary. Small homestays, home-cooked food and no crowds.',
    itinerary: [
      { title: 'Bagdogra to Kolakham', detail: 'Pickup and a drive through Lava to Kolakham. Evening view of the range from the homestay.' },
      { title: 'Kolakham to Sittong', detail: 'Changey Falls on the way, then Sittong, the orange village. Walk to the Lepcha church and the river.' },
      { title: 'Sittong to Chatakpur', detail: 'A short drive to Chatakpur in Senchal Wildlife Sanctuary for sunset over the range.' },
      { title: 'Back to Bagdogra', detail: 'Down by Kurseong to Bagdogra Airport or NJP.' },
    ],
    includes: [...COMMON_INCLUDES, 'All meals in the homestays'],
    excludes: COMMON_EXCLUDES,
    faqs: [
      {
        q: 'When is the orange season in Sittong?',
        a: 'Oranges ripen from November to January. That is also the clearest season for mountain views.',
      },
    ],
    destinations: ['lava', 'kurseong'],
  },
  {
    slug: 'kalimpong-lava-tour-package',
    short: 'Kalimpong Lava',
    name: 'Kalimpong and Lava',
    nights: 3,
    days: 4,
    places: ['Kalimpong', 'Lava', 'Delo', 'Durpin Monastery'],
    fromPrice: 9900,
    priceNote: 'per person, two sharing, 3-star hotels',
    bestFor: ['Families', 'Short break', 'Seniors'],
    summary:
      'Two nights in Kalimpong and one in Lava. Delo hill, the Durpin monastery, the flower nurseries and the cactus garden, then the forests and monastery of Lava. A gentle trip with short drives.',
    itinerary: [
      { title: 'Bagdogra to Kalimpong', detail: 'Pickup and a 3-hour drive along the Teesta to Kalimpong.' },
      { title: 'Kalimpong sightseeing', detail: 'Delo hill, Durpin monastery, Mangal Dham, a flower nursery and the Pine View cactus garden.' },
      { title: 'Kalimpong to Lava', detail: 'Drive up to Lava. Monastery visit and a walk to the Neora Valley viewpoint.' },
      { title: 'Back to Bagdogra', detail: 'Drive back to Bagdogra Airport or NJP.' },
    ],
    includes: COMMON_INCLUDES,
    excludes: COMMON_EXCLUDES,
    faqs: [
      {
        q: 'Can we add a night in Darjeeling?',
        a: 'Yes. Kalimpong to Darjeeling is about 2.5 hours, so a fourth night in Darjeeling fits easily. Ask for the 4-night version.',
      },
    ],
    destinations: ['kalimpong', 'lava'],
  },
  {
    slug: 'pelling-ravangla-tour-package',
    short: 'Pelling Ravangla',
    name: 'Pelling and Ravangla (West and South Sikkim)',
    nights: 4,
    days: 5,
    places: ['Pelling', 'Ravangla', 'Buddha Park', 'Khecheopalri Lake'],
    fromPrice: 12500,
    priceNote: 'per person, two sharing, 3-star hotels',
    bestFor: ['No permit needed', 'Families', 'Mountain views'],
    summary:
      'Three nights in Pelling, facing Kanchenjunga, and one in Ravangla by the giant Buddha. No Sikkim permit is needed for Indian citizens, so it is the easiest Sikkim trip to plan at short notice.',
    itinerary: [
      { title: 'Bagdogra to Pelling', detail: 'Pickup and a 5-hour drive by Melli and Jorethang to Pelling.' },
      { title: 'Pelling sightseeing', detail: 'The glass skywalk, Pemayangtse Monastery, Rabdentse ruins and Rimbi Falls.' },
      { title: 'Khecheopalri Lake and Kanchenjunga Falls', detail: 'The sacred lake and the falls on the Yuksom road.' },
      { title: 'Pelling to Ravangla', detail: 'Drive to Ravangla. Afternoon at Buddha Park and Ralong monastery.' },
      { title: 'Back to Bagdogra', detail: 'Drive back through Namchi to Bagdogra Airport or NJP.' },
    ],
    includes: COMMON_INCLUDES,
    excludes: [...COMMON_EXCLUDES, 'Skywalk ticket'],
    faqs: [
      {
        q: 'Do we need a permit for Pelling?',
        a: 'Indian citizens do not. Carry a photo ID for the Melli check post. Foreign nationals need the free Sikkim Restricted Area Permit.',
      },
    ],
    destinations: ['pelling'],
  },
  {
    slug: 'north-sikkim-gurudongmar-lachen-lachung-package',
    short: 'Gurudongmar Lachung',
    name: 'North Sikkim with Gurudongmar Lake, Lachen and Lachung',
    nights: 6,
    days: 7,
    places: ['Gangtok', 'Lachen', 'Gurudongmar Lake', 'Lachung', 'Yumthang Valley'],
    fromPrice: 22500,
    priceNote: 'per person, two sharing, best available hotels in the north',
    bestFor: ['Snow', 'Adventure', 'High altitude'],
    summary:
      'The full North Sikkim circuit: Gurudongmar Lake at 5,430 m from Lachen, then Yumthang Valley and Zero Point from Lachung, with two nights in Gangtok to get used to the altitude first. Permits, all meals in the north and a Sikkim-registered car are included.',
    itinerary: [
      { title: 'Bagdogra to Gangtok', detail: 'Pickup and a 5-hour drive to Gangtok.' },
      { title: 'Gangtok sightseeing', detail: 'An easy day at Rumtek, Banjhakri Falls and MG Marg while you adjust to the height.' },
      { title: 'Gangtok to Lachen', detail: 'A 6 to 7-hour drive north by Chungthang to Lachen.' },
      { title: 'Gurudongmar Lake, then Lachung', detail: 'A pre-dawn start for the lake, back to Lachen for lunch, then on to Lachung.' },
      { title: 'Yumthang Valley and Zero Point', detail: 'Zero Point in the morning, the Yumthang hot springs and meadows on the way back.' },
      { title: 'Lachung to Gangtok', detail: 'Drive back to Gangtok.' },
      { title: 'Gangtok to Bagdogra', detail: 'Drive back to Bagdogra Airport or NJP.' },
    ],
    includes: [...COMMON_INCLUDES, 'North Sikkim permit', 'All meals in Lachen and Lachung'],
    excludes: [...COMMON_EXCLUDES, 'Zero Point car supplement where charged locally'],
    faqs: [
      {
        q: 'Is Gurudongmar safe for children and older travellers?',
        a: 'The lake is at 5,430 m, where oxygen is thin. We do not advise it for infants, anyone with heart or lung conditions, or anyone unwell the night before. Lachung and Yumthang suit everyone.',
      },
      {
        q: 'Can foreigners visit Gurudongmar?',
        a: 'No. Gurudongmar is open to Indian citizens only. Foreign nationals can do the Lachung and Yumthang part of the trip.',
      },
    ],
    destinations: ['gangtok', 'north-sikkim'],
  },
  {
    slug: 'darjeeling-gangtok-pelling-tour-package',
    short: 'Darjeeling Gangtok Pelling',
    name: 'Darjeeling, Gangtok and Pelling',
    nights: 7,
    days: 8,
    places: ['Darjeeling', 'Gangtok', 'Tsomgo Lake', 'Pelling'],
    fromPrice: 23500,
    priceNote: 'per person, two sharing, 3-star hotels',
    bestFor: ['First visit', 'Families', 'Complete tour'],
    summary:
      'Seven nights covering the three best-known hill towns: Darjeeling for Tiger Hill and the toy train, Gangtok for Tsomgo Lake, and Pelling for the closest view of Kanchenjunga. One private car from arrival to departure.',
    itinerary: [
      { title: 'Bagdogra to Gangtok', detail: 'Pickup and a 5-hour drive to Gangtok.' },
      { title: 'Tsomgo Lake and Baba Mandir', detail: 'A day trip to the glacial lake. Nathula can be added from Wednesday to Sunday.' },
      { title: 'Gangtok sightseeing', detail: 'Rumtek, Do Drul Chorten, Banjhakri Falls and MG Marg.' },
      { title: 'Gangtok to Pelling', detail: 'Drive by Ravangla and Buddha Park to Pelling.' },
      { title: 'Pelling sightseeing', detail: 'The skywalk, Pemayangtse Monastery, Rabdentse ruins and Khecheopalri Lake.' },
      { title: 'Pelling to Darjeeling', detail: 'Drive by Jorethang to Darjeeling.' },
      { title: 'Darjeeling sightseeing', detail: 'Tiger Hill sunrise, Batasia Loop, the toy train and a tea estate.' },
      { title: 'Darjeeling to Bagdogra', detail: 'Drive back to Bagdogra Airport or NJP.' },
    ],
    includes: [...COMMON_INCLUDES, 'Tsomgo Lake permit and Sikkim-registered car for the lake'],
    excludes: [...COMMON_EXCLUDES, 'Nathula permit and car supplement'],
    faqs: [
      {
        q: 'Can we fit North Sikkim into this trip?',
        a: 'Yes, by swapping Pelling for two nights in Lachung, or by adding two nights. Ask for a quote with your dates.',
      },
    ],
    destinations: ['darjeeling', 'gangtok', 'pelling'],
  },
  {
    slug: 'darjeeling-mirik-kurseong-family-package',
    short: 'Darjeeling Mirik Kurseong',
    name: 'Darjeeling, Mirik and Kurseong family trip',
    nights: 3,
    days: 4,
    places: ['Kurseong', 'Darjeeling', 'Mirik'],
    fromPrice: 9900,
    priceNote: 'per person, two sharing, 3-star hotels',
    bestFor: ['Families', 'Seniors', 'Tea lovers'],
    summary:
      'An easy-paced Darjeeling trip with short drives: a stop in Kurseong on the way up, two nights in Darjeeling, and the lake and tea gardens of Mirik on the way down. Good for grandparents and young children.',
    itinerary: [
      { title: 'Bagdogra to Darjeeling by Kurseong', detail: 'Pickup and a drive up with a tea break in Kurseong and Eagle’s Crag viewpoint.' },
      { title: 'Darjeeling sightseeing', detail: 'Tiger Hill sunrise, Batasia Loop, the zoo and the Himalayan Mountaineering Institute.' },
      { title: 'Darjeeling at leisure', detail: 'The toy train joy ride, the ropeway when running, and the Mall.' },
      { title: 'Darjeeling to Bagdogra by Mirik', detail: 'Mirik lake, the Pashupati border market if you like, and the tea estates on the way down.' },
    ],
    includes: COMMON_INCLUDES,
    excludes: [...COMMON_EXCLUDES, 'Toy train and ropeway tickets'],
    faqs: [
      {
        q: 'Is Tiger Hill suitable for elderly travellers?',
        a: 'The car goes almost to the top, so the walk is short. It is cold before sunrise, so bring warm layers, and you can skip it and rest if preferred.',
      },
    ],
    destinations: ['darjeeling', 'mirik', 'kurseong'],
  },
  {
    slug: 'bhutan-phuentsholing-thimphu-paro-package',
    short: 'Bhutan',
    name: 'Bhutan: Phuentsholing, Thimphu and Paro',
    nights: 5,
    days: 6,
    places: ['Phuentsholing', 'Thimphu', 'Paro', 'Tiger’s Nest'],
    fromPrice: 26500,
    priceNote: 'per person, two sharing, 3-star hotels, SDF extra',
    bestFor: ['International', 'Culture', 'Couples'],
    summary:
      'Bhutan by road from Bagdogra: one night in Phuentsholing for the entry formalities, two in Thimphu and two in Paro with the hike to Tiger’s Nest. Indian citizens need a passport or voter ID. Our car takes you to the border and a Bhutan-registered car and guide take over.',
    itinerary: [
      { title: 'Bagdogra to Phuentsholing', detail: 'Pickup and a 4-hour drive through the Dooars to Jaigaon and the Bhutan Gate.' },
      { title: 'Phuentsholing to Thimphu', detail: 'Entry permit at the immigration office, then a 5-hour drive up to Thimphu.' },
      { title: 'Thimphu sightseeing', detail: 'Buddha Dordenma, the Memorial Chorten, Tashichho Dzong and the weekend market.' },
      { title: 'Thimphu to Paro by Dochula', detail: 'The 108 chortens at Dochula pass, then Paro Rinpung Dzong.' },
      { title: 'Tiger’s Nest hike', detail: 'A 4 to 5-hour round walk to Taktsang monastery. Ponies are available for part of the way up.' },
      { title: 'Paro to Bagdogra', detail: 'A long drive back to Phuentsholing and on to Bagdogra Airport or NJP.' },
    ],
    includes: [
      'Car with driver from Bagdogra to the Bhutan border and back',
      'Bhutan-registered car and licensed guide inside Bhutan',
      'Hotel stay with breakfast and dinner, two sharing a room',
      'Help with the entry permit at Phuentsholing',
      'WhatsApp support from our Bagdogra office every day of the trip',
    ],
    excludes: [
      'Bhutan Sustainable Development Fee (SDF), charged per person per night; we confirm the current amount when you book',
      ...COMMON_EXCLUDES,
    ],
    faqs: [
      {
        q: 'What documents do Indians need for Bhutan?',
        a: 'A valid passport or voter ID for adults, and a birth certificate or passport for children. Aadhaar and PAN cards are not accepted at the border.',
      },
      {
        q: 'Can an Indian taxi drive inside Bhutan?',
        a: 'Indian taxis generally stop at Phuentsholing. Inside Bhutan you travel in a Bhutan-registered car with a licensed guide, which we arrange.',
      },
    ],
    destinations: ['bhutan', 'dooars'],
  },
  {
    slug: 'gangtok-darjeeling-dooars-tour-package',
    short: 'Gangtok Darjeeling Dooars',
    name: 'Gangtok, Darjeeling and Dooars',
    nights: 6,
    days: 7,
    places: ['Gangtok', 'Tsomgo Lake', 'Darjeeling', 'Gorumara'],
    fromPrice: 19900,
    priceNote: 'per person, two sharing, 3-star hotels and a forest resort',
    bestFor: ['Families', 'Wildlife', 'Mountains and jungle'],
    summary:
      'Mountains and jungle in one trip: three nights in Gangtok with Tsomgo Lake, two in Darjeeling, and a final night in the Dooars with a Gorumara safari before your flight from Bagdogra.',
    itinerary: [
      { title: 'Bagdogra to Gangtok', detail: 'Pickup and a 5-hour drive to Gangtok.' },
      { title: 'Tsomgo Lake and Baba Mandir', detail: 'A day trip to the glacial lake.' },
      { title: 'Gangtok sightseeing', detail: 'Rumtek, Banjhakri Falls, Hanuman Tok and MG Marg.' },
      { title: 'Gangtok to Darjeeling', detail: 'A 4.5-hour drive by the Teesta valley.' },
      { title: 'Darjeeling sightseeing', detail: 'Tiger Hill sunrise, Batasia Loop, the zoo and a tea estate.' },
      { title: 'Darjeeling to the Dooars', detail: 'Drive down to Lataguri. Afternoon Gorumara watchtower safari.' },
      { title: 'Dooars to Bagdogra', detail: 'A 2.5-hour drive to Bagdogra Airport or NJP.' },
    ],
    includes: [...COMMON_INCLUDES, 'Tsomgo Lake permit', 'One Gorumara jeep safari'],
    excludes: COMMON_EXCLUDES,
    faqs: [
      {
        q: 'When is the Dooars part of this trip possible?',
        a: 'The national parks close from 16 June to 15 September. In those months we replace the safari with a tea-garden stay or an extra night in Darjeeling.',
      },
    ],
    destinations: ['gangtok', 'darjeeling', 'dooars'],
  },
];

export const PACKAGES = overlayList('package', PACKAGES_START, (p) => p.slug);

export const packageBySlug = (slug: string) => PACKAGES.find((p) => p.slug === slug);
