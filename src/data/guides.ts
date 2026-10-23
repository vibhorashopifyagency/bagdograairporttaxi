import type { GuideBlock } from '../lib/guide-body';
import { overlayList } from './published';

/**
 * The travel guides, every word of them: the dashboard edits all of it (Edit
 * pages, Travel guides) and src/pages/guides/[slug].astro lays it out. A
 * guide cannot be added or removed in the dashboard, since each has its own
 * photo and place in the menus.
 *
 * Text uses the page-words marks (src/lib/rich-text.ts): [a link](/taxi/),
 * **bold**, and fill-ins such as {updated} (the "Last checked" date) or
 * {darjeelingSedan}, so a fare quoted in a guide follows the fare chart.
 * `published` is the day the guide first went up and never moves; `updated`
 * is the day its facts last changed (it feeds the sitemap lastmod), and the
 * dashboard moves it on with every publish of the guide.
 */
export interface Guide {
  slug: string;
  /** The heading at the top, and the title on guide cards. */
  title: string;
  /** For the breadcrumb and the footer: "Sikkim permit guide". */
  short: string;
  /** The title in Google and the browser tab, usually tighter than the heading. */
  seoTitle: string;
  description: string;
  /** The short answer at the top of the guide, which Google and AI answers quote (and llms.txt). */
  summary: string;
  /** Two to four facts in tiles under the answer. */
  facts: { label: string; value: string }[];
  body: GuideBlock[];
  faqs: { q: string; a: string }[];
  /** Up to three tour packages shown after the guide. */
  packages: string[];
  /** The line in the dark "Ask our local team" card. */
  askNote: string;
  /** The WhatsApp message already typed for the visitor. */
  waText: string;
  /** Where the booking box's Book button goes. */
  bookHref: string;
  /** The booking box's heading. */
  ctaHeading: string;
  published: string;
  updated: string;
  updatedLabel: string;
}

export const GUIDES_START: Guide[] = [
  {
    slug: 'sikkim-permit-guide',
    title: 'Sikkim permit guide: who needs one, where and how',
    short: 'Sikkim permit guide',
    seoTitle: 'Sikkim Permit Guide 2026: Tsomgo, Nathula and North Sikkim',
    description: 'Which places in Sikkim need a permit, the documents accepted, Nathula opening days, and the rules for foreign nationals.',
    summary: 'Indian citizens need no permit for Gangtok, Pelling or Namchi. A protected-area permit is needed for Tsomgo Lake, Nathula, Zuluk and North Sikkim, and it is arranged by a registered tour operator with a photo ID and two photos per person. Foreign nationals need a free Restricted Area Permit for all of Sikkim.',
    facts: [
      { label: 'Gangtok, Pelling, Namchi', value: 'No permit for Indians' },
      { label: 'Tsomgo and Nathula', value: 'Day permit via an operator' },
      { label: 'North Sikkim', value: 'Permit plus a Sikkim-registered car' },
      { label: 'Foreign nationals', value: 'Free RAP for all of Sikkim' },
    ],
    body: [
      { type: 'heading', text: 'Permit needed or not, place by place (Indian citizens)' },
      {
        type: 'table',
        head: ['Place', 'Permit', 'Notes'],
        rows: [
          ['Gangtok, MG Marg, Rumtek', 'No', 'Photo ID at Rangpo'],
          ['Pelling, Yuksom, Ravangla, Namchi', 'No', 'West and South Sikkim are open'],
          ['Tsomgo Lake and Baba Mandir', 'Yes', 'Day permit through an operator'],
          ['Nathula Pass', 'Yes', 'Wednesday to Sunday, Indians only'],
          ['Zuluk and the Silk Route', 'Yes', 'Issued at Rongli'],
          ['Lachung, Yumthang, Zero Point', 'Yes', 'Sikkim-registered vehicle required'],
          ['Lachen and Gurudongmar Lake', 'Yes', 'Indians only for Gurudongmar'],
        ],
      },
      { type: 'heading', text: 'Documents to carry' },
      {
        type: 'list',
        items: [
          'An original photo ID for every adult: Aadhaar, passport, voter ID or driving licence.',
          'For children: a birth certificate, school ID or Aadhaar.',
          'Two passport-size photos per person, plus soft copies on your phone.',
        ],
      },
      { type: 'heading', text: 'How we handle it' },
      {
        type: 'text',
        text: 'When you book a Sikkim tour with us, send photos of your IDs on WhatsApp at least two days before. We apply for the permit, arrange the Sikkim-registered car the protected areas require, and hand you the permit before the trip.',
      },
      {
        type: 'note',
        text: 'Rules change at short notice with weather and army orders. We confirm the current position with every booking. Last checked {updated}.',
      },
    ],
    faqs: [
      {
        q: 'Do Indians need a permit for Gangtok?',
        a: 'No. Indian citizens can visit Gangtok, Pelling, Namchi, Ravangla and most of South and West Sikkim without a permit. Carry a photo ID for the Rangpo check post.',
      },
      {
        q: 'Which places in Sikkim need a permit for Indians?',
        a: 'Tsomgo Lake, Baba Mandir, Nathula Pass, Zuluk and the Silk Route, and North Sikkim (Lachung, Yumthang, Zero Point, Lachen and Gurudongmar). These are protected areas near the border.',
      },
      {
        q: 'What documents are needed for the permit?',
        a: 'A photo ID for each traveller (Aadhaar, passport, voter ID or driving licence; children can use a birth certificate or school ID) and two passport-size photos. A PAN card is not accepted.',
      },
      {
        q: 'Can foreigners visit Sikkim?',
        a: 'Yes, with a Restricted Area Permit (RAP or ILP), issued free at the Rangpo and Melli check posts, at Siliguri’s Sikkim Tourism office, or online. Foreign nationals cannot visit Nathula or Gurudongmar, and North Sikkim needs a group of at least two through a registered operator.',
      },
      {
        q: 'Is Nathula open every day?',
        a: 'No. Nathula is usually open to Indian citizens from Wednesday to Sunday and closes after heavy snow or on army orders. The permit is applied for a day ahead.',
      },
    ],
    packages: [
      'gangtok-tsomgo-nathula-tour-package',
      'north-sikkim-lachung-yumthang-tour-package',
      'silk-route-zuluk-tour-package',
    ],
    askNote: 'Send photos of your IDs on WhatsApp two days before the trip and we apply for the permit and arrange the Sikkim-registered car.',
    waText: 'Hi, I need help with a Sikkim permit.',
    bookHref: '/tour-packages/',
    ctaHeading: 'Let us arrange your Sikkim permit',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'bagdogra-airport-transport-guide',
    title: 'Bagdogra Airport to Darjeeling and Gangtok: every way to travel',
    short: 'Bagdogra Airport transport guide',
    seoTitle: 'Bagdogra Airport to Darjeeling and Gangtok: Every Way Compared',
    description: 'Private taxi, prepaid counter, app cabs, shared jeep, bus and helicopter compared on price, time and comfort.',
    summary: 'The fastest door-to-door way from Bagdogra Airport to the hills is a private taxi: {darjeelingSedan} to Darjeeling in about 3 hours and {gangtokSedan} to Gangtok in about 5. Shared jeeps from Siliguri cost far less a seat but are slower and stop at town stands. App cabs serve the plains only.',
    facts: [
      { label: 'Taxi to Darjeeling', value: '{darjeelingSedan} · about 3 h' },
      { label: 'Taxi to Gangtok', value: '{gangtokSedan} · about 5 h' },
      { label: 'Shared jeep', value: 'About ₹300 a seat from Siliguri' },
      { label: 'Uber and Ola', value: 'Plains only, not the hills' },
    ],
    body: [
      { type: 'heading', text: 'Every option compared' },
      {
        type: 'table',
        head: ['Option', 'Darjeeling', 'Gangtok', 'Good for'],
        rows: [
          [
            '**Private taxi (pre-booked)**',
            '{darjeelingSedan}, ~3 h',
            '{gangtokSedan}, ~5 h',
            'Families, late flights, hotel drop',
          ],
          ['Prepaid counter taxi', 'Fixed, varies', 'Fixed, varies', 'No plan, daytime arrivals'],
          ['Uber / Ola', 'Rarely available', 'Rarely available', 'Siliguri and NJP only'],
          ['Shared jeep (from Siliguri)', '~₹300 a seat', '~₹400 a seat', 'Solo budget travellers'],
          ['Bus (from Siliguri)', 'Cheapest', 'Cheapest', 'Time is no concern'],
          ['Helicopter', 'Not offered', 'Several thousand ₹ a seat', 'When weather and seats allow'],
        ],
      },
      {
        type: 'note',
        text: 'Shared jeep, bus and helicopter prices are typical figures from {updated} and change often. Taxi fares are our own fixed fares.',
      },
      { type: 'heading', text: 'When a private taxi is worth it' },
      {
        type: 'list',
        items: [
          'You land after 2 pm and want to reach the hills before dark.',
          'You are travelling with children, elderly parents or a lot of luggage.',
          'Your hotel is outside the town centre, where shared jeeps do not go.',
          'You want to stop at Kurseong, Mirik or the Teesta on the way.',
        ],
      },
      {
        type: 'text',
        text: 'See the full [fare chart](/taxi/), or go straight to [Bagdogra to Darjeeling](/taxi/bagdogra-airport-to-darjeeling-taxi/) or [Bagdogra to Gangtok](/taxi/bagdogra-airport-to-gangtok-taxi/).',
      },
    ],
    faqs: [
      {
        q: 'Are Uber and Ola available at Bagdogra Airport?',
        a: 'Uber runs Uber Go and UberXL from Bagdogra for trips in the plains, such as Siliguri and Matigara. App cabs rarely take hill trips to Darjeeling or Gangtok, so book a private taxi for those.',
      },
      {
        q: 'Is there a prepaid taxi counter at Bagdogra?',
        a: 'Yes, outside arrivals. Fares are fixed, but you cannot choose the car or pre-book, and queues form after each flight.',
      },
      {
        q: 'What is the cheapest way from Bagdogra to Darjeeling?',
        a: 'A shared jeep from Siliguri at about ₹300 a seat, after a short taxi or auto ride from the airport. It is cheap but slow, and drops you at the Darjeeling motor stand rather than your hotel.',
      },
      {
        q: 'Is there a helicopter from Bagdogra to Gangtok?',
        a: 'Sikkim Tourism runs a helicopter service when weather allows, costing several thousand rupees a seat with strict luggage limits. Check the current schedule with Sikkim Tourism before planning around it.',
      },
    ],
    packages: ['darjeeling-gangtok-tour-package', 'darjeeling-tour-package', 'gangtok-tsomgo-nathula-tour-package'],
    askNote: 'Tell us your flight number and we meet you at arrivals with a name board. Delays cost nothing.',
    waText: 'Hi, I am landing at Bagdogra and need a taxi to the hills.',
    bookHref: '/book/',
    ctaHeading: 'Book your airport pickup',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'best-time-to-visit-darjeeling-sikkim',
    title: 'Best time to visit Darjeeling and Sikkim, month by month',
    short: 'Best time to visit',
    seoTitle: 'Best Time to Visit Darjeeling and Sikkim: Month-by-Month Guide',
    description: 'Weather, Kanchenjunga views, snow, crowds and what is open each month in Darjeeling, Gangtok, North Sikkim and the Dooars, with monsoon advice.',
    summary: 'The best time to visit Darjeeling and Sikkim is October to December for clear Kanchenjunga views, and March to May for spring flowers and mild weather. Come in January to March for snow at Tsomgo and Nathula. Avoid late June to September if you can, as rain and landslides block hill roads.',
    facts: [
      { label: 'Clearest views', value: 'October to December' },
      { label: 'Snow up high', value: 'December to March' },
      { label: 'Flowers and mild days', value: 'March to May' },
      { label: 'Best avoided', value: 'Late June to September' },
    ],
    body: [
      { type: 'heading', text: 'Month by month' },
      {
        type: 'table',
        head: ['Month', 'Weather', 'Kanchenjunga views', 'Snow', 'Crowds', 'Good to know'],
        rows: [
          [
            'January',
            'Cold, dry',
            'Very good',
            'Likely up high',
            'Low',
            'Tsomgo Lake frozen. Nathula and North Sikkim may close after snow.',
          ],
          [
            'February',
            'Cold, dry',
            'Very good',
            'Likely up high',
            'Low',
            'Tsomgo frozen. Losar falls in February or March.',
          ],
          [
            'March',
            'Cool, some haze',
            'Good',
            'Possible up high',
            'Rising',
            'Tsomgo starts to thaw late in the month. Rhododendrons begin.',
          ],
          ['April', 'Mild', 'Fair, hazy', 'At Zero Point', 'High', 'Rhododendrons in Yumthang, Varsey and Okhrey.'],
          ['May', 'Mild, pre-monsoon showers', 'Fair, hazy', 'At Zero Point', 'Peak', 'School holidays. Book early.'],
          ['June', 'Monsoon arrives', 'Poor', 'Rare', 'Falling', 'Dooars parks close from 16 June.'],
          ['July', 'Heavy rain', 'Poor', 'No', 'Low', 'Landslides likely. Dooars parks closed.'],
          ['August', 'Heavy rain', 'Poor', 'No', 'Low', 'Landslides likely. Dooars parks closed.'],
          ['September', 'Rain easing', 'Improving', 'No', 'Rising', 'Dooars parks reopen after 15 September.'],
          [
            'October',
            'Clear, cool',
            'Excellent',
            'Rare',
            'Peak at Durga Puja',
            'The best month for views. Book early around the Puja holidays.',
          ],
          [
            'November',
            'Clear, cold nights',
            'Excellent',
            'Possible up high',
            'Medium',
            'Sittong orange season begins.',
          ],
          [
            'December',
            'Cold, clear',
            'Excellent',
            'Likely up high',
            'High at Christmas',
            'Snow may close Nathula on some days.',
          ],
        ],
      },
      { type: 'note', text: 'Weather varies from year to year. The table shows typical patterns, not a forecast.' },
      { type: 'heading', text: 'What is open, and when' },
      {
        type: 'list',
        items: [
          '**Nathula Pass** is usually open to Indian citizens from Wednesday to Sunday, all year, but closes after heavy snow or on army orders. See our [Nathula Pass guide](/guides/nathula-pass-guide/).',
          '**Tsomgo Lake** is usually frozen from January to March. The road stays open on most days, subject to snow.',
          '**North Sikkim** (Lachung, Yumthang, Lachen, Gurudongmar) is open most of the year, but snow and landslides close the roads for days at a time. Permits are sometimes paused at short notice.',
          '**Gorumara and Jaldapara** in the Dooars close from 16 June to 15 September.',
          '**Darjeeling, Gangtok, Kalimpong and Pelling** are open all year.',
        ],
      },
      { type: 'heading', text: 'Travelling in the monsoon' },
      {
        type: 'text',
        text: 'From late June to September, landslides close hill roads on many days. NH10, the main road to Gangtok along the Teesta, is the road most often affected, and it has had repeated closures since the October 2023 flood. When it shuts, we take longer routes through Lava or Kalimpong where they are open.',
      },
      {
        type: 'list',
        items: [
          'Keep one spare day before your flight home.',
          'Start early and aim to finish hill driving before dark.',
          'Choose a flexible plan. Sikkim permits for North Sikkim may be paused after heavy rain.',
          'Pack a rain jacket and shoes with good grip.',
        ],
      },
      {
        type: 'text',
        text: 'The monsoon has its rewards: green hills, waterfalls at full flow, fewer people and lower hotel rates.',
      },
      { type: 'heading', text: 'Festivals and busy dates' },
      {
        type: 'list',
        items: [
          '**Losar**, the Tibetan new year, falls in February or March. Monasteries in Gangtok, Darjeeling and Kalimpong hold dances and prayers.',
          '**Saga Dawa**, in May or June by the lunar calendar, marks the Buddha’s birth, enlightenment and death. Gangtok holds a procession.',
          '**Durga Puja**, in late September or October, is the busiest week of the year. Cars and hotels sell out across the hills.',
          '**Christmas and New Year** bring big crowds to Darjeeling and Gangtok.',
        ],
      },
      {
        type: 'note',
        text: 'Road and permit rules change with weather and army orders. We confirm the current position with every booking. Last checked {updated}.',
      },
    ],
    faqs: [
      {
        q: 'Which month is best for Kanchenjunga views?',
        a: 'October to December. The monsoon has washed the dust out of the air, and most mornings are clear. January and February are also clear but much colder.',
      },
      {
        q: 'When can I see snow in Sikkim?',
        a: 'From about December to March at Tsomgo Lake, Nathula and Zero Point in North Sikkim. Darjeeling and Gangtok towns see snow only on a few days, if at all.',
      },
      {
        q: 'Is it safe to visit Darjeeling and Sikkim in the monsoon?',
        a: 'It is possible, but landslides close hill roads on many days from late June to September. Keep a spare day, travel in daylight and avoid tight flight connections.',
      },
      {
        q: 'When are the Dooars national parks closed?',
        a: 'Gorumara and Jaldapara close from 16 June to 15 September every year for the monsoon.',
      },
      {
        q: 'Is Durga Puja a good time to visit?',
        a: 'The weather is usually good, but it is the busiest time of the year. Hotels, cars and flights fill early and prices rise, so book several weeks ahead.',
      },
    ],
    packages: [
      'darjeeling-gangtok-tour-package',
      'north-sikkim-lachung-yumthang-tour-package',
      'dooars-jungle-safari-tour-package',
    ],
    askNote: 'Send your dates and we tell you what is open, what the road is like and whether to swap a day around.',
    waText: 'Hi, I am planning a trip to Darjeeling and Sikkim. Which dates are best?',
    bookHref: '/tour-packages/',
    ctaHeading: 'Plan your trip for the right season',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'nathula-pass-guide',
    title: 'Nathula Pass guide: permit, opening days and what to expect',
    short: 'Nathula Pass guide',
    seoTitle: 'Nathula Pass Guide 2026: Permit, Opening Days and Timings',
    description: 'How to visit Nathula Pass from Gangtok: the permit, opening days, timings, Tsomgo Lake and Baba Mandir, altitude sickness and what to wear.',
    summary: 'Nathula Pass is the India–China border pass at 4,310 m, about 56 km from Gangtok. It is open only to Indian citizens, usually from Wednesday to Sunday, with a permit applied for a day ahead through a registered operator. Most visitors combine it with Tsomgo Lake and Baba Mandir in one day trip from Gangtok.',
    facts: [
      { label: 'Altitude', value: '4,310 m' },
      { label: 'From Gangtok', value: '56 km · 2.5 to 3 h each way' },
      { label: 'Open', value: 'Wednesday to Sunday, Indians only' },
      { label: 'Permit', value: 'A day ahead, via an operator' },
    ],
    body: [
      { type: 'heading', text: 'Nathula at a glance' },
      {
        type: 'table',
        head: [],
        rows: [
          ['Altitude', '4,310 m'],
          ['Distance from Gangtok', 'About 56 km, 2.5 to 3 hours each way'],
          ['Who can visit', 'Indian citizens only'],
          ['Open', 'Usually Wednesday to Sunday'],
          ['Permit', 'Through a registered operator, a day ahead'],
          ['Vehicle', 'Sikkim-registered car with a permitted driver'],
          ['Combine with', 'Tsomgo Lake (3,753 m) and Baba Mandir'],
        ],
        rowHeads: true,
      },
      { type: 'heading', text: 'The permit' },
      {
        type: 'text',
        text: 'You cannot apply for the Nathula permit yourself. A registered tour operator applies for it, usually a day before the trip, so plan to be in Gangtok the day before.',
      },
      {
        type: 'list',
        items: [
          'An original photo ID for every traveller: Aadhaar, passport, voter ID or driving licence. A PAN card is not accepted.',
          'For children: a birth certificate, school ID or Aadhaar.',
          'Two passport-size photos per person.',
        ],
      },
      {
        type: 'text',
        text: 'Carry the originals on the day, as they are checked on the road. For the full rules, see our [Sikkim permit guide](/guides/sikkim-permit-guide/).',
      },
      { type: 'heading', text: 'Opening days and closures' },
      {
        type: 'text',
        text: 'Nathula is usually open from Wednesday to Sunday. It closes without much notice after heavy snow, on army orders, or for official events. Snow closures are most common from December to March. If Nathula is closed on your day, the Tsomgo Lake and Baba Mandir trip often still runs.',
      },
      { type: 'heading', text: 'A typical day' },
      {
        type: 'list',
        items: [
          '**7 to 8 am:** leave Gangtok. Early starts give the best chance of clear skies.',
          '**Mid-morning:** stop at Tsomgo Lake, then drive on to Nathula.',
          '**Late morning:** time at the pass. The weather turns quickly, so visits are kept short.',
          '**Early afternoon:** stop at Baba Mandir on the way back.',
          '**3 to 4 pm:** back in Gangtok, before the afternoon cloud and early dark.',
        ],
      },
      { type: 'heading', text: 'Altitude sickness' },
      {
        type: 'text',
        text: 'Nathula is high enough for altitude sickness. Headache, dizziness, nausea and breathlessness are the common signs.',
      },
      {
        type: 'list',
        items: [
          'Spend at least one night in Gangtok before going up.',
          'Walk slowly at the pass and avoid running or climbing stairs fast.',
          'Drink water, eat a light breakfast and avoid alcohol the night before.',
          'If you feel unwell, tell the driver. The cure is to go down.',
        ],
      },
      {
        type: 'text',
        text: 'Small children, older travellers, pregnant women and anyone with heart, lung or blood pressure problems should ask a doctor before the trip. Many families let them wait at Tsomgo Lake, which is lower.',
      },
      { type: 'heading', text: 'What to wear' },
      {
        type: 'list',
        items: [
          'A warm jacket, even in summer. It can be near freezing at the pass.',
          'Thermal inners, gloves, a woollen cap and warm socks.',
          'Shoes with good grip for snow and ice. Snow boots can be hired on the way.',
          'Sunglasses and sunscreen, as the sun on snow is strong.',
        ],
      },
      {
        type: 'text',
        text: 'Photography of army posts and soldiers is not allowed. Follow the instructions of the army staff at the pass.',
      },
      { type: 'heading', text: 'Book it as part of a package' },
      {
        type: 'text',
        text: 'Our [Gangtok, Tsomgo and Nathula tour package](/tour-packages/gangtok-tsomgo-nathula-tour-package/) includes the permit, a Sikkim-registered car and the airport transfers. You only send your ID copies and photos.',
      },
      {
        type: 'note',
        text: 'Opening days and permit rules change with weather and army orders. We confirm the current position with every booking. Last checked {updated}.',
      },
    ],
    faqs: [
      {
        q: 'Which days is Nathula Pass open?',
        a: 'Nathula is usually open to Indian citizens from Wednesday to Sunday. It is closed on Mondays and Tuesdays, and on other days after heavy snow or on army orders.',
      },
      {
        q: 'Can foreigners visit Nathula?',
        a: 'No. Nathula is open only to Indian citizens. Foreign nationals can usually visit Tsomgo Lake with the right permit, arranged through a registered operator.',
      },
      {
        q: 'How far is Nathula from Gangtok?',
        a: 'About 56 km, which takes about 2.5 to 3 hours each way on a mountain road with army check posts.',
      },
      {
        q: 'What documents do I need for the Nathula permit?',
        a: 'An original photo ID for each traveller (Aadhaar, passport, voter ID or driving licence) and two passport-size photos. Send copies to your operator at least a day before.',
      },
      {
        q: 'Is Nathula safe for children and elderly travellers?',
        a: 'At 4,310 m, the air is thin and cold. Small children, older travellers and anyone with heart, lung or blood pressure problems should ask a doctor first, and may be happier stopping at Tsomgo Lake.',
      },
    ],
    packages: [
      'gangtok-tsomgo-nathula-tour-package',
      'darjeeling-gangtok-tour-package',
      'north-sikkim-lachung-yumthang-tour-package',
    ],
    askNote: 'Send your ID photos a day ahead and we apply for the Nathula permit and send a Sikkim-registered car to your Gangtok hotel.',
    waText: 'Hi, I want to visit Nathula Pass. Please check the permit.',
    bookHref: '/tour-packages/gangtok-tsomgo-nathula-tour-package/',
    ctaHeading: 'Let us arrange your Nathula trip',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
  {
    slug: 'offbeat-places-north-bengal-sikkim',
    title: 'Offbeat places in North Bengal and Sikkim near Bagdogra',
    short: 'Offbeat places near Bagdogra',
    seoTitle: 'Offbeat Places in North Bengal and Sikkim near Bagdogra',
    description: 'Quiet hill villages near Bagdogra Airport, from Lava and Rishop to Sittong, Zuluk and Okhrey, with drive times and why each is worth a night.',
    summary: 'The best offbeat places near Bagdogra Airport are Sittong, Chatakpur and Tinchuley (about 3 to 3.5 hours away), Lava, Lolegaon, Rishop and Kolakham (about 4 to 4.5 hours), and Zuluk on the Silk Route (about 6 to 7 hours, permit needed). Most have homestays, quiet forest and views of Kanchenjunga without the crowds of Darjeeling and Gangtok.',
    facts: [
      { label: 'Nearest to the airport', value: 'Sittong, about 3 h' },
      { label: 'Kalimpong hills', value: 'Lava and Rishop, 4 to 4.5 h' },
      { label: 'Silk Route', value: 'Zuluk, 6 to 7 h, permit needed' },
      { label: 'Where you sleep', value: 'Homestays. Carry cash.' },
    ],
    body: [
      { type: 'heading', text: 'Offbeat places and drive times from Bagdogra' },
      {
        type: 'table',
        head: ['Place', 'Drive from Bagdogra', 'Why go'],
        rows: [
          [
            '**Lava**',
            'about 4 h',
            'A forest village at about 2,350 m, the gateway to Neora Valley National Park, with a large monastery.',
          ],
          ['**Lolegaon**', 'about 4 h', 'Pine forest walks and sunrise views of Kanchenjunga, close to Lava.'],
          ['**Rishop**', 'about 4.5 h', 'A small hamlet above Lava with a short walk to the Tiffindara viewpoint.'],
          [
            '**Kolakham**',
            'about 4.5 h',
            'Homestays facing Kanchenjunga, near Changey Falls and the edge of Neora Valley.',
          ],
          ['**Sittong**', 'about 3 h', 'Orange orchards in winter, a quiet river valley and a simple village life.'],
          [
            '**Chatakpur**',
            'about 3.5 h',
            'An eco village inside Senchal Wildlife Sanctuary, with forest walks and mountain views.',
          ],
          [
            '**Tinchuley**',
            'about 3.5 h',
            'Village homestays, orange orchards and a viewpoint over the Teesta and Rangit valleys.',
          ],
          ['**Takdah**', 'about 3.5 h', 'Old British-era bungalows, pine forest and tea gardens, close to Tinchuley.'],
          [
            '**Zuluk and the Silk Route**',
            'about 6 to 7 h',
            'The zig-zag road of the old trade route, with Nathang valley and Kupup higher up. Permit needed.',
          ],
          ['**Aritar**', 'about 5 h', 'A lake surrounded by forest on the way to the Silk Route. No permit needed.'],
          ['**Rinchenpong**', 'about 5 h', 'A West Sikkim village with a fine Kanchenjunga view and an old monastery.'],
          ['**Okhrey**', 'about 6 h', 'A base for the Varsey rhododendron sanctuary, best in March and April.'],
        ],
      },
      {
        type: 'note',
        text: 'Drive times are typical in good weather and can be much longer after landslides or in heavy traffic.',
      },
      { type: 'heading', text: 'Lava, Lolegaon, Rishop and Kolakham' },
      {
        type: 'text',
        text: 'These four villages sit close together in the Kalimpong hills and are easy to combine in two or three nights. Lava is the largest and has the most places to stay. Read more in our [Lava and Kolakham guide](/destinations/lava/).',
      },
      { type: 'heading', text: 'Sittong, Chatakpur, Tinchuley and Takdah' },
      {
        type: 'text',
        text: 'These are the nearest offbeat stops to the airport, in the hills between Kurseong, Darjeeling and the Teesta. They suit a weekend or a quiet night before or after Darjeeling.',
      },
      { type: 'heading', text: 'Zuluk and the Silk Route' },
      {
        type: 'text',
        text: 'The Silk Route in East Sikkim follows part of the old trade road to Tibet. The usual circuit runs through Aritar, Zuluk, Nathang valley and Kupup. Indian citizens need a protected-area permit, issued at Rongli through a registered operator, and nights in Nathang are cold all year. Read our [Silk Route and Zuluk guide](/destinations/silk-route/).',
      },
      { type: 'heading', text: 'Rinchenpong and Okhrey' },
      {
        type: 'text',
        text: 'These West Sikkim villages need no permit for Indian citizens. Rinchenpong has one of the best Kanchenjunga views in Sikkim. Okhrey is the base for the Varsey rhododendron sanctuary in spring.',
      },
      { type: 'heading', text: 'Tips for offbeat trips' },
      {
        type: 'list',
        items: [
          'Book homestays ahead, especially in October, November and the summer holidays.',
          'Carry cash. Cards and UPI do not always work.',
          'Expect patchy mobile network in the higher villages.',
          'Pack warm clothes. Nights are cold from October to March.',
          'Avoid the monsoon months if you can, as village roads are the first to be blocked.',
        ],
      },
      {
        type: 'text',
        text: 'See all our [tour packages](/tour-packages/), or ask us to build a custom trip around these villages.',
      },
      {
        type: 'note',
        text: 'Permit rules and road conditions change. We confirm the current position with every booking. Last checked {updated}.',
      },
    ],
    faqs: [
      {
        q: 'Which offbeat place is closest to Bagdogra Airport?',
        a: 'Sittong is about 3 hours away, and Chatakpur, Tinchuley and Takdah are about 3.5 hours. All four work for a weekend trip.',
      },
      {
        q: 'Do I need a permit for the Silk Route?',
        a: 'Yes. Indian citizens need a protected-area permit for Zuluk and the Silk Route beyond Rongli, arranged by a registered operator with a photo ID and photos. Aritar needs no permit.',
      },
      {
        q: 'Are there hotels in these villages?',
        a: 'Mostly homestays, with simple rooms, home-cooked food and hot water by bucket in some places. A few, such as Lava and Rinchenpong, also have small hotels.',
      },
      {
        q: 'Is mobile network available in offbeat places?',
        a: 'Coverage is patchy. Expect a weak signal or none in parts of Zuluk, Rishop and Okhrey. Tell family your plan, and carry some cash, as cards and UPI may not work.',
      },
      {
        q: 'What is the best time to visit Sittong for oranges?',
        a: 'Usually November to January, when the orchards are heavy with fruit. The exact weeks depend on the year.',
      },
    ],
    packages: [
      'lava-lolegaon-rishop-tour-package',
      'kolakham-sittong-offbeat-tour-package',
      'silk-route-zuluk-tour-package',
    ],
    askNote: 'Tell us how many nights you have and we suggest two or three villages that fit, with homestays we know.',
    waText: 'Hi, I want to plan an offbeat trip near Bagdogra.',
    bookHref: '/tour-packages/',
    ctaHeading: 'Plan an offbeat trip',
    published: '2026-10-19',
    updated: '2026-10-19',
    updatedLabel: '19 October 2026',
  },
];

export const GUIDES = overlayList('guide', GUIDES_START, (g) => g.slug, { fixed: true });

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug)!;
