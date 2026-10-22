import { overlayList } from './published';
import type { Faq } from './routes';

export interface Destination {
  slug: string;
  name: string;
  /** Name for titles. */
  short?: string | null;
  region: string;
  altitude: string;
  /** Answer-first opening paragraph. */
  summary: string;
  bestTime: string;
  daysNeeded: string;
  highlights: { name: string; note: string }[];
  howToReach: string;
  permit?: string | null;
  faqs: Faq[];
  geo: { lat: number; lng: number };
  /** A photo from the library chosen in the dashboard; otherwise src/lib/photos.ts picks one. */
  photo?: string | null;
}

/** The starting copy: a destination changed, added or removed in the dashboard replaces it (see ./published.ts). */
export const DESTINATIONS_START: Destination[] = [
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
  {
    slug: 'silk-route',
    name: 'Silk Route and Zuluk',
    region: 'East Sikkim',
    altitude: 'About 1,400 to 4,000 m',
    summary:
      'The Silk Route is a circuit through Aritar, Zuluk, Nathang valley and Kupup in East Sikkim, along part of the old trade road to Tibet. It is about 6 to 7 hours from Bagdogra Airport, needs a protected-area permit, and is best done over 2 to 3 nights.',
    bestTime: 'October to December for clear views, and March to May for rhododendrons. Snow is likely from December to March and can close the higher road.',
    daysNeeded: '2 to 3 nights',
    highlights: [
      { name: 'Zuluk zig-zag road', note: 'The famous loops of road, best seen from Thambi viewpoint at sunrise.' },
      { name: 'Aritar Lake', note: 'A forest lake on the way in, with no permit needed.' },
      { name: 'Nathang valley', note: 'A high, open valley that turns white after snow.' },
      { name: 'Kupup and Elephant Lake', note: 'A lake said to be shaped like an elephant, near the highest point of the circuit.' },
      { name: 'Old Baba Mandir', note: 'The original shrine to Baba Harbhajan Singh.' },
      { name: 'Kanchenjunga sunrise', note: 'Wide views of the range from Thambi and Lungthung on clear mornings.' },
    ],
    howToReach:
      'Drive about 6 to 7 hours from Bagdogra by Rangpo and Rongli, or start from Gangtok. Most trips spend the first night at Aritar or Zuluk.',
    permit:
      'Indian citizens need a protected-area permit for Zuluk and beyond, issued at Rongli through a registered operator with a photo ID and photos. Foreign nationals face tighter rules, so check with us first.',
    faqs: [
      {
        q: 'Is the Silk Route suitable for elderly travellers?',
        a: 'Zuluk is fine for most people, but Nathang and Kupup are close to 4,000 m. Older travellers and anyone with heart or lung problems should ask a doctor and take it slowly.',
      },
      {
        q: 'Are there hotels on the Silk Route?',
        a: 'Mostly simple homestays with shared meals. Rooms are basic but warm, and we book them as part of the trip.',
      },
    ],
    geo: { lat: 27.2526, lng: 88.7772 },
  },
  {
    slug: 'lava',
    name: 'Lava and Kolakham',
    short: 'Lava',
    region: 'Kalimpong district, West Bengal',
    altitude: 'About 2,000 to 2,350 m',
    summary:
      'Lava is a forest village about 4 hours from Bagdogra Airport, at the edge of Neora Valley National Park. Kolakham, a short drive below, has homestays facing Kanchenjunga. Together with Lolegaon and Rishop they make a quiet 2 to 3 night trip.',
    bestTime: 'October to May. Neora Valley National Park is usually closed in the monsoon, and the roads are slippery then.',
    daysNeeded: '2 to 3 days',
    highlights: [
      { name: 'Neora Valley National Park', note: 'Dense forest with red pandas and many birds. Entry is from Lava.' },
      { name: 'Lava Monastery', note: 'A large Kagyu monastery above the village.' },
      { name: 'Changey Falls', note: 'A tall waterfall near Kolakham, reached by a walk of steps.' },
      { name: 'Kolakham viewpoint', note: 'Kanchenjunga at sunrise from the homestay terraces.' },
      { name: 'Rishop and Tiffindara', note: 'A short walk to a viewpoint over the range.' },
      { name: 'Lolegaon', note: 'Pine forest walks about an hour away.' },
    ],
    howToReach:
      'Drive about 4 hours from Bagdogra or NJP through Sevoke and Gorubathan, or about 2 hours from Kalimpong.',
    faqs: [
      {
        q: 'Is Lava good for birdwatching?',
        a: 'Yes. The forest around Lava and Neora Valley is one of the best birding areas in North Bengal, especially from March to May.',
      },
      {
        q: 'Do I need a permit for Lava or Kolakham?',
        a: 'No. Lava and Kolakham need no permit. Neora Valley National Park needs an entry ticket, and it is usually closed in the monsoon.',
      },
    ],
    geo: { lat: 27.0867, lng: 88.6638 },
  },
  {
    slug: 'bhutan',
    name: 'Phuentsholing and Bhutan',
    short: 'Bhutan',
    region: 'Bhutan border, via Jaigaon',
    altitude: 'About 300 m (Phuentsholing) to 2,300 m (Thimphu)',
    summary:
      'Phuentsholing is the Bhutan border town opposite Jaigaon, about 4.5 to 5 hours from Bagdogra Airport. Indian citizens enter with a passport or voter ID and get an entry permit there for Thimphu and Paro. Indian taxis generally go only to Phuentsholing, and a Bhutan-registered car is used beyond.',
    bestTime: 'October to December for clear skies, and March to May for spring. The monsoon brings heavy rain to Phuentsholing.',
    daysNeeded: '1 day for Phuentsholing, 5 to 6 days for Thimphu and Paro',
    highlights: [
      { name: 'Bhutan Gate and Zangtho Pelri Lhakhang', note: 'The border gate and a temple in the centre of Phuentsholing.' },
      { name: 'Crocodile breeding centre', note: 'A short stop in Phuentsholing town.' },
      { name: 'Buddha Dordenma, Thimphu', note: 'A giant seated Buddha above the capital.' },
      { name: 'Dochula Pass', note: 'Memorial chortens and Himalayan views between Thimphu and Punakha.' },
      { name: 'Punakha Dzong', note: 'A fortress at the meeting of two rivers.' },
      { name: 'Tiger’s Nest (Paro Taktsang)', note: 'A cliffside monastery reached by a steep half-day hike.' },
    ],
    howToReach:
      'Drive about 4.5 to 5 hours from Bagdogra to Jaigaon through the Dooars. Cross on foot or by car to Phuentsholing, complete immigration, and continue in a Bhutan-registered vehicle.',
    faqs: [
      {
        q: 'What documents do Indians need for Bhutan?',
        a: 'A valid passport or voter ID for adults, and a passport or birth certificate for children. A Sustainable Development Fee is charged per person per night, and we confirm the current amount with every booking.',
      },
      {
        q: 'Can I take an Indian taxi into Bhutan?',
        a: 'Indian taxis generally go only as far as Phuentsholing. For Thimphu, Paro and beyond, a Bhutan-registered car and driver is used, which we arrange.',
      },
    ],
    geo: { lat: 26.8516, lng: 89.3884 },
  },
];

export const DESTINATIONS = overlayList('destination', DESTINATIONS_START, (d) => d.slug);

export const destinationBySlug = (slug: string) => DESTINATIONS.find((d) => d.slug === slug);
