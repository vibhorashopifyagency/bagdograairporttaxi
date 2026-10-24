/**
 * The "tour packages from <city>" landing pages (/tour-packages/from/<city>/).
 * Each one tells a traveller from that city how to reach Bagdogra, how the
 * first day of a package works from their arrival time, and lists every
 * package, so the page answers "Sikkim tour package from Kolkata" with the
 * real logistics rather than a copy of the package list.
 *
 * Flight times and frequencies are as published by the airlines in October
 * 2026 and are rounded; the words around them are the "Every 'from city'
 * page" template in the dashboard (src/data/page-text.ts). This file is not
 * edited in the dashboard: add a city here and in src/data/site-pages.ts.
 */
import type { Faq } from './routes';

export interface FromCity {
  slug: string;
  name: string;
  /** "Kolkata (CCU)" */
  airport: string;
  /** Nonstop flight time, rounded: "about 1 hour 10 minutes". */
  flightTime: string;
  /** How often nonstops run and who flies them. */
  flights: string;
  /** The rail option, or how to say there is none worth taking. */
  train: string;
  /** When most flights land, which decides what day 1 can hold. */
  arrival: string;
  /** Two or three facts for the tiles. */
  facts: { label: string; value: string }[];
  faqs: Faq[];
}

export const FROM_CITIES: FromCity[] = [
  {
    slug: 'kolkata',
    name: 'Kolkata',
    airport: 'Kolkata (CCU)',
    flightTime: 'about 1 hour 10 minutes',
    flights: 'Several nonstop flights a day on IndiGo, Air India Express and SpiceJet, from early morning to evening.',
    train: 'The Darjeeling Mail and Padatik Express leave Sealdah in the evening and reach New Jalpaiguri (NJP) early next morning, about 10 hours. Every package can start at NJP instead of the airport at the same price.',
    arrival: 'Morning flights land at Bagdogra by 9 or 10 am, so day 1 reaches Darjeeling by lunch or Gangtok by mid-afternoon.',
    facts: [
      { label: 'Flight', value: 'About 1 h 10 min nonstop, several a day' },
      { label: 'Train', value: 'Darjeeling Mail, Sealdah to NJP overnight' },
      { label: 'Day 1', value: 'Darjeeling by lunch, Gangtok by afternoon' },
    ],
    faqs: [
      {
        q: 'Is it better to fly or take the train from Kolkata for a Sikkim tour?',
        a: 'Flying saves a day: an early flight has you in the hills by lunch. The overnight Darjeeling Mail to NJP is cheaper and lands you at the station at dawn, where our driver waits with a name board; the package price is the same from NJP or the airport.',
      },
      {
        q: 'Can the package start at NJP station instead of Bagdogra Airport?',
        a: 'Yes. Every package starts and ends at either Bagdogra Airport or NJP at the same price. Tell us the train number and we track it.',
      },
    ],
  },
  {
    slug: 'delhi',
    name: 'Delhi',
    airport: 'Delhi (DEL)',
    flightTime: 'about 2 hours 15 minutes',
    flights: 'Several nonstop flights a day on IndiGo, Air India, Air India Express and others, mostly morning and midday departures.',
    train: 'The New Delhi to New Jalpaiguri Rajdhani and other trains take about 20 hours, so almost everyone flies. A package can still start at NJP if you prefer the train.',
    arrival: 'Most Delhi flights land at Bagdogra between 10 am and 2 pm, so day 1 is the drive to Darjeeling or Gangtok with an evening arrival.',
    facts: [
      { label: 'Flight', value: 'About 2 h 15 min nonstop, several a day' },
      { label: 'Train', value: 'Rajdhani to NJP, about 20 hours' },
      { label: 'Day 1', value: 'Drive to the hills, evening arrival' },
    ],
    faqs: [
      {
        q: 'Which Delhi flight should I take to make day 1 count?',
        a: 'The earliest nonstop, landing by about 10 am. You reach Darjeeling by mid-afternoon with time for the Mall, or Gangtok by early evening. A flight landing after 2 pm reaches Gangtok after dark in winter.',
      },
      {
        q: 'Is there a direct flight from Delhi to Bagdogra every day?',
        a: 'Yes, several a day on more than one airline. Fares rise sharply for Durga Puja, Christmas week and the May school holidays, so book flights early for those dates.',
      },
    ],
  },
  {
    slug: 'mumbai',
    name: 'Mumbai',
    airport: 'Mumbai (BOM)',
    flightTime: 'about 2 hours 50 minutes',
    flights: 'Daily nonstop flights on IndiGo, with Air India Express and SpiceJet on some days; one-stop flights via Kolkata or Delhi add 2 to 3 hours.',
    train: 'No practical train: Mumbai to New Jalpaiguri is more than 40 hours. Fly.',
    arrival: 'Nonstops from Mumbai tend to land at Bagdogra around midday, so day 1 is a comfortable drive to Darjeeling, or to Gangtok with an early-evening arrival.',
    facts: [
      { label: 'Flight', value: 'About 2 h 50 min nonstop, daily' },
      { label: 'Train', value: 'None worth taking' },
      { label: 'Day 1', value: 'Darjeeling by afternoon, Gangtok by evening' },
    ],
    faqs: [
      {
        q: 'Should I fly nonstop from Mumbai or via Kolkata?',
        a: 'Nonstop if the timing works: you land around midday with the afternoon for the drive. A connection via Kolkata can be cheaper and sometimes lands earlier, but a missed connection costs you the first day.',
      },
      {
        q: 'How many days do I need from Mumbai for Darjeeling and Gangtok?',
        a: 'Six days and five nights covers both towns and Tsomgo Lake, with the flights at each end. Eight days adds Pelling or a night in the Dooars.',
      },
    ],
  },
  {
    slug: 'bengaluru',
    name: 'Bengaluru',
    airport: 'Bengaluru (BLR)',
    flightTime: 'about 2 hours 55 minutes',
    flights: 'Nonstop flights most days on Air India Express and Akasa Air, with one-stop options via Kolkata on IndiGo.',
    train: 'No practical train from Bengaluru. Fly, or fly to Kolkata and take the overnight Darjeeling Mail to NJP.',
    arrival: 'Nonstops from Bengaluru usually land late morning or early afternoon; day 1 is the drive to Darjeeling or Gangtok.',
    facts: [
      { label: 'Flight', value: 'About 2 h 55 min nonstop, most days' },
      { label: 'Train', value: 'None; fly, or train from Kolkata' },
      { label: 'Day 1', value: 'Drive to the hills, afternoon or evening arrival' },
    ],
    faqs: [
      {
        q: 'Is there a direct flight from Bengaluru to Bagdogra?',
        a: 'Yes, on most days of the week, about 3 hours. On days without a nonstop, a one-stop via Kolkata lands by early afternoon.',
      },
      {
        q: 'What is the best time of year for a Bengaluru family to visit Sikkim?',
        a: 'October to December for clear mountain views, and March to May for rhododendrons and Yumthang in flower. Nathula and North Sikkim can close with snow in January and February.',
      },
    ],
  },
  {
    slug: 'hyderabad',
    name: 'Hyderabad',
    airport: 'Hyderabad (HYD)',
    flightTime: 'about 2 hours 15 minutes',
    flights: 'A daily nonstop on IndiGo, plus one-stop flights via Kolkata through the day.',
    train: 'No practical train from Hyderabad. Fly.',
    arrival: 'The Hyderabad nonstop lands at Bagdogra around midday, in time for day 1 to reach Darjeeling by late afternoon or Gangtok by evening.',
    facts: [
      { label: 'Flight', value: 'About 2 h 15 min nonstop, daily' },
      { label: 'Train', value: 'None worth taking' },
      { label: 'Day 1', value: 'Darjeeling by late afternoon, Gangtok by evening' },
    ],
    faqs: [
      {
        q: 'How long is the flight from Hyderabad to Bagdogra?',
        a: 'About 2 hours 15 minutes nonstop. With a stop at Kolkata, 4 to 5 hours.',
      },
      {
        q: 'Can we do Darjeeling, Gangtok and Pelling in a week from Hyderabad?',
        a: 'Yes. The 7-night Darjeeling, Gangtok and Pelling package fits a Saturday-to-Sunday week with the nonstop flights at each end.',
      },
    ],
  },
  {
    slug: 'chennai',
    name: 'Chennai',
    airport: 'Chennai (MAA)',
    flightTime: 'about 2 hours 50 minutes',
    flights: 'Nonstop on IndiGo on some days of the week; otherwise one stop via Kolkata or Bengaluru.',
    train: 'No practical train from Chennai. Fly.',
    arrival: 'Chennai flights land at Bagdogra around midday to early afternoon; day 1 is the drive to Darjeeling or Gangtok with an evening arrival.',
    facts: [
      { label: 'Flight', value: 'About 2 h 50 min nonstop, some days' },
      { label: 'Train', value: 'None worth taking' },
      { label: 'Day 1', value: 'Drive to the hills, evening arrival' },
    ],
    faqs: [
      {
        q: 'Is there a nonstop flight from Chennai to Bagdogra?',
        a: 'On some days of the week. On other days a one-stop via Kolkata or Bengaluru takes about 5 hours. Tell us your flight and we plan day 1 around the landing time.',
      },
      {
        q: 'Is a 5-night package enough from Chennai?',
        a: 'Yes for Darjeeling and Gangtok with Tsomgo Lake. Add two nights for Pelling or North Sikkim.',
      },
    ],
  },
];

export const fromCityBySlug = (slug: string) => FROM_CITIES.find((c) => c.slug === slug);
