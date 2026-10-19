import type { VehicleKey } from './vehicles';

/**
 * Every fare on the site is read from this file. Route pages, the fare chart,
 * the booking form, JSON-LD offers and llms.txt all use it, so a fare can
 * never disagree with itself across pages (the research found that on four
 * competitor sites).
 *
 * Fares are one-way, per vehicle, in INR, and include fuel, driver allowance,
 * tolls, parking and GST. They exclude the night charge and permit fees,
 * which are stated beside every table.
 *
 * TODO(pre-launch): the owner must confirm every number below. They are set
 * inside the market ranges the 19 Oct 2026 competitor research recorded.
 */

export type Fares = Record<VehicleKey, number>;

export interface Faq {
  q: string;
  a: string;
}

export interface Route {
  slug: string;
  from: string;
  to: string;
  /** Short names used in headings and the fare chart. */
  fromShort: string;
  toShort: string;
  km: number;
  duration: string;
  /** ISO 8601 duration for schema. */
  durationIso: string;
  via: string;
  fares: Fares;
  /** The 2–3 sentence answer that opens the page. Answer engines quote this. */
  summary: string;
  stops: string[];
  tips: string[];
  faqs: Faq[];
  destination?: string;
  returnSlug?: string;
  group: 'Darjeeling hills' | 'Sikkim' | 'Siliguri and NJP' | 'Dooars' | 'Nepal and Bhutan borders';
}

export const ROUTES: Route[] = [
  {
    slug: 'bagdogra-airport-to-darjeeling-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Darjeeling',
    fromShort: 'Bagdogra Airport',
    toShort: 'Darjeeling',
    km: 70,
    duration: '3 to 3.5 hours',
    durationIso: 'PT3H15M',
    via: 'Rohini Road or Pankhabari Road to Kurseong, then Hill Cart Road through Ghum',
    fares: { sedan: 2800, suv: 3500, innova: 4200, traveller: 6500 },
    summary:
      'A private taxi from Bagdogra Airport to Darjeeling costs ₹2,800 in a sedan and ₹4,200 in an Innova Crysta, one way, with tolls and parking included. The 70 km drive takes about 3 to 3.5 hours by Rohini Road and Kurseong.',
    stops: ['Rohini tea gardens', 'Kurseong (tea and snacks)', 'Ghum Monastery', 'Batasia Loop'],
    tips: [
      'Afternoon fog above Kurseong slows traffic from November to February, so flights landing after 3 pm reach Darjeeling after dark.',
      'Hotels on the Mall and Chowrasta cannot be reached by car. Your driver stops at the nearest point and a porter can carry bags.',
      'Ask for the Rohini Road if anyone in your group gets car-sick. It has fewer hairpin bends than Pankhabari Road.',
    ],
    faqs: [
      {
        q: 'Is the prepaid taxi counter at Bagdogra cheaper than booking ahead?',
        a: 'The counter publishes fixed fares but you cannot choose the car or driver, and there is a queue after each flight lands. Booking ahead gets a named driver waiting at arrivals with your name on a board, and the fare is fixed before you fly.',
      },
      {
        q: 'Can I stop at Kurseong or Mirik on the way?',
        a: 'A short stop at Kurseong is included. A detour through Mirik adds about 1.5 hours and ₹800 to the sedan fare. Mention it when you book.',
      },
    ],
    destination: 'darjeeling',
    returnSlug: 'darjeeling-to-bagdogra-airport-taxi',
    group: 'Darjeeling hills',
  },
  {
    slug: 'bagdogra-airport-to-gangtok-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Gangtok',
    fromShort: 'Bagdogra Airport',
    toShort: 'Gangtok',
    km: 125,
    duration: '4.5 to 5 hours',
    durationIso: 'PT4H45M',
    via: 'Sevoke and the Coronation Bridge, then NH10 along the Teesta through Rangpo and Singtam',
    fares: { sedan: 3500, suv: 4500, innova: 5500, traveller: 8500 },
    summary:
      'A private taxi from Bagdogra Airport to Gangtok costs ₹3,500 in a sedan and ₹5,500 in an Innova Crysta, one way. The 125 km drive on NH10 takes 4.5 to 5 hours, and the same car takes you all the way to your Gangtok hotel with no change of vehicle at the Sikkim border.',
    stops: ['Sevoke Kali Mandir and Coronation Bridge', 'Teesta riverside at Melli', 'Rangpo (Sikkim entry check post)', 'Singtam'],
    tips: [
      'Carry a photo ID for every adult. Indian visitors need no permit for Gangtok, but the Rangpo check post may ask to see ID.',
      'Foreign nationals need a Restricted Area Permit, issued free at the Rangpo check post or in advance online. See our Sikkim permit guide.',
      'NH10 is sometimes closed by landslides in the monsoon (June to September). We track road status and will reroute through Kalimpong and Lava if needed, at no extra charge.',
    ],
    faqs: [
      {
        q: 'Do I have to change cars at the Sikkim border?',
        a: 'No. Our West Bengal registered taxis are permitted to drive into Gangtok, so you stay in one car from the airport to your hotel. Only trips beyond Gangtok to Tsomgo Lake, Nathula or North Sikkim need a Sikkim-registered vehicle, which we arrange for tours.',
      },
      {
        q: 'Is NH10 to Gangtok open today?',
        a: 'NH10 is open on most days. During heavy monsoon rain it can close for a few hours. Message us on WhatsApp before you fly and we will tell you the current status and the route your driver will take.',
      },
    ],
    destination: 'gangtok',
    returnSlug: 'gangtok-to-bagdogra-airport-taxi',
    group: 'Sikkim',
  },
  {
    slug: 'bagdogra-airport-to-kalimpong-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Kalimpong',
    fromShort: 'Bagdogra Airport',
    toShort: 'Kalimpong',
    km: 75,
    duration: '3 hours',
    durationIso: 'PT3H',
    via: 'Sevoke, NH10 along the Teesta to Teesta Bazaar, then the climb to Kalimpong',
    fares: { sedan: 3000, suv: 3800, innova: 4500, traveller: 7000 },
    summary:
      'A private taxi from Bagdogra Airport to Kalimpong costs ₹3,000 in a sedan and ₹4,500 in an Innova Crysta, one way. The 75 km drive along the Teesta river takes about 3 hours.',
    stops: ['Coronation Bridge at Sevoke', 'Teesta river viewpoint at Teesta Bazaar', 'Delo viewpoint (on request)'],
    tips: [
      'Kalimpong works well as a quieter base than Darjeeling, with easy day trips to Lava, Lolegaon and Rishop.',
      'Ask for a stop at the Teesta and Rangeet confluence view point at Triveni if you are travelling in daylight.',
    ],
    faqs: [
      {
        q: 'Can I go to Kalimpong and then on to Gangtok in the same car?',
        a: 'Yes. Book a multi-stop trip and we will price it as one journey. Kalimpong to Gangtok is about 3 hours more.',
      },
    ],
    destination: 'kalimpong',
    group: 'Darjeeling hills',
  },
  {
    slug: 'bagdogra-airport-to-mirik-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Mirik',
    fromShort: 'Bagdogra Airport',
    toShort: 'Mirik',
    km: 52,
    duration: '2 hours',
    durationIso: 'PT2H',
    via: 'Matigara and Dudhia, then the Mirik road through the tea gardens',
    fares: { sedan: 2200, suv: 2800, innova: 3400, traveller: 5500 },
    summary:
      'A private taxi from Bagdogra Airport to Mirik costs ₹2,200 in a sedan and ₹3,400 in an Innova Crysta, one way. The 52 km drive by Dudhia and the tea estates takes about 2 hours.',
    stops: ['Balason river at Dudhia', 'Gopaldhara and Thurbo tea gardens', 'Sumendu Lake, Mirik'],
    tips: [
      'Mirik is the gentlest hill drive from the airport and a good choice for elderly travellers.',
      'You can continue from Mirik to Darjeeling the same day. It adds about 1.5 hours.',
    ],
    faqs: [
      {
        q: 'Can I do Mirik as a day trip from Siliguri?',
        a: 'Yes. A Mirik day trip from Siliguri or Bagdogra in a sedan, with 4 hours at the lake, costs ₹3,200. Ask for the day-trip fare when you book.',
      },
    ],
    destination: 'mirik',
    group: 'Darjeeling hills',
  },
  {
    slug: 'bagdogra-airport-to-kurseong-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Kurseong',
    fromShort: 'Bagdogra Airport',
    toShort: 'Kurseong',
    km: 45,
    duration: '1.5 to 2 hours',
    durationIso: 'PT1H45M',
    via: 'Rohini Road through the tea gardens',
    fares: { sedan: 2000, suv: 2500, innova: 3000, traveller: 5000 },
    summary:
      'A private taxi from Bagdogra Airport to Kurseong costs ₹2,000 in a sedan and ₹3,000 in an Innova Crysta, one way. The 45 km drive up Rohini Road takes 1.5 to 2 hours.',
    stops: ['Rohini tea gardens', 'Eagle’s Crag viewpoint', 'Kurseong station on the toy train line'],
    tips: [
      'Kurseong is the closest hill stop to the airport. It suits a late-afternoon arrival when Darjeeling would mean driving in fog.',
    ],
    faqs: [
      {
        q: 'Is Kurseong worth staying in instead of Darjeeling?',
        a: 'For a quieter stay among tea estates, yes. Darjeeling is 30 km and about an hour further up the same road, so a day trip is easy.',
      },
    ],
    destination: 'kurseong',
    group: 'Darjeeling hills',
  },
  {
    slug: 'bagdogra-airport-to-siliguri-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Siliguri',
    fromShort: 'Bagdogra Airport',
    toShort: 'Siliguri',
    km: 14,
    duration: '30 to 40 minutes',
    durationIso: 'PT35M',
    via: 'NH31 (Bagdogra to Siliguri highway) through Matigara',
    fares: { sedan: 600, suv: 800, innova: 1000, traveller: 1800 },
    summary:
      'A private taxi from Bagdogra Airport to Siliguri costs ₹600 in a sedan and ₹1,000 in an Innova Crysta, to any hotel in the city. The 14 km drive takes 30 to 40 minutes.',
    stops: ['City Centre and Matigara', 'Sevoke Road', 'Hill Cart Road and Siliguri Junction'],
    tips: [
      'App cabs also run this short plains route. Booking with us fixes the fare before you land and the driver waits if your flight is late.',
    ],
    faqs: [
      {
        q: 'Is there a night charge from Bagdogra to Siliguri?',
        a: 'Yes, a flat ₹300 for pickups between 10 pm and 6 am, the same as on every route.',
      },
    ],
    group: 'Siliguri and NJP',
  },
  {
    slug: 'bagdogra-airport-to-njp-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'New Jalpaiguri station (NJP)',
    fromShort: 'Bagdogra Airport',
    toShort: 'NJP station',
    km: 22,
    duration: '45 minutes',
    durationIso: 'PT45M',
    via: 'NH31 through Siliguri town',
    fares: { sedan: 700, suv: 900, innova: 1200, traveller: 2000 },
    summary:
      'A private taxi from Bagdogra Airport to New Jalpaiguri (NJP) railway station costs ₹700 in a sedan and ₹1,200 in an Innova Crysta. The 22 km drive takes about 45 minutes, longer in evening traffic through Siliguri.',
    stops: ['Siliguri Junction', 'NJP station main entrance'],
    tips: ['Allow 90 minutes between landing and your train in the evening rush, from 5 pm to 8 pm.'],
    faqs: [
      {
        q: 'Do you pick up from NJP station too?',
        a: 'Yes. We meet trains at NJP with a name board at the main exit and track late-running trains the same way we track flights.',
      },
    ],
    group: 'Siliguri and NJP',
  },
  {
    slug: 'bagdogra-airport-to-pelling-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Pelling',
    fromShort: 'Bagdogra Airport',
    toShort: 'Pelling',
    km: 145,
    duration: '5.5 to 6 hours',
    durationIso: 'PT5H45M',
    via: 'Sevoke, NH10 to Melli, then Jorethang, Legship and Geyzing',
    fares: { sedan: 5500, suv: 6500, innova: 7500, traveller: 11000 },
    summary:
      'A private taxi from Bagdogra Airport to Pelling costs ₹5,500 in a sedan and ₹7,500 in an Innova Crysta, one way. The 145 km drive through Jorethang takes 5.5 to 6 hours.',
    stops: ['Melli bridge on the Teesta', 'Jorethang', 'Legship hot springs', 'Geyzing'],
    tips: [
      'Book a flight that lands before noon. The last two hours are on narrow mountain roads that are best driven in daylight.',
      'Pelling has the closest view of Kanchenjunga in Sikkim. Ask for a hotel with a north-facing room.',
    ],
    faqs: [
      {
        q: 'Can I do Pelling and Gangtok on one trip?',
        a: 'Yes. Pelling to Gangtok is about 5 hours through Ravangla. Our West Sikkim and Gangtok tour package covers both with the same car.',
      },
    ],
    destination: 'pelling',
    group: 'Sikkim',
  },
  {
    slug: 'bagdogra-airport-to-namchi-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Namchi',
    fromShort: 'Bagdogra Airport',
    toShort: 'Namchi',
    km: 100,
    duration: '4 hours',
    durationIso: 'PT4H',
    via: 'Sevoke and NH10 to Melli, then up through Majitar to Namchi',
    fares: { sedan: 4000, suv: 5000, innova: 6000, traveller: 9000 },
    summary:
      'A private taxi from Bagdogra Airport to Namchi costs ₹4,000 in a sedan and ₹6,000 in an Innova Crysta, one way. The 100 km drive by Melli takes about 4 hours.',
    stops: ['Melli', 'Char Dham at Solophok', 'Samdruptse statue'],
    tips: ['Namchi sits lower than Gangtok and stays milder in winter, which suits families with small children.'],
    faqs: [
      {
        q: 'Can I visit Char Dham and Samdruptse on the way?',
        a: 'Yes. Both are on the way into Namchi. Allow 2 extra hours and we add ₹500 for waiting time.',
      },
    ],
    group: 'Sikkim',
  },
  {
    slug: 'bagdogra-airport-to-ravangla-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Ravangla',
    fromShort: 'Bagdogra Airport',
    toShort: 'Ravangla',
    km: 120,
    duration: '4.5 to 5 hours',
    durationIso: 'PT4H45M',
    via: 'Melli, Namchi and Damthang',
    fares: { sedan: 4500, suv: 5500, innova: 6500, traveller: 9500 },
    summary:
      'A private taxi from Bagdogra Airport to Ravangla costs ₹4,500 in a sedan and ₹6,500 in an Innova Crysta, one way. The 120 km drive through Namchi takes 4.5 to 5 hours.',
    stops: ['Namchi', 'Temi Tea Garden (on request)', 'Buddha Park, Ravangla'],
    tips: ['Ravangla is a natural halfway stop between Gangtok and Pelling if you are touring all of Sikkim.'],
    faqs: [
      {
        q: 'Can I stop at Temi Tea Garden?',
        a: 'Yes. Temi is a short detour on the way. Tell us when you book and the driver will plan for it.',
      },
    ],
    group: 'Sikkim',
  },
  {
    slug: 'bagdogra-airport-to-lataguri-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Lataguri (Gorumara)',
    fromShort: 'Bagdogra Airport',
    toShort: 'Lataguri',
    km: 85,
    duration: '2.5 hours',
    durationIso: 'PT2H30M',
    via: 'Sevoke, Coronation Bridge, Odlabari and Malbazar',
    fares: { sedan: 2800, suv: 3500, innova: 4200, traveller: 6500 },
    summary:
      'A private taxi from Bagdogra Airport to Lataguri, the gateway to Gorumara National Park, costs ₹2,800 in a sedan and ₹4,200 in an Innova Crysta, one way. The 85 km drive through the Dooars tea gardens takes about 2.5 hours.',
    stops: ['Coronation Bridge', 'Odlabari tea gardens', 'Malbazar'],
    tips: [
      'Gorumara is closed to visitors every year from mid-June to mid-September, and on Thursdays the rest of the year.',
      'Jungle safari permits sell out on weekends. We can book them with your trip.',
    ],
    faqs: [
      {
        q: 'Can you book a Gorumara jungle safari as well?',
        a: 'Yes. Our Dooars jungle safari package includes the transfer, the safari slots and a hotel at Lataguri.',
      },
    ],
    destination: 'dooars',
    group: 'Dooars',
  },
  {
    slug: 'bagdogra-airport-to-jaldapara-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Jaldapara (Madarihat)',
    fromShort: 'Bagdogra Airport',
    toShort: 'Jaldapara',
    km: 145,
    duration: '3.5 to 4 hours',
    durationIso: 'PT3H45M',
    via: 'Sevoke, Malbazar, Chalsa and Birpara on NH17',
    fares: { sedan: 4000, suv: 5000, innova: 6000, traveller: 9000 },
    summary:
      'A private taxi from Bagdogra Airport to Jaldapara National Park at Madarihat costs ₹4,000 in a sedan and ₹6,000 in an Innova Crysta, one way. The 145 km drive across the Dooars takes 3.5 to 4 hours.',
    stops: ['Chalsa viewpoint', 'Birpara', 'Madarihat'],
    tips: ['Jaldapara is best known for one-horned rhinos. Book the early morning elephant or jeep safari as soon as your dates are fixed.'],
    faqs: [
      {
        q: 'Can I combine Jaldapara with Gorumara?',
        a: 'Yes. Lataguri to Madarihat is about 1.5 hours. Our Dooars package covers both parks.',
      },
    ],
    destination: 'dooars',
    group: 'Dooars',
  },
  {
    slug: 'bagdogra-airport-to-phuentsholing-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Phuentsholing (Bhutan border)',
    fromShort: 'Bagdogra Airport',
    toShort: 'Phuentsholing',
    km: 160,
    duration: '4 to 4.5 hours',
    durationIso: 'PT4H15M',
    via: 'Sevoke, the Dooars highway through Birpara and Hasimara to Jaigaon',
    fares: { sedan: 5500, suv: 6500, innova: 7500, traveller: 11000 },
    summary:
      'A private taxi from Bagdogra Airport to the Bhutan Gate at Jaigaon and Phuentsholing costs ₹5,500 in a sedan and ₹7,500 in an Innova Crysta, one way. The 160 km drive takes 4 to 4.5 hours.',
    stops: ['Malbazar', 'Hasimara', 'Jaigaon and the Bhutan Gate'],
    tips: [
      'Indian taxis drop at the Bhutan Gate. Travel beyond Phuentsholing needs a Bhutan entry permit and, for most visitors, a Bhutan-registered vehicle.',
      'Carry a passport or voter ID. Aadhaar is not accepted for the Bhutan entry permit.',
    ],
    faqs: [
      {
        q: 'Can your taxi drive into Bhutan?',
        a: 'Our taxis drop you at the Bhutan Gate in Jaigaon. From there you cross on foot to Phuentsholing, where Bhutan permits and Bhutanese taxis are arranged.',
      },
    ],
    group: 'Nepal and Bhutan borders',
  },
  {
    slug: 'bagdogra-airport-to-kakarvitta-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Kakarvitta (Nepal border)',
    fromShort: 'Bagdogra Airport',
    toShort: 'Kakarvitta',
    km: 25,
    duration: '45 minutes',
    durationIso: 'PT45M',
    via: 'Bagdogra and Panitanki on the Indian side of the Mechi bridge',
    fares: { sedan: 1200, suv: 1500, innova: 1800, traveller: 3000 },
    summary:
      'A private taxi from Bagdogra Airport to the Nepal border at Panitanki and Kakarvitta costs ₹1,200 in a sedan and ₹1,800 in an Innova Crysta. The 25 km drive takes about 45 minutes.',
    stops: ['Panitanki border post', 'Mechi bridge'],
    tips: ['Indian citizens cross into Nepal with a passport or voter ID. Other nationals need a Nepal visa, available at Kakarvitta.'],
    faqs: [
      {
        q: 'Can you drop me at Bhadrapur airport in Nepal?',
        a: 'Our taxis drop at Panitanki on the Indian side. From Kakarvitta, Bhadrapur airport is about 45 minutes by Nepali taxi.',
      },
    ],
    group: 'Nepal and Bhutan borders',
  },
  {
    slug: 'njp-to-darjeeling-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Darjeeling',
    fromShort: 'NJP station',
    toShort: 'Darjeeling',
    km: 75,
    duration: '3 to 3.5 hours',
    durationIso: 'PT3H15M',
    via: 'Siliguri, Rohini Road and Kurseong',
    fares: { sedan: 2800, suv: 3500, innova: 4200, traveller: 6500 },
    summary:
      'A private taxi from NJP railway station to Darjeeling costs ₹2,800 in a sedan and ₹4,200 in an Innova Crysta, one way. The 75 km drive takes 3 to 3.5 hours by Rohini Road and Kurseong.',
    stops: ['Siliguri', 'Rohini tea gardens', 'Kurseong', 'Ghum'],
    tips: [
      'Overnight trains from Kolkata often arrive late. We track your train and the driver waits at no extra cost.',
      'The toy train from NJP to Darjeeling takes about 7 hours. A taxi up and a toy-train joy ride in Darjeeling is a popular mix.',
    ],
    faqs: [
      {
        q: 'Where will the driver meet me at NJP?',
        a: 'At the main exit of platform 1 with a name board. You get the driver’s name, photo and car number on WhatsApp the evening before.',
      },
    ],
    destination: 'darjeeling',
    group: 'Siliguri and NJP',
  },
  {
    slug: 'njp-to-gangtok-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Gangtok',
    fromShort: 'NJP station',
    toShort: 'Gangtok',
    km: 120,
    duration: '4.5 to 5 hours',
    durationIso: 'PT4H45M',
    via: 'Siliguri, Sevoke and NH10 through Rangpo',
    fares: { sedan: 3500, suv: 4500, innova: 5500, traveller: 8500 },
    summary:
      'A private taxi from NJP railway station to Gangtok costs ₹3,500 in a sedan and ₹5,500 in an Innova Crysta, one way. The 120 km drive on NH10 takes 4.5 to 5 hours.',
    stops: ['Sevoke', 'Teesta river at Melli', 'Rangpo check post'],
    tips: ['Shared jeeps leave from outside NJP too, but they wait to fill up and drop at the Gangtok taxi stand, not your hotel.'],
    faqs: [
      {
        q: 'Private taxi or shared jeep from NJP to Gangtok?',
        a: 'A shared jeep costs about ₹400 a seat but leaves when full and stops at the Gangtok taxi stand. A private taxi leaves when you arrive, stops when you want, and drops you at your hotel door.',
      },
    ],
    destination: 'gangtok',
    group: 'Siliguri and NJP',
  },
  {
    slug: 'siliguri-to-darjeeling-taxi',
    from: 'Siliguri',
    to: 'Darjeeling',
    fromShort: 'Siliguri',
    toShort: 'Darjeeling',
    km: 65,
    duration: '3 hours',
    durationIso: 'PT3H',
    via: 'Rohini Road and Kurseong',
    fares: { sedan: 2600, suv: 3300, innova: 4000, traveller: 6200 },
    summary:
      'A private taxi from any Siliguri hotel to Darjeeling costs ₹2,600 in a sedan and ₹4,000 in an Innova Crysta, one way. The 65 km drive takes about 3 hours.',
    stops: ['Rohini', 'Kurseong', 'Ghum'],
    tips: ['Leave Siliguri before 9 am to reach Darjeeling for lunch and avoid afternoon fog.'],
    faqs: [
      {
        q: 'Do you pick up from my Siliguri hotel?',
        a: 'Yes, from any hotel, home or office in Siliguri at no extra charge.',
      },
    ],
    destination: 'darjeeling',
    group: 'Siliguri and NJP',
  },
  {
    slug: 'siliguri-to-gangtok-taxi',
    from: 'Siliguri',
    to: 'Gangtok',
    fromShort: 'Siliguri',
    toShort: 'Gangtok',
    km: 115,
    duration: '4.5 hours',
    durationIso: 'PT4H30M',
    via: 'Sevoke and NH10',
    fares: { sedan: 3300, suv: 4300, innova: 5300, traveller: 8200 },
    summary:
      'A private taxi from Siliguri to Gangtok costs ₹3,300 in a sedan and ₹5,300 in an Innova Crysta, one way. The 115 km drive on NH10 takes about 4.5 hours.',
    stops: ['Sevoke', 'Melli', 'Rangpo'],
    tips: ['Morning departures avoid the evening queue at the Rangpo check post.'],
    faqs: [
      {
        q: 'How early should I leave Siliguri for Gangtok?',
        a: 'Leaving by 8 am gets you to Gangtok by early afternoon with a tea stop on the way.',
      },
    ],
    destination: 'gangtok',
    group: 'Siliguri and NJP',
  },
  {
    slug: 'gangtok-to-bagdogra-airport-taxi',
    from: 'Gangtok',
    to: 'Bagdogra Airport (IXB)',
    fromShort: 'Gangtok',
    toShort: 'Bagdogra Airport',
    km: 125,
    duration: '4.5 to 5 hours',
    durationIso: 'PT4H45M',
    via: 'NH10 through Singtam, Rangpo and Sevoke',
    fares: { sedan: 3500, suv: 4500, innova: 5500, traveller: 8500 },
    summary:
      'A private taxi from Gangtok to Bagdogra Airport costs ₹3,500 in a sedan and ₹5,500 in an Innova Crysta, one way. Allow 5 hours for the 125 km drive, and leave at least 6 hours before your flight.',
    stops: ['Singtam', 'Rangpo', 'Sevoke'],
    tips: [
      'Leave Gangtok 6 hours before your flight time in the monsoon and 5.5 hours at other times.',
      'If a landslide closes NH10, the driver takes the Kalimpong road. We tell you before you leave the hotel.',
    ],
    faqs: [
      {
        q: 'What time should I leave Gangtok for a 2 pm flight?',
        a: 'Leave by 8 am. That leaves a buffer for the Rangpo check post, a short tea stop and airport security.',
      },
    ],
    destination: 'gangtok',
    returnSlug: 'bagdogra-airport-to-gangtok-taxi',
    group: 'Sikkim',
  },
  {
    slug: 'darjeeling-to-bagdogra-airport-taxi',
    from: 'Darjeeling',
    to: 'Bagdogra Airport (IXB)',
    fromShort: 'Darjeeling',
    toShort: 'Bagdogra Airport',
    km: 70,
    duration: '3 to 3.5 hours',
    durationIso: 'PT3H15M',
    via: 'Ghum, Kurseong and Rohini Road',
    fares: { sedan: 2800, suv: 3500, innova: 4200, traveller: 6500 },
    summary:
      'A private taxi from Darjeeling to Bagdogra Airport costs ₹2,800 in a sedan and ₹4,200 in an Innova Crysta, one way. Allow 3.5 hours for the 70 km drive and leave 5 hours before your flight.',
    stops: ['Ghum', 'Kurseong', 'Rohini'],
    tips: ['The descent is faster in the morning. Afternoon traffic at Ghum and Kurseong can add 45 minutes.'],
    faqs: [
      {
        q: 'What time should I leave Darjeeling for a 1 pm flight?',
        a: 'Leave by 8 am. You will reach the airport around 11 am with time for check-in.',
      },
    ],
    destination: 'darjeeling',
    returnSlug: 'bagdogra-airport-to-darjeeling-taxi',
    group: 'Darjeeling hills',
  },
];

export const routeBySlug = (slug: string) => ROUTES.find((r) => r.slug === slug);

export const lowestFare = (r: Route) => Math.min(...Object.values(r.fares));

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const ROUTE_GROUPS = [
  'Darjeeling hills',
  'Sikkim',
  'Dooars',
  'Siliguri and NJP',
  'Nepal and Bhutan borders',
] as const;
