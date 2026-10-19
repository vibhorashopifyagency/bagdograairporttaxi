import type { Faq } from './routes';

export interface Destination {
  slug: string;
  name: string;
  /** Name for titles. */
  short?: string;
  region: string;
  altitude: string;
  /** Answer-first opening paragraph. */
  summary: string;
  bestTime: string;
  daysNeeded: string;
  highlights: { name: string; note: string }[];
  howToReach: string;
  permit?: string;
  faqs: Faq[];
  geo: { lat: number; lng: number };
}

export const DESTINATIONS: Destination[] = [
  {
    slug: 'darjeeling',
    name: 'Darjeeling',
    region: 'Darjeeling district, West Bengal',
    altitude: '2,042 m',
    summary:
      'Darjeeling is a hill town 70 km from Bagdogra Airport, famous for its tea estates, the UNESCO-listed toy train and sunrise over Kanchenjunga from Tiger Hill. Two to three days covers the main sights.',
    bestTime: 'March to May for clear spring days, and October to December for the sharpest mountain views.',
    daysNeeded: '2 to 3 days',
    highlights: [
      { name: 'Tiger Hill sunrise', note: 'Leave the hotel at 4 am to see first light on Kanchenjunga.' },
      { name: 'Darjeeling Himalayan Railway', note: 'A two-hour joy ride loops through Batasia to Ghum.' },
      { name: 'Batasia Loop and War Memorial', note: 'A spiral of track with a wide view of the range.' },
      { name: 'Happy Valley Tea Estate', note: 'Tours of a working factory, closed Mondays.' },
      { name: 'Padmaja Naidu Himalayan Zoological Park', note: 'Red pandas and snow leopards, closed Thursdays.' },
      { name: 'Peace Pagoda and Japanese Temple', note: 'A quiet walk above the town.' },
    ],
    howToReach:
      'Fly to Bagdogra (IXB) or take a train to New Jalpaiguri (NJP), then drive 3 to 3.5 hours by Rohini Road and Kurseong.',
    faqs: [
      {
        q: 'How many days are enough for Darjeeling?',
        a: 'Two full days covers Tiger Hill, the toy train, the zoo and a tea estate. Add a third day for Mirik or a slower pace.',
      },
      {
        q: 'Does it snow in Darjeeling?',
        a: 'Light snow falls on a few days in late December to February, more often at Tiger Hill and Sandakphu than in town.',
      },
    ],
    geo: { lat: 27.041, lng: 88.2663 },
  },
  {
    slug: 'gangtok',
    name: 'Gangtok',
    region: 'East Sikkim',
    altitude: '1,650 m',
    summary:
      'Gangtok is the capital of Sikkim, 125 km from Bagdogra Airport, and the base for trips to Tsomgo Lake, Nathula Pass and North Sikkim. Plan at least three nights to include one high-altitude day trip.',
    bestTime: 'March to May for rhododendrons and October to December for clear views. Tsomgo Lake freezes from January to March.',
    daysNeeded: '3 to 4 days',
    highlights: [
      { name: 'MG Marg', note: 'The car-free main street, best in the evening.' },
      { name: 'Tsomgo Lake and Baba Mandir', note: 'A glacial lake at 3,753 m, permit needed.' },
      { name: 'Nathula Pass', note: 'The India–China border pass, open Wednesday to Sunday for Indian citizens.' },
      { name: 'Rumtek Monastery', note: 'The largest monastery in Sikkim, 24 km away.' },
      { name: 'Banjhakri Falls', note: 'A family-friendly park with a waterfall.' },
      { name: 'Hanuman Tok and Ganesh Tok', note: 'Viewpoints over the town and the range.' },
    ],
    howToReach:
      'Fly to Bagdogra (IXB) and drive 4.5 to 5 hours on NH10, or take the Sikkim government helicopter to Gangtok (Pakyong) when it is running.',
    permit:
      'Indian citizens need no permit for Gangtok itself. Tsomgo Lake, Nathula and North Sikkim need a protected-area permit, which we arrange with two passport photos and a photo ID.',
    faqs: [
      {
        q: 'Is Nathula open every day?',
        a: 'No. Nathula is usually open to Indian citizens from Wednesday to Sunday, and closes after heavy snow. Foreign nationals cannot visit Nathula.',
      },
      {
        q: 'Can I hire a taxi in Gangtok for sightseeing?',
        a: 'Yes. Local sightseeing uses Sikkim-registered cars. Our Gangtok packages include them, with the same driver for the whole stay where possible.',
      },
    ],
    geo: { lat: 27.3314, lng: 88.6138 },
  },
  {
    slug: 'kalimpong',
    name: 'Kalimpong',
    region: 'Kalimpong district, West Bengal',
    altitude: '1,250 m',
    summary:
      'Kalimpong is a quiet hill town 75 km from Bagdogra Airport, known for its flower nurseries, monasteries and views over the Teesta valley. It is a calm base for Lava, Lolegaon and the Silk Route.',
    bestTime: 'October to May. The monsoon months bring heavy rain and occasional road blocks.',
    daysNeeded: '1 to 2 days',
    highlights: [
      { name: 'Deolo Hill', note: 'The highest point in town with paragliding.' },
      { name: 'Durpin Monastery', note: 'Zang Dhok Palri Phodang, with views to Kanchenjunga.' },
      { name: 'Cactus and flower nurseries', note: 'Kalimpong exports orchids and cacti across India.' },
      { name: 'Lava and Lolegaon', note: 'Forest villages an hour or two away.' },
    ],
    howToReach: 'Drive 3 hours from Bagdogra or NJP along the Teesta through Sevoke and Teesta Bazaar.',
    faqs: [
      {
        q: 'Is Kalimpong better than Darjeeling?',
        a: 'Kalimpong is quieter, warmer and less crowded. Darjeeling has more famous sights. Many visitors spend one night in each.',
      },
    ],
    geo: { lat: 27.0594, lng: 88.4695 },
  },
  {
    slug: 'mirik',
    name: 'Mirik',
    region: 'Darjeeling district, West Bengal',
    altitude: '1,495 m',
    summary:
      'Mirik is a small lake town 52 km from Bagdogra Airport, the nearest hill station to the airport and the easiest drive. Sumendu Lake, orange orchards and tea gardens make it a good half-day or overnight stop.',
    bestTime: 'October to April.',
    daysNeeded: 'Half a day to 1 night',
    highlights: [
      { name: 'Sumendu Lake', note: 'Boating and a footbridge walk.' },
      { name: 'Bokar Monastery', note: 'A hilltop monastery above the lake.' },
      { name: 'Tea gardens of Gopaldhara and Thurbo', note: 'On the road from Dudhia.' },
    ],
    howToReach: 'Drive about 2 hours from Bagdogra by Dudhia, or 1.5 hours from Darjeeling.',
    faqs: [
      {
        q: 'Can I visit Mirik on the way to Darjeeling?',
        a: 'Yes. It adds about 1.5 hours. Ask for the Mirik route when you book your Darjeeling taxi.',
      },
    ],
    geo: { lat: 26.887, lng: 88.187 },
  },
  {
    slug: 'kurseong',
    name: 'Kurseong',
    region: 'Darjeeling district, West Bengal',
    altitude: '1,458 m',
    summary:
      'Kurseong, the "land of white orchids", is 45 km from Bagdogra Airport on the road to Darjeeling. It is a quiet tea-estate town with heritage schools and the toy train running through its main street.',
    bestTime: 'October to May.',
    daysNeeded: '1 day',
    highlights: [
      { name: 'Makaibari Tea Estate', note: 'One of the oldest tea estates in Darjeeling.' },
      { name: 'Eagle’s Crag', note: 'A viewpoint over the plains.' },
      { name: 'Netaji Subhas Bose Museum (Giddapahar)', note: 'The Bose family home.' },
    ],
    howToReach: 'Drive 1.5 to 2 hours from Bagdogra by Rohini Road.',
    faqs: [
      {
        q: 'Is Kurseong a day trip from Siliguri?',
        a: 'Yes. A day trip with 4 hours in Kurseong suits a sedan fare of about ₹2,800 for the round trip. Ask when you book.',
      },
    ],
    geo: { lat: 26.8806, lng: 88.2775 },
  },
  {
    slug: 'pelling',
    name: 'Pelling',
    region: 'West Sikkim (Gyalshing district)',
    altitude: '2,150 m',
    summary:
      'Pelling is a West Sikkim town 145 km from Bagdogra Airport with the closest, clearest view of Kanchenjunga in the state. The glass skywalk, Pemayangtse Monastery and Rabdentse ruins are within a short drive.',
    bestTime: 'October to May, with the clearest mountain views from October to December.',
    daysNeeded: '2 days',
    highlights: [
      { name: 'Pelling Skywalk and Chenrezig statue', note: 'India’s first glass skywalk.' },
      { name: 'Pemayangtse Monastery', note: 'One of the oldest monasteries in Sikkim.' },
      { name: 'Rabdentse Ruins', note: 'The second capital of the Sikkim kingdom.' },
      { name: 'Khecheopalri Lake', note: 'A sacred lake an hour away.' },
      { name: 'Kanchenjunga Falls', note: 'A roadside waterfall on the Yuksom road.' },
    ],
    howToReach: 'Drive 5.5 to 6 hours from Bagdogra through Melli, Jorethang and Legship, or 5 hours from Gangtok through Ravangla.',
    faqs: [
      {
        q: 'Do Indians need a permit for Pelling?',
        a: 'No. Pelling and most of West Sikkim need no permit for Indian citizens.',
      },
    ],
    geo: { lat: 27.3, lng: 88.24 },
  },
  {
    slug: 'north-sikkim',
    name: 'North Sikkim (Lachung, Lachen, Yumthang)',
    short: 'North Sikkim',
    region: 'Mangan district, Sikkim',
    altitude: '2,700 to 5,430 m',
    summary:
      'North Sikkim covers Lachung, Yumthang Valley, Zero Point, Lachen and Gurudongmar Lake, 5 to 6 hours north of Gangtok. Every trip needs a protected-area permit and a Sikkim-registered vehicle, and most visitors book a 2-night package from Gangtok.',
    bestTime: 'March to May for rhododendrons in Yumthang, and October to December for clear skies. Snow is likely from December to March.',
    daysNeeded: '2 to 3 nights from Gangtok',
    highlights: [
      { name: 'Yumthang Valley', note: 'The "valley of flowers" at 3,564 m.' },
      { name: 'Zero Point (Yumesamdong)', note: 'Snow most of the year, at 4,724 m.' },
      { name: 'Gurudongmar Lake', note: 'One of the highest lakes in the world at 5,430 m.' },
      { name: 'Seven Sisters Waterfall', note: 'On the road from Gangtok.' },
    ],
    howToReach: 'Reach Gangtok first, then go north by permit with a Sikkim-registered vehicle. Lachung is about 5 to 6 hours from Gangtok.',
    permit:
      'Indian citizens need a protected-area permit, arranged by the tour operator with ID and photos. Foreign nationals can visit some areas in groups of two or more with a Restricted Area Permit and cannot visit Gurudongmar.',
    faqs: [
      {
        q: 'Is North Sikkim safe for children and older travellers?',
        a: 'Lachung is fine for most travellers. Gurudongmar and Zero Point are above 4,500 m, so altitude sickness is a real risk for small children, older travellers and anyone with heart or lung conditions. Ask your doctor first.',
      },
    ],
    geo: { lat: 27.6894, lng: 88.7449 },
  },
  {
    slug: 'dooars',
    name: 'Dooars (Gorumara, Jaldapara)',
    short: 'Dooars',
    region: 'Jalpaiguri and Alipurduar districts, West Bengal',
    altitude: '90 to 300 m',
    summary:
      'The Dooars are the forest and tea-garden plains east of Bagdogra, home to Gorumara and Jaldapara national parks. Lataguri is 2.5 hours from the airport and the best base for jungle safaris and rhino sightings.',
    bestTime: 'October to mid-June. The national parks close from mid-June to mid-September.',
    daysNeeded: '2 to 3 days',
    highlights: [
      { name: 'Gorumara National Park', note: 'Watchtower safaris for gaur, elephants and rhinos.' },
      { name: 'Jaldapara National Park', note: 'The largest population of one-horned rhinos in West Bengal.' },
      { name: 'Samsing and Suntalekhola', note: 'Forest villages at the foothills.' },
      { name: 'Buxa Fort and Jayanti', note: 'History and a riverbed walk near the Bhutan border.' },
    ],
    howToReach: 'Drive 2.5 hours from Bagdogra to Lataguri or about 4 hours to Jaldapara.',
    faqs: [
      {
        q: 'When are Gorumara and Jaldapara closed?',
        a: 'Both parks close from 16 June to 15 September for the monsoon. Gorumara safaris also do not run on Thursdays.',
      },
    ],
    geo: { lat: 26.7183, lng: 88.7636 },
  },
];

export const destinationBySlug = (slug: string) => DESTINATIONS.find((d) => d.slug === slug);
