import { overlayList } from './published';
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
 *
 * These are the starting copy: a route changed, added or removed in the
 * dashboard replaces what is written here (see ./published.ts).
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
  destination?: string | null;
  returnSlug?: string | null;
  /** A photo from the library chosen in the dashboard; otherwise src/lib/photos.ts picks one. */
  photo?: string | null;
  group: 'Darjeeling hills' | 'Sikkim' | 'Siliguri and NJP' | 'NJP station' | 'Dooars' | 'Nepal and Bhutan borders';
}

export const ROUTES_START: Route[] = [
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
      'Gangtok’s Deorali taxi stand used to be as far as West Bengal taxis could go. Since the July 2022 agreement between the Gangtok and West Bengal taxi associations, our cars drop at hotels across town; we confirm the day’s position when we send the driver’s details.',
    ],
    faqs: [
      {
        q: 'Where does a West Bengal taxi drop in Gangtok? Is the Deorali rule still in force?',
        a: 'At your hotel. Until 2022 West Bengal registered taxis had to stop at the Deorali taxi stand below town and passengers changed to a local cab. An agreement between the Gangtok and West Bengal taxi associations in July 2022 allows hotel drops, which is how we operate now. Hotels on the car-free part of MG Marg are reached on foot from the nearest drop point. If the rule changes, we tell you before the trip and the local cab is on us.',
      },
      {
        q: 'Private taxi, shared jeep or helicopter from Bagdogra to Gangtok?',
        a: 'A shared jeep from Siliguri costs about ₹400 to ₹600 a seat, leaves when all ten seats are full and drops at Deorali, where you take a local cab. The helicopter from Bagdogra is a 35-minute flight, about ₹3,100 a seat on the state service with a 7 kg bag limit, one departure a day and no flights in cloud. A private taxi is ₹3,500 for the car, door to door, with stops. Our guide to the three options compares them in detail.',
      },
      {
        q: 'What happens when NH10 is closed?',
        a: 'Your driver takes the hill road instead: Sevoke, Gorubathan, Lava, Algarah, Pedong and Rhenock to Pakyong and Gangtok (NH717A). It is about 50 km longer and adds 2 to 3 hours. The fare does not change. Our NH10 road status guide explains how closures work.',
      },
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
    returnSlug: 'njp-to-bagdogra-airport-taxi',
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
    group: 'NJP station',
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
    group: 'NJP station',
  },
  {
    slug: 'njp-to-bagdogra-airport-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Bagdogra Airport (IXB)',
    fromShort: 'NJP station',
    toShort: 'Bagdogra Airport',
    km: 22,
    duration: '45 minutes',
    durationIso: 'PT45M',
    via: 'Siliguri town and NH31 past Matigara',
    fares: { sedan: 700, suv: 900, innova: 1200, traveller: 2000 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to Bagdogra Airport costs ₹700 in a sedan and ₹1,200 in an Innova Crysta. The 22 km drive takes about 45 minutes, longer through Siliguri in the evening rush.',
    stops: ['Siliguri Junction', 'Matigara', 'Bagdogra Airport departures'],
    tips: [
      'Allow 2 hours between your train arriving and your flight. Trains from Kolkata and Guwahati often run late into NJP.',
      'The driver waits at the platform 1 exit with a name board and tracks your train, so a late arrival costs nothing extra.',
    ],
    faqs: [
      {
        q: 'How early should I leave NJP for a flight from Bagdogra?',
        a: 'Leave at least 2 hours before departure. The drive is 45 minutes, and Bagdogra security takes 30 to 45 minutes at busy times.',
      },
    ],
    returnSlug: 'bagdogra-airport-to-njp-taxi',
    group: 'NJP station',
  },
  {
    slug: 'njp-to-siliguri-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Siliguri',
    fromShort: 'NJP station',
    toShort: 'Siliguri',
    km: 6,
    duration: '20 to 30 minutes',
    durationIso: 'PT25M',
    via: 'Station Feeder Road and Hill Cart Road',
    fares: { sedan: 400, suv: 500, innova: 700, traveller: 1200 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to any hotel in Siliguri costs ₹400 in a sedan and ₹700 in an Innova Crysta. The 6 km drive takes 20 to 30 minutes.',
    stops: ['Siliguri Junction', 'Hill Cart Road', 'Sevoke Road and City Centre'],
    tips: ['Autos and app cabs also cover this short hop, but they wait outside the station and bargain. Our fare is fixed and the driver carries your bags from the platform exit.'],
    faqs: [
      {
        q: 'Can you drop me at the Siliguri bus stand or Tenzing Norgay terminus?',
        a: 'Yes. Any point in Siliguri, including the Tenzing Norgay bus terminus, Siliguri Junction and Pradhan Nagar, is covered by the same fare.',
      },
    ],
    group: 'NJP station',
  },
  {
    slug: 'njp-to-kalimpong-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Kalimpong',
    fromShort: 'NJP station',
    toShort: 'Kalimpong',
    km: 75,
    duration: '3 hours',
    durationIso: 'PT3H',
    via: 'Sevoke, NH10 along the Teesta to Teesta Bazaar, then the climb to Kalimpong',
    fares: { sedan: 3000, suv: 3800, innova: 4500, traveller: 7000 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to Kalimpong costs ₹3,000 in a sedan and ₹4,500 in an Innova Crysta, one way. The 75 km drive along the Teesta takes about 3 hours.',
    stops: ['Coronation Bridge at Sevoke', 'Teesta Bazaar', 'Delo viewpoint (on request)'],
    tips: [
      'NJP sits on the Sevoke side of Siliguri, so the Kalimpong road is reached without crossing town.',
      'Morning trains give you a daylight drive along the Teesta gorge, the prettiest part of the trip.',
    ],
    faqs: [
      {
        q: 'Can I continue from Kalimpong to Lava or Gangtok in the same car?',
        a: 'Yes. Book a multi-stop trip and we price it as one journey. Kalimpong to Lava is about 1.5 hours and Kalimpong to Gangtok about 3 hours.',
      },
    ],
    destination: 'kalimpong',
    group: 'NJP station',
  },
  {
    slug: 'njp-to-mirik-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Mirik',
    fromShort: 'NJP station',
    toShort: 'Mirik',
    km: 60,
    duration: '2 to 2.5 hours',
    durationIso: 'PT2H15M',
    via: 'Siliguri, Matigara and Dudhia, then the Mirik road through the tea gardens',
    fares: { sedan: 2400, suv: 3000, innova: 3600, traveller: 5800 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to Mirik costs ₹2,400 in a sedan and ₹3,600 in an Innova Crysta, one way. The 60 km drive by Dudhia and the tea estates takes 2 to 2.5 hours.',
    stops: ['Balason river at Dudhia', 'Gopaldhara and Thurbo tea gardens', 'Sumendu Lake, Mirik'],
    tips: [
      'Mirik is the gentlest hill climb from NJP, with wide bends that suit older travellers and small children.',
      'You can continue from Mirik to Darjeeling the same day. It adds about 1.5 hours.',
    ],
    faqs: [
      {
        q: 'Can I visit Mirik on the way to Darjeeling from NJP?',
        a: 'Yes. NJP to Darjeeling via Mirik adds about 1.5 hours and ₹800 to the sedan fare. Mention it when you book.',
      },
    ],
    destination: 'mirik',
    group: 'NJP station',
  },
  {
    slug: 'njp-to-kurseong-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Kurseong',
    fromShort: 'NJP station',
    toShort: 'Kurseong',
    km: 50,
    duration: '2 hours',
    durationIso: 'PT2H',
    via: 'Siliguri and Rohini Road through the tea gardens',
    fares: { sedan: 2200, suv: 2700, innova: 3200, traveller: 5200 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to Kurseong costs ₹2,200 in a sedan and ₹3,200 in an Innova Crysta, one way. The 50 km drive up Rohini Road takes about 2 hours.',
    stops: ['Rohini tea gardens', 'Eagle’s Crag viewpoint', 'Kurseong station on the toy train line'],
    tips: ['Kurseong is the closest hill stop to NJP. It suits a late train arrival when Darjeeling would mean driving the upper road in fog.'],
    faqs: [
      {
        q: 'Can I take the toy train from Kurseong after the taxi drops me?',
        a: 'Yes. The Darjeeling Himalayan Railway runs between Kurseong and Darjeeling. We can time the drop for the departure you have booked.',
      },
    ],
    destination: 'kurseong',
    group: 'NJP station',
  },
  {
    slug: 'njp-to-pelling-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Pelling',
    fromShort: 'NJP station',
    toShort: 'Pelling',
    km: 140,
    duration: '5.5 to 6 hours',
    durationIso: 'PT5H45M',
    via: 'Sevoke, NH10 to Melli, then Jorethang, Legship and Geyzing',
    fares: { sedan: 5500, suv: 6500, innova: 7500, traveller: 11000 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to Pelling costs ₹5,500 in a sedan and ₹7,500 in an Innova Crysta, one way. The 140 km drive through Jorethang takes 5.5 to 6 hours.',
    stops: ['Melli bridge on the Teesta', 'Jorethang', 'Legship hot springs', 'Geyzing'],
    tips: [
      'Choose a train that reaches NJP by late morning. The last two hours to Pelling are on narrow mountain roads best driven in daylight.',
      'Carry a photo ID for every adult. The Melli check post may ask to see ID when you enter Sikkim.',
    ],
    faqs: [
      {
        q: 'Is there a break on the NJP to Pelling drive?',
        a: 'Yes. Your driver stops for lunch at Jorethang or Melli and for tea wherever you like. Short stops are included in the fare.',
      },
    ],
    destination: 'pelling',
    group: 'NJP station',
  },
  {
    slug: 'njp-to-namchi-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Namchi',
    fromShort: 'NJP station',
    toShort: 'Namchi',
    km: 95,
    duration: '4 hours',
    durationIso: 'PT4H',
    via: 'Sevoke and NH10 to Melli, then up through Majitar to Namchi',
    fares: { sedan: 4000, suv: 5000, innova: 6000, traveller: 9000 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to Namchi costs ₹4,000 in a sedan and ₹6,000 in an Innova Crysta, one way. The 95 km drive by Melli takes about 4 hours.',
    stops: ['Melli', 'Char Dham at Solophok', 'Samdruptse statue'],
    tips: ['Namchi sits lower than Gangtok and stays milder in winter, which suits families with small children.'],
    faqs: [
      {
        q: 'Can I visit Char Dham and Samdruptse on the way from NJP?',
        a: 'Yes. Both are on the way into Namchi. Allow 2 extra hours and we add ₹500 for waiting time.',
      },
    ],
    group: 'NJP station',
  },
  {
    slug: 'njp-to-ravangla-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Ravangla',
    fromShort: 'NJP station',
    toShort: 'Ravangla',
    km: 115,
    duration: '4.5 to 5 hours',
    durationIso: 'PT4H45M',
    via: 'Melli, Namchi and Damthang',
    fares: { sedan: 4500, suv: 5500, innova: 6500, traveller: 9500 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to Ravangla costs ₹4,500 in a sedan and ₹6,500 in an Innova Crysta, one way. The 115 km drive through Namchi takes 4.5 to 5 hours.',
    stops: ['Namchi', 'Temi Tea Garden (on request)', 'Buddha Park, Ravangla'],
    tips: ['Ravangla is a natural halfway stop between Gangtok and Pelling if you are touring all of Sikkim.'],
    faqs: [
      {
        q: 'Can I stop at Temi Tea Garden on the way to Ravangla?',
        a: 'Yes. Temi is a short detour on the way. Tell us when you book and the driver will plan for it.',
      },
    ],
    group: 'NJP station',
  },
  {
    slug: 'njp-to-lataguri-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Lataguri (Gorumara)',
    fromShort: 'NJP station',
    toShort: 'Lataguri',
    km: 75,
    duration: '2 to 2.5 hours',
    durationIso: 'PT2H15M',
    via: 'Sevoke, Coronation Bridge, Odlabari and Malbazar',
    fares: { sedan: 2600, suv: 3300, innova: 4000, traveller: 6200 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to Lataguri, the gateway to Gorumara National Park, costs ₹2,600 in a sedan and ₹4,000 in an Innova Crysta, one way. The 75 km drive through the Dooars tea gardens takes 2 to 2.5 hours.',
    stops: ['Coronation Bridge', 'Odlabari tea gardens', 'Malbazar'],
    tips: [
      'Gorumara is closed to visitors every year from mid-June to mid-September, and on Thursdays the rest of the year.',
      'Overnight trains reach NJP early. Leave straight away and you can make the afternoon safari slot at Gorumara.',
    ],
    faqs: [
      {
        q: 'Can you book a Gorumara jungle safari with the NJP transfer?',
        a: 'Yes. Our Dooars jungle safari package includes the transfer from NJP, the safari slots and a hotel at Lataguri.',
      },
    ],
    destination: 'dooars',
    group: 'NJP station',
  },
  {
    slug: 'njp-to-jaldapara-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Jaldapara (Madarihat)',
    fromShort: 'NJP station',
    toShort: 'Jaldapara',
    km: 135,
    duration: '3.5 hours',
    durationIso: 'PT3H30M',
    via: 'Sevoke, Malbazar, Chalsa and Birpara on NH17',
    fares: { sedan: 3800, suv: 4800, innova: 5800, traveller: 8800 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to Jaldapara National Park at Madarihat costs ₹3,800 in a sedan and ₹5,800 in an Innova Crysta, one way. The 135 km drive across the Dooars takes about 3.5 hours.',
    stops: ['Chalsa viewpoint', 'Birpara', 'Madarihat'],
    tips: ['Jaldapara is best known for one-horned rhinos. Book the early morning elephant or jeep safari as soon as your dates are fixed.'],
    faqs: [
      {
        q: 'Is it better to take the train on to Hasimara or a taxi from NJP?',
        a: 'A taxi from NJP takes you straight to your lodge at Madarihat in 3.5 hours with stops on the way. Trains to Hasimara are infrequent and you still need a car for the last 20 km.',
      },
    ],
    destination: 'dooars',
    group: 'NJP station',
  },
  {
    slug: 'njp-to-phuentsholing-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Phuentsholing (Bhutan border)',
    fromShort: 'NJP station',
    toShort: 'Phuentsholing',
    km: 150,
    duration: '4 hours',
    durationIso: 'PT4H',
    via: 'Sevoke, the Dooars highway through Birpara and Hasimara to Jaigaon',
    fares: { sedan: 5300, suv: 6300, innova: 7300, traveller: 10800 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to the Bhutan Gate at Jaigaon and Phuentsholing costs ₹5,300 in a sedan and ₹7,300 in an Innova Crysta, one way. The 150 km drive across the Dooars takes about 4 hours.',
    stops: ['Malbazar', 'Hasimara', 'Jaigaon and the Bhutan Gate'],
    tips: [
      'Indian taxis drop at the Bhutan Gate. Travel beyond Phuentsholing needs a Bhutan entry permit and, for most visitors, a Bhutan-registered vehicle.',
      'Carry a passport or voter ID. Aadhaar is not accepted for the Bhutan entry permit.',
    ],
    faqs: [
      {
        q: 'Can your taxi drive into Bhutan from NJP?',
        a: 'Our taxis drop you at the Bhutan Gate in Jaigaon. From there you cross on foot to Phuentsholing, where Bhutan permits and Bhutanese taxis are arranged.',
      },
    ],
    group: 'NJP station',
  },
  {
    slug: 'njp-to-kakarvitta-taxi',
    from: 'New Jalpaiguri station (NJP)',
    to: 'Kakarvitta (Nepal border)',
    fromShort: 'NJP station',
    toShort: 'Kakarvitta',
    km: 35,
    duration: '1 hour',
    durationIso: 'PT1H',
    via: 'Siliguri, Bagdogra and Panitanki on the Indian side of the Mechi bridge',
    fares: { sedan: 1400, suv: 1700, innova: 2000, traveller: 3300 },
    summary:
      'A private taxi from New Jalpaiguri (NJP) railway station to the Nepal border at Panitanki and Kakarvitta costs ₹1,400 in a sedan and ₹2,000 in an Innova Crysta. The 35 km drive takes about 1 hour.',
    stops: ['Siliguri', 'Panitanki border post', 'Mechi bridge'],
    tips: ['Indian citizens cross into Nepal with a passport or voter ID. Other nationals need a Nepal visa, available at Kakarvitta.'],
    faqs: [
      {
        q: 'Can you drop me at Bhadrapur airport in Nepal from NJP?',
        a: 'Our taxis drop at Panitanki on the Indian side. From Kakarvitta, Bhadrapur airport is about 45 minutes by Nepali taxi.',
      },
    ],
    group: 'NJP station',
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
  // --- Added 24 Oct 2026: the routes the competitor research found rivals ranking for and we lacked. ---
  // TODO(pre-launch): fares below are set at the same per-km level as the routes above; the owner must confirm them.
  {
    slug: 'darjeeling-to-gangtok-taxi',
    from: 'Darjeeling',
    to: 'Gangtok',
    fromShort: 'Darjeeling',
    toShort: 'Gangtok',
    km: 100,
    duration: '4 to 4.5 hours',
    durationIso: 'PT4H15M',
    via: 'Jorebungalow and Lopchu down to Teesta Bazar, then Melli, Rangpo and NH10 up to Gangtok',
    fares: { sedan: 3800, suv: 4800, innova: 5800, traveller: 9000 },
    summary:
      'A private taxi from Darjeeling to Gangtok costs ₹3,800 in a sedan and ₹5,800 in an Innova Crysta, one way, with tolls and parking included. The 100 km drive down to the Teesta and up NH10 takes 4 to 4.5 hours, and the same West Bengal car takes you to your Gangtok hotel.',
    stops: ['Lopchu tea gardens', 'Teesta Bazar (Teesta and Rangeet meet)', 'Melli riverside', 'Rangpo (Sikkim entry check post)'],
    tips: [
      'Leave Darjeeling by 9 am. The Teesta Bazar stretch is slow after noon and Gangtok traffic builds from 4 pm.',
      'Carry a photo ID for every adult for the Rangpo check post; Indian citizens need no permit for Gangtok.',
      'If you plan Tsomgo Lake or Nathula the next day, send ID photos on WhatsApp before you travel so we can apply for the permit.',
    ],
    faqs: [
      {
        q: 'Is there a shared jeep from Darjeeling to Gangtok?',
        a: 'Yes, from the Darjeeling jeep stand in the morning, usually with a change at Teesta Bazar or Rangpo, about ₹400 to ₹600 a seat. A private taxi is door to door, leaves when you want and stops for photos.',
      },
      {
        q: 'Can we stop at Lopchu or Teesta Bazar on the way?',
        a: 'Yes. Short stops at the Lopchu viewpoint and the Teesta–Rangeet confluence are included. A longer detour to Kalimpong adds about 1.5 hours and ₹700 to the sedan fare.',
      },
    ],
    destination: 'gangtok',
    returnSlug: 'gangtok-to-darjeeling-taxi',
    group: 'Sikkim',
  },
  {
    slug: 'gangtok-to-darjeeling-taxi',
    from: 'Gangtok',
    to: 'Darjeeling',
    fromShort: 'Gangtok',
    toShort: 'Darjeeling',
    km: 100,
    duration: '4 to 4.5 hours',
    durationIso: 'PT4H15M',
    via: 'NH10 down to Rangpo and Melli, across the Teesta at Teesta Bazar, then up through Lopchu and Jorebungalow',
    fares: { sedan: 3800, suv: 4800, innova: 5800, traveller: 9000 },
    summary:
      'A private taxi from Gangtok to Darjeeling costs ₹3,800 in a sedan and ₹5,800 in an Innova Crysta, one way, all inclusive. The 100 km drive takes 4 to 4.5 hours by NH10, Teesta Bazar and the Lopchu road, with a pickup from your Gangtok hotel.',
    stops: ['Rangpo', 'Teesta Bazar', 'Lopchu viewpoint', 'Ghum Monastery'],
    tips: [
      'Hotels on Darjeeling’s Mall and Chowrasta are car-free. Your driver drops you at the nearest point and a porter can carry bags.',
      'Ask for an early start if you want to be in Darjeeling for an afternoon on the Mall; the hills cloud over after 2 pm in most months.',
      'A pickup from Gangtok hotels above MG Marg can take 20 minutes longer in the morning rush.',
    ],
    faqs: [
      {
        q: 'Can I go from Gangtok to Darjeeling via Kalimpong?',
        a: 'Yes. The Kalimpong road adds about 1.5 hours and ₹700 to the sedan fare, with a stop at Deolo Hill or the Durpin Monastery on the way.',
      },
      {
        q: 'Is the Gangtok to Darjeeling taxi the same price as Darjeeling to Gangtok?',
        a: 'Yes. Both directions are the same fixed fare, one way, including tolls, parking and GST.',
      },
    ],
    destination: 'darjeeling',
    returnSlug: 'darjeeling-to-gangtok-taxi',
    group: 'Darjeeling hills',
  },
  {
    slug: 'gangtok-to-pelling-taxi',
    from: 'Gangtok',
    to: 'Pelling',
    fromShort: 'Gangtok',
    toShort: 'Pelling',
    km: 115,
    duration: '4.5 to 5 hours',
    durationIso: 'PT4H45M',
    via: 'Singtam and the Temi tea garden road to Ravangla, then Legship and Geyzing',
    fares: { sedan: 4500, suv: 5500, innova: 6500, traveller: 9800 },
    summary:
      'A private taxi from Gangtok to Pelling costs ₹4,500 in a sedan and ₹6,500 in an Innova Crysta, one way, all inclusive. The 115 km drive through Singtam, Temi tea garden and Ravangla takes 4.5 to 5 hours, and Indian citizens need no permit for West Sikkim.',
    stops: ['Temi tea garden', 'Buddha Park at Ravangla', 'Legship (Rangeet river)', 'Geyzing'],
    tips: [
      'Stopping at the Buddha Park in Ravangla adds about 45 minutes and is included; say so when you book and we plan the pickup time around it.',
      'Upper Pelling hotels get the Kanchenjunga view at sunrise; ask your driver to confirm which part of Pelling your hotel is in.',
      'The road via Namchi and Jorethang is an alternative when the Ravangla road is being repaired; it is about the same time.',
    ],
    faqs: [
      {
        q: 'Which is the best route from Gangtok to Pelling?',
        a: 'The Singtam–Ravangla road is the usual one, with the Temi tea garden and the Buddha Park on the way. The Jorethang road via Namchi is an alternative of similar length when there is work on the Ravangla stretch.',
      },
      {
        q: 'Is a permit needed for Pelling?',
        a: 'No. Indian citizens need no permit for Pelling, Yuksom or any of West Sikkim. Foreign nationals use the free Restricted Area Permit that covers all of Sikkim.',
      },
    ],
    destination: 'pelling',
    returnSlug: 'pelling-to-gangtok-taxi',
    group: 'Sikkim',
  },
  {
    slug: 'pelling-to-gangtok-taxi',
    from: 'Pelling',
    to: 'Gangtok',
    fromShort: 'Pelling',
    toShort: 'Gangtok',
    km: 115,
    duration: '4.5 to 5 hours',
    durationIso: 'PT4H45M',
    via: 'Geyzing and Legship to Ravangla, then the Temi tea garden road and Singtam to NH10',
    fares: { sedan: 4500, suv: 5500, innova: 6500, traveller: 9800 },
    summary:
      'A private taxi from Pelling to Gangtok costs ₹4,500 in a sedan and ₹6,500 in an Innova Crysta, one way, all inclusive. The 115 km drive by Ravangla and Singtam takes 4.5 to 5 hours, with a pickup from your Pelling hotel at the time you choose.',
    stops: ['Rangeet river at Legship', 'Buddha Park at Ravangla', 'Temi tea garden', 'Singtam'],
    tips: [
      'Leave Pelling by 9 am to be in Gangtok before the afternoon traffic on NH10 and the climb into town.',
      'Khecheopalri Lake is a 1-hour detour from Pelling on the way out; add it when you book.',
      'If you fly out of Bagdogra the next morning, consider our Pelling to Bagdogra Airport taxi instead and skip Gangtok.',
    ],
    faqs: [
      {
        q: 'Can we visit Ravangla Buddha Park on the way from Pelling to Gangtok?',
        a: 'Yes. A 45-minute stop at the Buddha Park is included in the fare; just tell us when you book so the pickup time allows for it.',
      },
    ],
    destination: 'gangtok',
    returnSlug: 'gangtok-to-pelling-taxi',
    group: 'Sikkim',
  },
  {
    slug: 'siliguri-to-kalimpong-taxi',
    from: 'Siliguri',
    to: 'Kalimpong',
    fromShort: 'Siliguri',
    toShort: 'Kalimpong',
    km: 70,
    duration: '2.5 to 3 hours',
    durationIso: 'PT2H45M',
    via: 'Sevoke and the Coronation Bridge, NH10 along the Teesta to Teesta Bazar, then the climb to Kalimpong',
    fares: { sedan: 2800, suv: 3600, innova: 4300, traveller: 6700 },
    summary:
      'A private taxi from Siliguri to Kalimpong costs ₹2,800 in a sedan and ₹4,300 in an Innova Crysta, one way, with tolls and parking included. The 70 km drive along the Teesta takes 2.5 to 3 hours, with a pickup from any Siliguri address, Tenzing Norgay bus stand or Siliguri Junction.',
    stops: ['Sevoke Kali Mandir', 'Coronation Bridge', 'Teesta Bazar', 'Deolo Hill (on request)'],
    tips: [
      'Kalimpong’s cactus nurseries and the Durpin Monastery are on the way into town; ask for a stop if you have time.',
      'From Siliguri Junction, the pickup point is the taxi bay outside the main exit; the driver sends a WhatsApp photo of the car.',
      'For Lava, Lolegaon or Rishop, book the Kalimpong taxi and tell us the final village; the onward fare is added at the same per-km rate.',
    ],
    faqs: [
      {
        q: 'Is there a shared jeep from Siliguri to Kalimpong?',
        a: 'Yes, from the Panitanki More and Siliguri Junction stands through the day, about ₹200 to ₹300 a seat, leaving when full. A private taxi picks you up at your door and stops where you like.',
      },
    ],
    destination: 'kalimpong',
    returnSlug: null,
    group: 'Darjeeling hills',
  },
  {
    slug: 'siliguri-to-mirik-taxi',
    from: 'Siliguri',
    to: 'Mirik',
    fromShort: 'Siliguri',
    toShort: 'Mirik',
    km: 50,
    duration: '1.5 to 2 hours',
    durationIso: 'PT1H45M',
    via: 'Sukna and Dudhia, then the tea-garden road through Gopaldhara to Sumendu Lake',
    fares: { sedan: 2000, suv: 2600, innova: 3200, traveller: 5200 },
    summary:
      'A private taxi from Siliguri to Mirik costs ₹2,000 in a sedan and ₹3,200 in an Innova Crysta, one way, all inclusive. The 50 km drive through the Dudhia and Gopaldhara tea gardens takes 1.5 to 2 hours, so Mirik works as a day trip or a first night in the hills.',
    stops: ['Dudhia (Balasun river)', 'Gopaldhara tea garden', 'Sumendu Lake', 'Pashupati Market on the Nepal border (on request)'],
    tips: [
      'A day trip from Siliguri with 3 hours at the lake and a stop at Pashupati Market costs about the same as two one-way fares; ask for the round-trip price.',
      'The orange orchards around Mirik are in fruit from November to January.',
      'Mirik to Darjeeling by the Sukhia Pokhri road is 50 km more; we can continue at the same per-km rate.',
    ],
    faqs: [
      {
        q: 'Can I do Siliguri to Mirik and back in a day?',
        a: 'Yes. Leave Siliguri by 8 am, spend the middle of the day at Sumendu Lake and the tea gardens, and be back by evening. Ask us for the day-trip fare, which includes the waiting time.',
      },
    ],
    destination: 'mirik',
    returnSlug: null,
    group: 'Darjeeling hills',
  },
  {
    slug: 'gangtok-to-lachung-taxi',
    from: 'Gangtok',
    to: 'Lachung',
    fromShort: 'Gangtok',
    toShort: 'Lachung',
    km: 118,
    duration: '5 to 6 hours',
    durationIso: 'PT5H30M',
    via: 'the North Sikkim Highway through Mangan and Chungthang, in a Sikkim-registered SUV',
    fares: { sedan: 7000, suv: 7000, innova: 8500, traveller: 14000 },
    summary:
      'A Sikkim-registered SUV from Gangtok to Lachung costs ₹7,000 one way, or ₹8,500 in an Innova, including the North Sikkim permit paperwork. The 118 km drive through Mangan and Chungthang takes 5 to 6 hours. Only Sikkim-registered SUVs with local drivers are allowed into North Sikkim, so a sedan booking is driven in an SUV at the same fare.',
    stops: ['Tashi Viewpoint', 'Seven Sisters waterfall', 'Mangan (lunch)', 'Chungthang'],
    tips: [
      'North Sikkim is sold as a 2-night round trip by almost every operator, because the permit and the vehicle are issued for the circuit. Ask us for the Lachung and Yumthang package price before booking one way.',
      'Send photo ID and two passport photos per person on WhatsApp at least two days ahead; the permit is applied for in Gangtok the day before.',
      'Yumthang Valley and Zero Point are a morning trip from Lachung in the same SUV, not a separate transfer.',
    ],
    faqs: [
      {
        q: 'Can a sedan or a West Bengal taxi go to Lachung?',
        a: 'No. Only Sikkim-registered SUVs with local drivers are permitted on the North Sikkim road. If you choose a sedan when booking, we send a Sikkim SUV at the sedan fare shown.',
      },
      {
        q: 'Is a permit needed for Lachung?',
        a: 'Yes. Indian citizens need a protected-area permit, applied for through a registered operator with a photo ID and two photos per person. Foreign nationals can visit Lachung and Yumthang in a group of two or more with a Restricted Area Permit, but not Gurudongmar. See our Sikkim permit guide.',
      },
    ],
    destination: 'north-sikkim',
    returnSlug: null,
    group: 'Sikkim',
  },
  {
    slug: 'bagdogra-airport-to-lachung-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Lachung',
    fromShort: 'Bagdogra Airport',
    toShort: 'Lachung',
    km: 243,
    duration: '10 to 11 hours (night in Gangtok)',
    durationIso: 'PT10H30M',
    via: 'NH10 to Gangtok in your chosen car, then the North Sikkim Highway through Mangan and Chungthang in a Sikkim-registered SUV',
    fares: { sedan: 10500, suv: 11500, innova: 14000, traveller: 22500 },
    summary:
      'Bagdogra Airport to Lachung is two legs: your chosen car on NH10 to Gangtok (125 km), then a Sikkim-registered SUV through Mangan and Chungthang to Lachung (118 km), because only Sikkim SUVs are allowed into North Sikkim. The through fare is ₹10,500 with a sedan on the first leg and ₹14,000 with an Innova, one way, including the permit paperwork. Most travellers break the 243 km at Gangtok for a night.',
    stops: ['Coronation Bridge', 'Rangpo check post', 'Gangtok (car change, permit collection)', 'Seven Sisters waterfall', 'Mangan'],
    tips: [
      'Flights landing after 10 am cannot reach Lachung the same day: the permit is issued in Gangtok and the North Sikkim road is closed to tourist traffic after dark. Plan a night in Gangtok.',
      'Send photo ID and two photos per person on WhatsApp two days before you fly so the permit is ready when you reach Gangtok.',
      'The Tempo Traveller fare covers the airport leg plus two Sikkim SUVs for the North Sikkim leg, as a 12-seater cannot go beyond Gangtok.',
    ],
    faqs: [
      {
        q: 'Why does the car change at Gangtok?',
        a: 'Sikkim allows only Sikkim-registered SUVs with local drivers into North Sikkim. Your airport taxi drops you at your Gangtok hotel or the North Sikkim taxi stand, and the SUV we arrange takes over with your permit.',
      },
      {
        q: 'Is it cheaper to book the North Sikkim package instead?',
        a: 'Usually yes. The permit and the SUV are issued for a round trip, so a one-way transfer still pays for the SUV’s return. Our Lachung and Yumthang package bundles the airport pickup, the SUV for the circuit, hotels and the permit.',
      },
    ],
    destination: 'north-sikkim',
    returnSlug: null,
    group: 'Sikkim',
  },
  {
    slug: 'bagdogra-airport-to-lachen-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Lachen',
    fromShort: 'Bagdogra Airport',
    toShort: 'Lachen',
    km: 238,
    duration: '10 to 11 hours (night in Gangtok)',
    durationIso: 'PT10H30M',
    via: 'NH10 to Gangtok in your chosen car, then the North Sikkim Highway through Mangan and Chungthang in a Sikkim-registered SUV',
    fares: { sedan: 10500, suv: 11500, innova: 14000, traveller: 22500 },
    summary:
      'Bagdogra Airport to Lachen is two legs: your chosen car to Gangtok on NH10, then a Sikkim-registered SUV through Mangan and Chungthang to Lachen, the base for Gurudongmar Lake. The through fare is ₹10,500 with a sedan on the airport leg and ₹14,000 with an Innova, one way, permit paperwork included. The 238 km is normally broken with a night in Gangtok.',
    stops: ['Coronation Bridge', 'Rangpo check post', 'Gangtok (car change, permit collection)', 'Mangan', 'Chungthang'],
    tips: [
      'Gurudongmar Lake is a 3-hour pre-dawn drive from Lachen in the same SUV and is open to Indian citizens only; foreign nationals can stay at Lachen but not visit the lake.',
      'The Lachen road closes after landslides more often than the Lachung road. We confirm the road status the day before and switch you to Lachung if needed.',
      'Carry warm layers even in May: Lachen is at 2,750 m and Gurudongmar at 5,180 m.',
    ],
    faqs: [
      {
        q: 'Can I reach Lachen from Bagdogra on the day I land?',
        a: 'Only with a morning flight and a permit arranged in advance; most travellers stay a night in Gangtok and leave for Lachen early the next day. The North Sikkim road is not open to tourist vehicles after dark.',
      },
      {
        q: 'Do foreigners need anything extra for Lachen?',
        a: 'Yes: a Restricted Area Permit and a group of at least two, through a registered operator. Gurudongmar Lake is closed to foreign nationals. See our Sikkim permit guide.',
      },
    ],
    destination: 'north-sikkim',
    returnSlug: null,
    group: 'Sikkim',
  },
  {
    slug: 'bagdogra-airport-to-zuluk-taxi',
    from: 'Bagdogra Airport (IXB)',
    to: 'Zuluk (Silk Route)',
    fromShort: 'Bagdogra Airport',
    toShort: 'Zuluk',
    km: 150,
    duration: '6 to 7 hours',
    durationIso: 'PT6H30M',
    via: 'NH10 to Rangpo, Rorathang and Rongli in your chosen car, then the Silk Route hairpins through Lingtam and Padamchen in a Sikkim-registered SUV',
    fares: { sedan: 9000, suv: 10000, innova: 11500, traveller: 19500 },
    summary:
      'Bagdogra Airport to Zuluk on the Old Silk Route costs ₹9,000 with a sedan to Rongli and ₹11,500 with an Innova, one way, including the Sikkim-registered SUV for the stretch beyond Rongli and the permit paperwork. The 150 km takes 6 to 7 hours: NH10 along the Teesta to Rangpo, the Rongli valley, then the 32 hairpins up to Zuluk at 3,000 m.',
    stops: ['Coronation Bridge', 'Rangpo', 'Rongli (permit office, car change)', 'Lingtam', 'Padamchen'],
    tips: [
      'The Rongli permit office closes early afternoon on weekdays, before noon on Saturdays, and is shut on Sundays. Flights landing after 10 am mean a night at Rongli, Aritar or Sillery Gaon first.',
      'Indian citizens need a protected-area permit for Zuluk and beyond, issued at Rongli through a registered operator with a photo ID and two photos each.',
      'Nathang Valley, Kupup and the Thambi viewpoint are a morning drive from Zuluk in the same SUV; the permit covers the whole Rongli to Kupup circuit.',
    ],
    faqs: [
      {
        q: 'Can a West Bengal taxi drive to Zuluk?',
        a: 'No. Beyond Rongli only Sikkim-registered SUVs are allowed on the Silk Route circuit. Your airport taxi takes you to Rongli, where the SUV we arrange and your permit take over.',
      },
      {
        q: 'Is the Silk Route open in winter?',
        a: 'Zuluk is open through the year, but snow closes the road above Nathang between December and February on some days. The Thambi viewpoint is usually reachable; we check with the Rongli operator the day before.',
      },
    ],
    destination: 'silk-route',
    returnSlug: null,
    group: 'Sikkim',
  },
];

export const ROUTES = overlayList('route', ROUTES_START, (r) => r.slug);

export const routeBySlug = (slug: string) => ROUTES.find((r) => r.slug === slug);

export const lowestFare = (r: Route) => Math.min(...Object.values(r.fares));

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const ROUTE_GROUPS = [
  'Darjeeling hills',
  'Sikkim',
  'Dooars',
  'Siliguri and NJP',
  'NJP station',
  'Nepal and Bhutan borders',
] as const;
