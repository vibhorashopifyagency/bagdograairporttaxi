/**
 * Page words: the headings, paragraphs, button labels and lists written into
 * the page templates, so the admin can change them in the dashboard (Edit
 * pages) like any other content. Each page's words are one item of type
 * 'text'; the dashboard stores only the fields the admin changed, and the
 * build lays them over the starting copy below field by field, so a word
 * changed here in code still shows wherever the admin has not changed it.
 *
 * Words are plain text with a few marks (src/lib/rich-text.ts): [a link](/taxi/),
 * **bold**, *accent* and fill-ins such as {fromFare} or {freeCancel}, which
 * are written in from the fares, policies and business details at build,
 * so a fare or policy change never leaves old numbers in the text.
 *
 * Layout, colours, photos and the order of sections stay in the templates.
 * Templates read words with words()/wordsText()/wordsList() and mark each
 * spot with editAttr() so the page editor can find it. An unknown page or
 * field fails the build, so a typo cannot ship a blank heading.
 */
import { wordsToHtml, wordsToText, type WordVars } from '../lib/rich-text';
import { DESTINATIONS, type Destination } from './destinations';
import { GALLERY, GALLERY_CATEGORIES } from './gallery';
import { GUIDES } from './guides';
import { PACKAGES, type TourPackage } from './packages';
import { overlayFields } from './published';
import { ROUTES, inr, lowestFare, routeBySlug, type Route } from './routes';
import { BUSINESS, POLICY, SITE } from './site';

export interface WordField {
  /** What the admin sees beside the box: "Heading", "First paragraph". */
  label: string;
  /** The starting copy: one text, or a list (bullet points, paragraphs). */
  text: string | string[];
  /** Plain text only (page titles and search descriptions): no links or bold. */
  plain?: boolean;
  /** Shown under the box. */
  help?: string;
}

export interface WordPage {
  /** "Home page", "Every taxi route page". */
  name: string;
  group: 'pages' | 'policies' | 'shared' | 'templates';
  /** A page that shows these words, for "On the page"; a template names its first page. */
  path: string;
  /** One line under the name on Edit pages. */
  note?: string;
  /** Fill-ins only this page has, with what each is: { from: 'Where the route starts' }. */
  vars?: Record<string, string>;
  /** In the order the page shows them; a field's section is the part of its label before " · ". */
  fields: Record<string, WordField>;
}

const f = (label: string, text: string | string[], o: Omit<WordField, 'label' | 'text'> = {}): WordField => ({ label, text, ...o });
const seo = (title: string, description: string): Record<string, WordField> => ({
  seoTitle: f('Google listing · Page title', title, { plain: true, help: 'The blue link in Google and the browser tab. Aim for 30 to 65 characters.' }),
  seoDescription: f('Google listing · Search description', description, { plain: true, help: 'The grey text under the title in Google. Aim for 70 to 160 characters.' }),
});
/** A section opening: eyebrow, heading, the paragraph under it and the "see all" link, for SectionHead. */
const head = (section: string, prefix: string, w: { eyebrow?: string; title: string; lead?: string; link?: string }): Record<string, WordField> => ({
  ...(w.eyebrow !== undefined && { [`${prefix}Eyebrow`]: f(`${section} · Small heading above`, w.eyebrow) }),
  [`${prefix}Title`]: f(`${section} · Heading`, w.title),
  ...(w.lead !== undefined && { [`${prefix}Lead`]: f(`${section} · Paragraph under the heading`, w.lead) }),
  ...(w.link !== undefined && { [`${prefix}Link`]: f(`${section} · "See all" link`, w.link) }),
});

export const WORD_PAGES = {
  home: {
    name: 'Home page',
    group: 'pages',
    path: '/',
    note: 'Every heading and paragraph. Its Google title and description are under Business details, Search and launch.',
    fields: {
      heroBadge: f('Top · Badge above the heading', 'Drivers at Bagdogra Airport 24 hours a day'),
      heroTitle: f('Top · Main heading', 'Bagdogra Airport taxi to the *Himalayas*, at a fixed fare.', { help: 'Words between *stars* show in lime.' }),
      heroLead: f('Top · Paragraph', 'Your ride into the hills starts at arrivals. Fixed-fare taxis from Bagdogra Airport (IXB) and NJP to Darjeeling, Gangtok, Pelling and the Dooars from {fromFare}, with a verified local driver waiting for you with a name board.'),
      heroIncluded: f('Top · Ticks under the paragraph', ['Tolls, parking and GST included', '{freeWait} min free waiting', 'Free cancellation up to {freeCancel} h']),
      heroBook: f('Top · Book button (phones)', 'Book a taxi'),
      heroWhatsapp: f('Top · WhatsApp button', 'WhatsApp us'),
      heroPopular: f('Top · Label before the fare chips', 'Popular fares'),
      heroAllFares: f('Top · Last fare chip', 'All {routes} fares →'),
      ...head('Fares at a glance', 'fares', { eyebrow: 'Fares at a glance', title: 'How much is a taxi from Bagdogra Airport?', link: 'All {routes} fares' }),
      faresAnswer: f('Fares at a glance · The answer', 'A private taxi from Bagdogra Airport costs {darjeelingSedan} to Darjeeling ({darjeelingKm} km, {darjeelingTime}) and {gangtokSedan} to Gangtok ({gangtokKm} km, {gangtokTime}) in a sedan, one way. An Innova Crysta costs {darjeelingInnova} and {gangtokInnova}. Every fare includes tolls, parking, driver allowance and GST, and was last updated in {faresUpdatedDate}.', { help: 'Google and AI answers quote this paragraph, so the fill-ins keep its fares right.' }),
      faresNote: f('Fares at a glance · Note under the route cards', 'Night pickups ({nightFrom} to {nightTo}) add {nightCharge}. That is the only extra, ever. Fares to NJP, Siliguri and the Dooars are on the [full fare chart](/taxi/).'),
      ...head('Our cars', 'fleet', { eyebrow: 'Our cars', title: 'Which car is right for the hill roads?', lead: 'Every car is commercially registered, insured and cleaned before each pickup. Child seats on request.' }),
      fleetFare: f('Our cars · Before each car’s fare', 'Darjeeling from'),
      ...head('How booking works', 'how', { eyebrow: 'Secure booking in four steps', title: 'How do I book a taxi from Bagdogra Airport?', lead: 'Booked in a minute, confirmed on WhatsApp, driver details the evening before.' }),
      step1Title: f('How booking works · Step 1 heading', 'Pick your route and car'),
      step1Text: f('How booking works · Step 1 text', 'See the full fare before you pay anything.'),
      step2Title: f('How booking works · Step 2 heading', 'Pay {advance}% advance by UPI'),
      step2Text: f('How booking works · Step 2 text', 'Scan our QR code with any UPI app. Instant WhatsApp confirmation.'),
      step3Title: f('How booking works · Step 3 heading', 'Get your driver’s details'),
      step3Text: f('How booking works · Step 3 text', 'Name, photo and car number the evening before.'),
      step4Title: f('How booking works · Step 4 heading', 'Meet at arrivals'),
      step4Text: f('How booking works · Step 4 text', 'Your driver waits with a name board, even if the flight is late.'),
      howButton: f('How booking works · Button', 'Start booking'),
      howNote: f('How booking works · Note beside the button', 'Only {advance}% now. Free cancellation up to {freeCancel} hours before.'),
      ...head('Booking ahead or the counter', 'cmp', { eyebrow: 'Why book before you land', title: 'Booking ahead versus the airport prepaid counter', lead: 'The counter is fine if you are flexible. If you want a known fare, a named driver and no queue after a long flight, book ahead.' }),
      cmpUs: f('Booking ahead or the counter · Our column', 'Booked with us'),
      cmpThem: f('Booking ahead or the counter · Counter column', 'Prepaid counter'),
      row1Label: f('Booking ahead or the counter · Row 1', 'Fare'),
      row1Us: f('Booking ahead or the counter · Row 1, with us', 'Fixed and shown before you fly, tolls and GST included'),
      row1Them: f('Booking ahead or the counter · Row 1, at the counter', 'Fixed, but you only learn it at the counter'),
      row2Label: f('Booking ahead or the counter · Row 2', 'Waiting'),
      row2Us: f('Booking ahead or the counter · Row 2, with us', 'Driver at arrivals with your name board, flight tracked'),
      row2Them: f('Booking ahead or the counter · Row 2, at the counter', 'Queue at the counter after every landing'),
      row3Label: f('Booking ahead or the counter · Row 3', 'Car and driver'),
      row3Us: f('Booking ahead or the counter · Row 3, with us', 'You choose the car; driver’s name and number sent the evening before'),
      row3Them: f('Booking ahead or the counter · Row 3, at the counter', 'Whatever is next in line'),
      row4Label: f('Booking ahead or the counter · Row 4', 'Payment'),
      row4Us: f('Booking ahead or the counter · Row 4, with us', '{advance}% now by UPI or card, the rest after the trip'),
      row4Them: f('Booking ahead or the counter · Row 4, at the counter', 'Full fare up front, usually cash'),
      row5Label: f('Booking ahead or the counter · Row 5', 'If plans change'),
      row5Us: f('Booking ahead or the counter · Row 5, with us', 'Free cancellation up to {freeCancel} hours before, refund in {refundDays} working days'),
      row5Them: f('Booking ahead or the counter · Row 5, at the counter', 'No booking to cancel, no car held for you'),
      cmpButton: f('Booking ahead or the counter · Button', 'Lock in my fare'),
      cmpGuide: f('Booking ahead or the counter · Second button', 'Compare every way to travel'),
      ...head('Tour packages', 'pk', { eyebrow: 'Tour packages from Bagdogra', title: 'Darjeeling, Sikkim and Dooars tour packages', lead: 'One private car and driver for the whole trip, hotels with breakfast and dinner, permits arranged. Day-wise plans you can read before you pay.', link: 'All {packages} packages' }),
      pkBadge: f('Tour packages · Badge on the first package', 'Our pick for a first visit'),
      ...head('Destinations', 'dest', { eyebrow: 'Where we drive', title: 'Destinations across North Bengal, Sikkim and Bhutan', link: 'All destination guides' }),
      elseEyebrow: f('Destinations · Last tile, small heading', 'Somewhere else?'),
      elseTitle: f('Destinations · Last tile, heading', 'Name your place'),
      elseText: f('Destinations · Last tile, text', 'We quote any route across the hills.'),
      elseButton: f('Destinations · Last tile, link', 'Get a quote'),
      ...head('Travel guides', 'guides', { eyebrow: 'Travel guides from the driver’s seat', title: 'Plan the trip: permits, timings and the best months', lead: 'Written by the team that drives these roads every day and dated so you know they are current. Permits, Nathula opening days, how to get from the airport to the hills, and when to go.', link: 'All {guides} guides' }),
      whyBadge: f('Why us · Badge on the photo', 'Office at {town}, open now'),
      whyEyebrow: f('Why us · Small heading above', 'A local office, not a call centre'),
      whyTitle: f('Why us · Heading', 'Drivers who know every bend between the airport and the hills'),
      whyText: f('Why us · Paragraph', '{siteName} is a unit of {company}, based at {town}, minutes from the terminal, and has been driving travellers up to Darjeeling, Gangtok and beyond since {founded}. One phone number, answered around the clock, and a fare that is the same on every page of this site.'),
      statYears: f('Why us · Number box 1', 'Years on the road'),
      statRoutes: f('Why us · Number box 2', 'Fixed routes'),
      statPackages: f('Why us · Number box 3', 'Tour packages'),
      statReviews: f('Why us · Number box 4', 'Google reviews'),
      whyList: f('Why us · Ticks', ['Police-verified drivers trained for mountain roads', 'Flight tracking: your driver adjusts to delays without being asked', 'Written cancellation and refund policy, no small print', 'Permits for Tsomgo, Nathula and North Sikkim arranged for you']),
      whyAbout: f('Why us · Button', 'About us'),
      ...head('Gallery', 'gal', { eyebrow: 'Gallery', title: 'The roads we drive, in pictures', lead: 'Tsomgo Lake, the toy train, Nathula, the Dooars: what a taxi from Bagdogra can take you to.', link: 'All {photos} photos' }),
      faqTitle: f('Questions · Heading', 'Bagdogra Airport taxi: questions travellers ask', { help: 'The questions themselves are under General questions.' }),
    },
  },

  about: {
    name: 'About us',
    group: 'pages',
    path: '/about/',
    fields: {
      ...seo('About Us: Local Bagdogra Taxi and Tour Operator since {founded}', '{siteName} is a local taxi and tour operator based at Bagdogra, running airport transfers and tours across Darjeeling, Sikkim and the Dooars since {founded}.'),
      heroEyebrow: f('Top · Small heading above', 'Bagdogra · since {founded}'),
      heroTitle: f('Top · Main heading', 'A local team at Bagdogra, not a call centre'),
      answer: f('Story · Opening answer', '{siteName} is a unit of {company}, a taxi and tour operator based at {town}, a few minutes from the airport. Since {founded} we have driven travellers from Bagdogra Airport and NJP to Darjeeling, Gangtok, Pelling, North Sikkim and the Dooars with our own drivers and cars.'),
      owner: f('Story · Who runs it', 'The business is run by Pinku Singh, an Army veteran, which is where the name Jai Jawan and the saluting soldier on our badge come from. Travellers who book with us talk to him or his office directly, before the trip and during it.'),
      promisesTitle: f('Story · Promises heading', 'What we promise every traveller'),
      promises: f('Story · Promises', ['One fixed fare, shown before you pay, the same on every page of this site.', 'Drivers who know the hill roads, verified with police records and trained for mountain driving.', 'A real office you can visit, and one phone number that is answered 24 hours a day.', 'A written cancellation and refund policy, not "flexible" or "contact us".']),
      detailsTitle: f('Story · Business details heading', 'Business details', { help: 'The details themselves are under Business details.' }),
      statYears: f('Side box · Number 1', 'years'),
      statRoutes: f('Side box · Number 2', 'fixed routes'),
      statPackages: f('Side box · Number 3', 'packages'),
      talkTitle: f('Side box · Heading', 'Talk to us'),
      mapsButton: f('Side box · Map button', 'Find us on Google Maps'),
      founderCaption: f('Founder’s note · Photo caption', 'Pinku Singh at the {company} office, {street}, {town}.'),
      founderEyebrow: f('Founder’s note · Small heading above', 'A note from the founder'),
      founderTitle: f('Founder’s note · Heading', 'Why I run this the way I do'),
      founderNote: f('Founder’s note · Paragraphs', ['I served in the Army before I came home to Bagdogra and started this business in {founded}. Two things stayed with me from those years: you keep your word, and you look after the people in your charge. That is how I wanted a taxi service to be run.', 'So the fare you see on this site is the fare you pay. The car arrives when we said it would. The driver knows the hill road, because he drives it every week. And if anything goes wrong on the way, you can ring me or my office directly. The number is on every page.', 'Most of our travellers land at Bagdogra after a long journey and want to reach Darjeeling or Gangtok without any fuss. That is what we are here for.']),
      founderName: f('Founder’s note · Name', 'Pinku Singh'),
      founderRole: f('Founder’s note · Under the name', 'Founder, {company} · Bagdogra Airport Taxi'),
      galleryEyebrow: f('Gallery · Small heading above', 'Gallery'),
      galleryTitle: f('Gallery · Heading', 'Our cars and the roads we drive'),
      galleryLink: f('Gallery · "See all" link', 'All {photos} photos'),
      reviewsTitle: f('Reviews · Heading', 'Reviews from our travellers'),
    },
  },

  contact: {
    name: 'Contact',
    group: 'pages',
    path: '/contact/',
    fields: {
      ...seo('Contact Bagdogra Airport Taxi: Call or WhatsApp 24 Hours', 'Call or WhatsApp {phone}, 24 hours a day, to book a taxi or tour from Bagdogra Airport, NJP or Siliguri. Office at {town}.'),
      heroTitle: f('Top · Main heading', 'Contact us, day or night', { help: 'The line above it is the opening hours, under Business details.' }),
      answer: f('Opening answer', 'The quickest way to reach us is WhatsApp on {phone}. The same number takes calls 24 hours a day, every day of the year.'),
      cardWhatsapp: f('Cards · WhatsApp card', 'WhatsApp'),
      cardCall: f('Cards · Call card', 'Call'),
      cardEmail: f('Cards · Email card', 'Email'),
      officeTitle: f('Office · Heading', 'Our office'),
      mapsButton: f('Office · Map button', 'Open in Google Maps'),
      landingNote: f('Office · Note', '**Landing soon?** Message us your flight number on WhatsApp. We track it and your driver is at arrivals with a name board, even if you are late.'),
    },
  },

  faq: {
    name: 'Questions page',
    group: 'pages',
    path: '/faq/',
    note: 'The heading and its Google listing. The questions are under General questions.',
    fields: {
      ...seo('Bagdogra Taxi FAQ: Fares, Delays, Cancellations, Permits', 'Answers on booking a Bagdogra Airport taxi: fares, flight delays, cancellation and refunds, payment, night travel and Sikkim permits.'),
      title: f('Main heading', 'Frequently asked questions'),
      listTitle: f('Heading above the questions', 'Booking, payment and travel'),
    },
  },

  taxi: {
    name: 'Taxi fares (all routes)',
    group: 'pages',
    path: '/taxi/',
    fields: {
      ...seo('Bagdogra Taxi Fare Chart {faresUpdated}: All Routes', 'Fixed taxi fares from Bagdogra Airport, NJP and Siliguri to {routes} destinations by car type. All inclusive of tolls, parking and GST. Updated {faresUpdated}.'),
      heroEyebrow: f('Top · Small heading above', '{routes} routes · updated {faresUpdated}'),
      heroTitle: f('Top · Main heading', 'Taxi fares from Bagdogra Airport, NJP and Siliguri'),
      answer: f('Opening answer', 'Every fare below is a fixed, one-way price per car, including fuel, tolls, parking, driver allowance and GST. The only extra is {nightCharge} for pickups between {nightFrom} and {nightTo}. Fares were last updated in {faresUpdatedDate}.'),
      tableRoute: f('Fare tables · First column', 'Route'),
      tableDistance: f('Fare tables · Second column', 'Distance'),
      quoteNote: f('Note under the tables', 'Need a route that isn’t listed, a round trip or a car for several days? [Ask us for a quote](/contact/). We reply within 15 minutes, day or night.'),
    },
  },

  packages: {
    name: 'Tour packages (all)',
    group: 'pages',
    path: '/tour-packages/',
    fields: {
      ...seo('Sikkim and North Bengal Tour Packages from {packagesFrom}', '{packages} Darjeeling, Sikkim, Silk Route, Dooars and Bhutan tour packages from Bagdogra or NJP, from {packagesFrom} per person with private car and day-wise plans.'),
      heroEyebrow: f('Top · Small heading above', '{packages} packages · from {packagesFrom} per person'),
      heroTitle: f('Top · Main heading', 'Darjeeling, Sikkim, Dooars and Bhutan tour packages from Bagdogra'),
      answer: f('Opening answer', 'All {packages} packages start and end at Bagdogra Airport or NJP station, with one private car and driver for the whole trip, hotels with breakfast and dinner, and permits where needed. Prices start at {packagesFrom} per person with two sharing. We are a local Bagdogra operator, so you deal directly with the people who run the trip.'),
      customNote: f('Note under the packages', 'Want a different plan? We build custom tours for any number of days, starting from Kolkata, Delhi, Mumbai, Bengaluru or anywhere you fly in from. [Tell us your dates](/contact/).'),
      ctaTitle: f('Booking box · Heading', 'Get a custom tour quote'),
    },
  },

  destinations: {
    name: 'Destinations (all)',
    group: 'pages',
    path: '/destinations/',
    fields: {
      ...seo('North Bengal and Sikkim Destinations: Travel Guides from Bagdogra', 'Local guides to Darjeeling, Gangtok, Kalimpong, Mirik, Kurseong, Pelling, North Sikkim and the Dooars: best time, days needed and how to reach.'),
      heroEyebrow: f('Top · Small heading above', 'Where we drive'),
      heroTitle: f('Top · Main heading', 'Destinations we drive to'),
      heroLead: f('Top · Paragraph', 'Short, practical guides written by the people who drive these roads every day: best time, days needed, permits and how to reach from Bagdogra.'),
      galleryEyebrow: f('Gallery · Small heading above', 'Gallery'),
      galleryTitle: f('Gallery · Heading', 'See where the road goes'),
      galleryLink: f('Gallery · "See all" link', 'All {photos} photos →'),
      ctaTitle: f('Booking box · Heading', 'Not sure where to go first?'),
    },
  },

  gallery: {
    name: 'Gallery page',
    group: 'pages',
    path: '/gallery/',
    note: 'The words around the photos. The photos, their titles and links are under Photos.',
    fields: {
      ...seo('Photo Gallery: Darjeeling, Sikkim, Dooars and Our Cars', '{photos} photographs of the places we drive to from Bagdogra Airport: Darjeeling, Gangtok, Tsomgo Lake, Nathula, Pelling, North Sikkim, the Dooars and Bhutan, plus our cars.'),
      heroEyebrow: f('Top · Small heading above', '{photos} photographs · {regions} regions'),
      heroTitle: f('Top · Main heading', 'The roads we drive, in pictures'),
      heroLead: f('Top · Paragraph', 'Where a taxi from Bagdogra Airport can take you. Open any photo for the place, the fare and the trip it belongs to.'),
      shareTitle: f('Send your photos · Heading', 'Travelled with us? Send your photos'),
      shareText: f('Send your photos · Text', 'We would love to show real trips here: your car, your driver, the view you stopped for. Send a few pictures on WhatsApp and we will add them with your name, or without, as you prefer.'),
      shareButton: f('Send your photos · Button', 'Share photos on WhatsApp'),
      aboutTitle: f('About the photos · Heading', 'About these photographs'),
      aboutText: f('About the photos · Text', 'The landscape pictures are by photographers who published them under open licences, credited on our [photo credits page](/photo-credits/) with links to the originals. Car photos show the models we run; the exact car you get is confirmed with your driver\'s details the evening before.'),
      aboutDate: f('About the photos · Date line', 'Fares last updated {faresUpdated}.'),
      ctaTitle: f('Booking box · Heading', 'Seen somewhere you want to go?'),
    },
  },

  guides: {
    name: 'Travel guides (all)',
    group: 'pages',
    path: '/guides/',
    note: 'The list page. Each guide’s own title and answer are under Travel guides below.',
    fields: {
      ...seo('Travel Guides for Bagdogra, Darjeeling and Sikkim', 'Practical, up-to-date guides from a local Bagdogra taxi operator: Sikkim permits, getting from Bagdogra Airport to the hills, and more.'),
      heroEyebrow: f('Top · Small heading above', 'From the drivers’ seat'),
      heroTitle: f('Top · Main heading', 'Travel guides'),
      heroLead: f('Top · Paragraph', 'Answers to the questions our drivers hear every day, kept current.'),
      chipWriters: f('Top · Third chip', 'Written by our drivers'),
      listEyebrow: f('The guides · Small heading above', 'Start here'),
      listTitle: f('The guides · Heading', 'The guides'),
      listNote: f('The guides · Note beside the heading', 'Every guide ends with the date we last checked it against the road, the check posts and the weather.'),
      quickEyebrow: f('Quick answers · Small heading above', 'Quick answers'),
      quickTitle: f('Quick answers · Heading', 'What the phone rings with'),
      quickLink: f('Quick answers · "See all" link', 'All questions'),
      quick1Q: f('Quick answers · Card 1 question', 'Do Indians need a permit for Gangtok?'),
      quick1A: f('Quick answers · Card 1 answer', 'No. Only Tsomgo, Nathula, Zuluk and North Sikkim need one, and we arrange it.'),
      quick2Q: f('Quick answers · Card 2 question', 'How long is Bagdogra to Darjeeling by taxi?'),
      quick2A: f('Quick answers · Card 2 answer', 'About 3 hours door to door. Gangtok is about 5.'),
      quick3Q: f('Quick answers · Card 3 question', 'Which month has the clearest Kanchenjunga views?'),
      quick3A: f('Quick answers · Card 3 answer', 'October to December, once the monsoon has washed the air.'),
      quick4Q: f('Quick answers · Card 4 question', 'Which days is Nathula Pass open?'),
      quick4A: f('Quick answers · Card 4 answer', 'Usually Wednesday to Sunday, for Indian citizens only.'),
      quick5Q: f('Quick answers · Card 5 question', 'Nearest offbeat village to the airport?'),
      quick5A: f('Quick answers · Card 5 answer', 'Sittong, about 3 hours away, with orange orchards in winter.'),
      quick6Q: f('Quick answers · Card 6 question', 'Do Uber and Ola run from Bagdogra?'),
      quick6A: f('Quick answers · Card 6 answer', 'Only on the plains. Hill trips need a pre-booked taxi.'),
      quickMore: f('Quick answers · Link on each card', 'Full answer'),
      howEyebrow: f('How it works · Small heading above', 'How it works'),
      howTitle: f('How it works · Heading', 'Read, ask, go'),
      howLead: f('How it works · Paragraph', 'No guide covers the day you travel. That is what the WhatsApp number is for.'),
      step1Title: f('How it works · Step 1 heading', 'Read the guide'),
      step1Text: f('How it works · Step 1 text', 'Permits, opening days, fares and seasons, written by the people who drive these roads every week.'),
      step2Title: f('How it works · Step 2 heading', 'Send us your dates'),
      step2Text: f('How it works · Step 2 text', 'One WhatsApp message. We reply with the current road, weather and permit position, not a script.'),
      step3Title: f('How it works · Step 3 heading', 'We arrange the rest'),
      step3Text: f('How it works · Step 3 text', 'Permits applied for, the right car for the road, and a driver who knows where the tea stops are.'),
      howWhatsapp: f('How it works · WhatsApp button', 'Ask on WhatsApp'),
      dutyTitle: f('How it works · Card on the photo, heading', 'Team on duty now'),
      dutyText: f('How it works · Card on the photo, text', 'Replies on WhatsApp in minutes, every day of the year.'),
      whereEyebrow: f('Photos · Small heading above', 'Where the guides take you'),
      whereTitle: f('Photos · Heading', 'See the road for yourself'),
      whereLink: f('Photos · "See all" link', 'All {photos} photos'),
      ctaTitle: f('Booking box · Heading', 'Still have a question?'),
    },
  },

  'not-found': {
    name: 'Page not found (404)',
    group: 'pages',
    path: '/404/',
    note: 'What visitors see on a link that goes nowhere.',
    fields: {
      ...seo('Page not found', 'This page does not exist. Find taxi fares and tour packages from Bagdogra Airport.'),
      eyebrow: f('Small heading above', 'Error 404'),
      title: f('Heading', 'This road doesn’t go anywhere'),
      text: f('Paragraph', 'The page you’re looking for has moved or never existed. These are the routes people book most.'),
      button: f('Button', 'Back to the homepage'),
    },
  },

  'photo-credits': {
    name: 'Photo credits',
    group: 'pages',
    path: '/photo-credits/',
    note: 'The heading and paragraph. Each photo’s credit is under Photos.',
    fields: {
      ...seo('Photo Credits: Photographers and Licences for Images on This Site', 'The photographers and Creative Commons licences for every photograph used on bagdograairporttaxi.com, with links to the originals on Wikimedia Commons.'),
      title: f('Heading', 'Photo credits'),
      intro: f('Paragraph', 'The landscape and car photographs on this site are by the photographers below, used under the licence shown. Each links to the original on Wikimedia Commons. Photos marked CC BY-SA may be reused under the same licence; please credit the photographer, not us.'),
    },
  },

  cancellation: {
    name: 'Cancellation and refund policy',
    group: 'policies',
    path: '/cancellation-refund-policy/',
    note: 'The numbers (hours, refund %, days) are fill-ins from Business details, Policies, so they change there.',
    fields: {
      ...seo('Cancellation and Refund Policy', 'Free cancellation up to {freeCancel} hours before pickup with a full refund in {refundDays} working days. Clear terms for taxis and tour packages.'),
      title: f('Main heading', 'Cancellation and refund policy'),
      answer: f('Opening answer', 'Cancel a taxi up to {freeCancel} hours before pickup and we refund your full advance. Inside {freeCancel} hours we refund {lateRefund}%. Every refund goes back to the account you paid from within {refundDays} working days.'),
      taxiTitle: f('Taxi transfers · Heading', 'Taxi transfers'),
      tableWhen: f('Taxi transfers · Table, first column', 'When you cancel'),
      tableRefund: f('Taxi transfers · Table, second column', 'Refund of advance'),
      row1When: f('Taxi transfers · Row 1', 'More than {freeCancel} hours before pickup'),
      row1Refund: f('Taxi transfers · Row 1 refund', '100%'),
      row2When: f('Taxi transfers · Row 2', 'Within {freeCancel} hours of pickup'),
      row2Refund: f('Taxi transfers · Row 2 refund', '{lateRefund}%'),
      row3When: f('Taxi transfers · Row 3', 'No-show (no contact within 2 hours of the pickup time)'),
      row3Refund: f('Taxi transfers · Row 3 refund', 'None'),
      delayTitle: f('Delays · Heading', 'Flight and train delays'),
      delayText: f('Delays · Text', 'A delay is never a cancellation. We track your flight or train, and waiting is free for {freeWait} minutes after the actual arrival time. If your flight is cancelled by the airline, we refund 100% of your advance or move the booking to your new date for free.'),
      weCancelTitle: f('If we cancel · Heading', 'If we cancel'),
      weCancelText: f('If we cancel · Text', 'If we cannot provide the car, or a road closure makes the trip impossible, you get a 100% refund or a free change of date. Landslide reroutes are driven at no extra charge.'),
      toursTitle: f('Tour packages · Heading', 'Tour packages'),
      tours: f('Tour packages · Points', ['More than 15 days before the start: full refund minus any non-refundable hotel deposits, which we show in your quote.', '7 to 15 days before: 50% refund of the amount paid.', 'Less than 7 days before: refund of the unused car portion only.']),
      howTitle: f('How to cancel · Heading', 'How to cancel'),
      howText: f('How to cancel · Text', 'Send a WhatsApp message to {phone} or email {email} with your name and trip date. The time we receive your message is the cancellation time. You get a written confirmation and the refund amount.'),
      effective: f('Date line', '{siteName}. Policy effective {faresUpdated}.'),
    },
  },

  terms: {
    name: 'Terms of service',
    group: 'policies',
    path: '/terms/',
    fields: {
      ...seo('Terms of Service', 'Booking terms for {siteName} taxi transfers and tour packages.'),
      title: f('Main heading', 'Terms of service'),
      faresTitle: f('Fares · Heading', 'Fares'),
      faresText: f('Fares · Text', 'Fares are per car, one way, and include fuel, tolls, parking, driver allowance and GST. A night charge of {nightCharge} applies to pickups between {nightFrom} and {nightTo}. Permit fees for protected areas in Sikkim are extra and charged at cost.'),
      bookingTitle: f('Booking · Heading', 'Booking'),
      bookingText: f('Booking · Text', 'A booking is confirmed when we receive the {advance}% advance and send a written confirmation. Sending an enquiry alone does not reserve a car. The balance is paid to the driver at the end of the trip.'),
      waitingTitle: f('Waiting · Heading', 'Waiting and changes'),
      waitingText: f('Waiting · Text', 'Waiting is free for {freeWait} minutes after the actual arrival of your flight or train. Extra stops and detours beyond the agreed route are charged at the rates given in advance.'),
      safetyTitle: f('Luggage and safety · Heading', 'Luggage and safety'),
      safetyText: f('Luggage and safety · Text', 'Please keep to the seat and luggage limits shown for each car. Drivers may refuse to drive unsafely, including above the speed limit or in dangerous weather, and may pause a trip when a road is closed by the authorities.'),
      cancelTitle: f('Cancellations · Heading', 'Cancellations'),
      cancelText: f('Cancellations · Text', 'See the [cancellation and refund policy](/cancellation-refund-policy/).'),
    },
  },

  privacy: {
    name: 'Privacy policy',
    group: 'policies',
    path: '/privacy/',
    fields: {
      ...seo('Privacy Policy', 'How {siteName} handles the details you share when you book a taxi or tour.'),
      title: f('Main heading', 'Privacy policy'),
      intro: f('Opening paragraph', 'We collect only what we need to run your trip: your name, mobile number, pickup and drop details, flight or train number and, for Sikkim permits, copies of photo ID.'),
      useTitle: f('How we use it · Heading', 'How we use it'),
      use: f('How we use it · Points', ['To confirm your booking and send driver details on WhatsApp or SMS.', 'To apply for Sikkim protected-area permits on your behalf.', 'To ask for a review after your trip, once.']),
      share: f('How we use it · After the points', 'We do not sell or share your details with anyone except the driver, the hotels in your package and permit authorities.'),
      paymentsTitle: f('Payments · Heading', 'Payments'),
      paymentsText: f('Payments · Text', 'You pay by UPI or in cash. We keep a record of the amount, the date and the UPI transaction reference so your booking shows as paid. We never see your UPI PIN or card details.'),
      siteTitle: f('Website and booking system · Heading', 'This website and our booking system'),
      siteText: f('Website and booking system · Paragraphs', ['This site sets no advertising cookies. The booking form runs in your browser and sends nothing to us until you press Confirm on WhatsApp or the payment button. At that moment your trip details, name and mobile number are saved in our booking system and a copy is emailed to our office, so we can arrange the trip even if the WhatsApp message does not arrive. If your connection drops, your browser keeps the request for up to 7 days and sends it the next time you open this site.', 'The booking system is hosted by Vercel and its database by Neon. Only our office team can sign in to it, and every time someone opens customer details it is logged.']),
      keepTitle: f('How long we keep it · Heading', 'How long we keep it'),
      keepText: f('How long we keep it · Text', 'We keep your name and mobile number for 24 months after your trip, then remove them automatically. We keep the trip, fare and payment totals without your name, for our accounts.'),
      rightsTitle: f('Your rights · Heading', 'Your rights'),
      rightsText: f('Your rights · Text', 'Under the Digital Personal Data Protection Act, 2023, you can ask us to show, correct or delete your data. Email {email}. ID copies for permits are deleted within 30 days of your trip.'),
      effective: f('Date line', 'Effective {faresUpdated}.'),
    },
  },

  'book-box': {
    name: 'Booking box',
    group: 'shared',
    path: '/faq/',
    note: 'The dark “Ready to book?” box at the bottom of most pages. Some pages set their own heading.',
    fields: {
      title: f('Heading', 'Ready to book?'),
      text: f('Text', 'Pay a {advance}% advance securely and get instant confirmation on WhatsApp. Free cancellation up to {freeCancel} hours before pickup.'),
      bookButton: f('Book button', 'Book now'),
      whatsappButton: f('WhatsApp button', 'WhatsApp'),
    },
  },

  promises: {
    name: 'Promises strip',
    group: 'shared',
    path: '/',
    note: 'The four promises under the home page photo and on the fares, packages and guides pages.',
    fields: {
      p1Title: f('Promise 1 · Heading', 'Fixed fares, all inclusive'),
      p1Text: f('Promise 1 · Text', 'Tolls, parking, driver allowance and GST included.'),
      p2Title: f('Promise 2 · Heading', '{freeWait} min free waiting'),
      p2Text: f('Promise 2 · Text', 'We track your flight or train. Delays cost nothing.'),
      p3Title: f('Promise 3 · Heading', 'Free cancellation {freeCancel} h'),
      p3Text: f('Promise 3 · Text', 'Full refund of your advance within {refundDays} working days.'),
      p4Title: f('Promise 4 · Heading', 'Secure advance payment'),
      p4Text: f('Promise 4 · Text', 'Pay {advance}% by UPI. Balance after the trip.'),
    },
  },

  journey: {
    name: 'The journey story',
    group: 'shared',
    path: '/',
    note: 'The six moments on the home page. The heading with the changing word stays as designed.',
    fields: {
      lead: f('Top · Paragraph under the heading', 'Here is how a trip with us goes: six moments between the arrivals door at Bagdogra and the drive back down, told the way our travellers tell it when they get home.'),
      m1Moment: f('Moment 1 · Label', 'Touchdown'),
      m1Title: f('Moment 1 · Heading', 'You step out of arrivals, and your name is already on a board'),
      m1Text: f('Moment 1 · Text', 'We track your flight, so your driver is at the door when you walk out, not stuck in a queue. Waiting is free for {freeWait} minutes after you land, and a delay never cancels the booking. Bags in, seat belts on, the mountains are three hours away.'),
      m1Link: f('Moment 1 · Link', 'What happens at the airport'),
      m2Moment: f('Moment 2 · Label', 'The first hour'),
      m2Title: f('Moment 2 · Heading', 'The plains fall away and the tea gardens begin'),
      m2Text: f('Moment 2 · Text', 'Past Siliguri the road starts to climb. Rohini Road winds through tea bushes that run to the horizon, and your driver pulls over at Kurseong for a cup of Darjeeling tea and a plate of momos, at the stall with the best view, because he stops there every week.'),
      m2Link: f('Moment 2 · Link', 'Kurseong on the way up'),
      m3Moment: f('Moment 3 · Label', 'The bend after Ghum'),
      m3Title: f('Moment 3 · Heading', 'Kanchenjunga fills the windscreen'),
      m3Text: f('Moment 3 · Text', 'Somewhere above Ghum the clouds part and the whole range is there, white and enormous. The toy train whistles past at Batasia Loop. Your driver knows exactly which bend it happens on, after {darjeelingKm} km of road he has driven a thousand times.'),
      m3Link: f('Moment 3 · Link', 'Darjeeling guide'),
      m4Moment: f('Moment 4 · Label', 'Evening'),
      m4Title: f('Moment 4 · Heading', 'Dropped at your hotel door, with the evening still yours'),
      m4Text: f('Moment 4 · Text', 'Chowrasta in Darjeeling or MG Marg in Gangtok: a slow walk, hot thukpa, a sky full of stars. Your driver’s number is saved in your phone, and ours is answered 24 hours a day in case plans change. Nothing to sort out, nothing to pay until the trip is done.'),
      m4Link: f('Moment 4 · Link', 'Gangtok guide'),
      m5Moment: f('Moment 5 · Label', 'The high road'),
      m5Title: f('Moment 5 · Heading', 'Yaks on the shore of a frozen lake, 3,753 m up'),
      m5Text: f('Moment 5 · Text', 'The permits for Tsomgo Lake, Nathula and North Sikkim are already stamped; we arranged them while you were packing. A Sikkim-registered car takes you up through pine and rhododendron to prayer flags snapping in the wind. Bring a jacket. You will want the photo.'),
      m5Link: f('Moment 5 · Link', 'How the permits work'),
      m6Moment: f('Moment 6 · Label', 'The way home'),
      m6Title: f('Moment 6 · Heading', 'Back down to Bagdogra with a phone full of mountains'),
      m6Text: f('Moment 6 · Text', 'The same driver, the same car, timed to your flight, and the stories you will still be telling next winter. {tagline}: that is the whole promise, and the reason travellers come back to us for their next trip up the hill.'),
      m6Link: f('Moment 6 · Link', 'Plan the whole trip'),
      bookButton: f('Bottom · Book button', 'Start your journey'),
      whatsappButton: f('Bottom · WhatsApp button', 'Plan it on WhatsApp'),
      note: f('Bottom · Note beside the buttons', 'Only {advance}% now. Free cancellation up to {freeCancel} hours before.'),
    },
  },

  reviews: {
    name: 'Google reviews band',
    group: 'shared',
    path: '/',
    note: 'The heading over the drifting review cards. The reviews come from Google.',
    fields: {
      eyebrow: f('Small heading above', 'Google reviews'),
      title: f('Heading', 'What travellers say about us', { help: 'The About page sets its own heading.' }),
      lead: f('Paragraph', 'Real travellers, real trips from Bagdogra Airport. Every card links to the review on Google.'),
    },
  },

  'fare-checker': {
    name: 'Fare checker and fare board',
    group: 'shared',
    path: '/',
    note: 'The white fare box in the home page photo, and the label of the moving fare board.',
    vars: { advanceAmount: 'The advance on the fare shown, worked out as the visitor picks a route and car' },
    fields: {
      badge: f('Fare box · Line at the top', 'Instant fixed fare, no surprises'),
      routeLabel: f('Fare box · Route question', 'Where are you going?'),
      carLabel: f('Fare box · Car label', 'Car'),
      priceNote: f('Fare box · Beside the price', 'One way, all inclusive'),
      updated: f('Fare box · Date under it', 'Updated {faresUpdated}'),
      button: f('Fare box · Button', 'Book this taxi'),
      footnote: f('Fare box · Line under the button', 'Pay only {advanceAmount} now · Free cancellation up to {freeCancel} h · Price locked at booking'),
      boardLabel: f('Fare board · Label', 'Fixed fares · {faresUpdated}'),
    },
  },

  footer: {
    name: 'Footer',
    group: 'shared',
    path: '/',
    note: 'The dark band at the bottom of every page. Links to pages stay as designed.',
    fields: {
      p1Title: f('Promises row · 1 heading', 'Fixed, all-inclusive fares'),
      p1Text: f('Promises row · 1 text', 'Tolls, parking, driver allowance and GST are in the price you see.'),
      p2Title: f('Promises row · 2 heading', '{freeWait} minutes free waiting'),
      p2Text: f('Promises row · 2 text', 'We track your flight or train, so a delay costs you nothing.'),
      p3Title: f('Promises row · 3 heading', 'Free cancellation up to {freeCancel} h'),
      p3Text: f('Promises row · 3 text', 'Advance refunded in {refundDays} working days.'),
      p4Title: f('Promises row · 4 heading', 'Only {advance}% advance'),
      p4Text: f('Promises row · 4 text', 'Pay by UPI or card. Settle the rest with the driver after the trip.'),
      p5Title: f('Promises row · 5 heading', 'One number, 24 hours'),
      p5Text: f('Promises row · 5 text', 'A local office in Bagdogra that answers calls and WhatsApp day and night.'),
      blurb: f('About us · Paragraph under the tagline', 'Private airport taxis and tour packages from Bagdogra across Darjeeling, Sikkim, the Dooars and Bhutan. A local office, one phone number, fixed fares, and drivers who know these roads in every season.'),
      bookButton: f('About us · Book button', 'Book a taxi'),
      fleetTitle: f('About us · Cars heading', 'Our fleet'),
      contactTitle: f('Get in touch · Heading', 'Get in touch'),
      callLabel: f('Get in touch · Phone label', 'Call or WhatsApp, 24 hours a day'),
      emailLabel: f('Get in touch · Email label', 'Email for quotes and invoices'),
      officeLabel: f('Get in touch · Office label', 'Office'),
      directions: f('Get in touch · Directions link', 'Get directions'),
      pickupsLabel: f('Get in touch · Pickups label', 'Pickups'),
      pickupsText: f('Get in touch · Pickups text', 'Arrivals gate at Bagdogra Airport, the NJP station forecourt, or any hotel or address in Siliguri. Night charge of {nightCharge} between {nightFrom} and {nightTo}.'),
      stepsNote: f('Get in touch · Booking note', '**Booking in three steps.** Tell us your route, date and vehicle on WhatsApp or the [booking form](/book/). Pay {advance}% to confirm. Your driver\'s name, number and car details reach you the evening before pickup.'),
      colAirport: f('Link columns · 1 heading', 'From Bagdogra Airport'),
      colNjp: f('Link columns · 2 heading', 'From NJP station'),
      colPackages: f('Link columns · 3 heading', 'Tour packages'),
      colDestinations: f('Link columns · 4 heading', 'Destinations'),
      colGuides: f('Link columns · 5 heading', 'Travel guides'),
      colCompany: f('Link columns · 6 heading', 'Company'),
      areasLabel: f('Small print · "Where we drive" label', 'Where we drive.'),
      areas: f('Small print · Places we drive to', ['Bagdogra Airport (IXB)', 'NJP station', 'Siliguri', 'Darjeeling', 'Kurseong', 'Mirik', 'Kalimpong', 'Gangtok', 'Pelling', 'Lachung and Lachen', 'Ravangla', 'Namchi', 'Zuluk and the Silk Route', 'Lava and Lolegaon', 'Jaldapara', 'Gorumara', 'Phuentsholing (Bhutan border)', 'Kakarbhitta (Nepal border)']),
      faresLabel: f('Small print · "About the fares" label', 'About the fares.'),
      faresText: f('Small print · About the fares', 'Every fare on this site is one way, per vehicle, in Indian rupees, and includes fuel, driver allowance, tolls, parking and GST. Permit fees for Sikkim\'s protected areas and the night charge are stated beside each table. Fares last updated {faresUpdated}.'),
      rights: f('Bottom line · After the company name', 'All rights reserved.'),
    },
  },

  welcome: {
    name: 'Welcome popup',
    group: 'shared',
    path: '/',
    note: 'The card that pops up 15 seconds after a visitor arrives, with the happy photo. Once a day per visitor; not on the booking form or trip pages.',
    fields: {
      eyebrow: f('Small heading above', 'Welcome to the hills'),
      title: f('Heading', 'Your mountain holiday starts the moment you land'),
      text: f('Text', 'A driver with your name at the arrivals door, fixed fares from {fromFare}, {freeWait} minutes of free waiting and free cancellation up to {freeCancel} hours before pickup. Pay only {advance}% now.'),
      bookButton: f('Book button', 'Book my taxi'),
      whatsappButton: f('WhatsApp button', 'Ask on WhatsApp'),
      later: f('"Not now" link', 'Maybe later'),
    },
  },

  'route-page': {
    name: 'Every taxi route page',
    group: 'templates',
    path: `/taxi/${ROUTES[0]?.slug ?? ''}/`,
    note: 'The fixed headings and lines on all route pages at once. Each route’s own answer, stops, tips and questions are under its form.',
    vars: {
      from: 'Where the route starts (short name)',
      to: 'Where it goes (short name)',
      fromFull: 'Where it starts (full name)',
      toFull: 'Where it goes (full name)',
      km: 'Distance in km',
      time: 'Driving time',
      via: 'The way the driver takes',
      fare: 'Lowest fare on the route',
      sedan: 'Sedan fare',
      suv: 'SUV fare',
      innova: 'Innova Crysta fare',
      traveller: 'Tempo Traveller fare',
      group: 'The group of routes',
      place: 'The destination’s name',
      placeShort: 'The destination’s short name',
      returnLink: 'A link to the way back',
    },
    fields: {
      ...seo('{from} to {to} Taxi Fare {fare} ({km} km)', '{from} to {to} taxi: sedan {sedan}, Innova {innova}, {km} km, {time}. Fixed all-inclusive fare, free cancellation.'),
      heroEyebrow: f('Top · Small heading above', 'Fixed fare · one way · all inclusive'),
      heroTitle: f('Top · Main heading', '{fromFull} to {toFull} taxi'),
      faresTitle: f('Fares · Heading', '{from} to {to} fare by car'),
      stopsTitle: f('Route and stops · Heading', 'Route and stops'),
      stopsText: f('Route and stops · Text before the stops', 'Your driver takes {via}. Short stops are included for tea, photos and rest.'),
      tipsTitle: f('Tips · Heading', 'Local tips for this trip'),
      aboutTitle: f('About the place · Heading', 'About {place}'),
      guideLink: f('About the place · Link to its guide', 'Read our {place} travel guide'),
      returnText: f('About the place · Way back line', 'Going back? See the {returnLink}.'),
      fareQ: f('Questions every route answers · Fare question', 'What is the taxi fare from {from} to {to}?'),
      fareA: f('Questions every route answers · Fare answer', '{sedan} in a sedan, {suv} in an SUV, {innova} in an Innova Crysta and {traveller} in a 12-seat Tempo Traveller, one way, including tolls, parking, driver allowance and GST.'),
      timeQ: f('Questions every route answers · Time question', 'How long does {from} to {to} take by car?'),
      timeA: f('Questions every route answers · Time answer', 'The {km} km drive takes {time} via {via}.'),
      cancelQ: f('Questions every route answers · Cancel question', 'What happens if I cancel?'),
      cancelA: f('Questions every route answers · Cancel answer', 'Cancel up to {freeCancel} hours before pickup for a full refund of your advance, or get {lateRefund}% back inside {freeCancel} hours. Refunds take up to {refundDays} working days.'),
      sideFrom: f('Side box · Before the price', 'from'),
      sideNote: f('Side box · Under the price', 'one way · tolls, parking and GST included'),
      bookButton: f('Side box · Book button', 'Book this taxi'),
      whatsappButton: f('Side box · WhatsApp button', 'WhatsApp'),
      side1: f('Side box · Promise 1', '{freeWait} minutes free waiting after landing'),
      side2: f('Side box · Promise 2', 'Free cancellation up to {freeCancel} hours before'),
      side3: f('Side box · Promise 3', 'Pay {advance}% now, the rest after the trip'),
      packagesTitle: f('Lower down · Packages heading', 'Tour packages that include {placeShort}'),
      relatedTitle: f('Lower down · Other routes heading', 'Other {group} taxi routes'),
      ctaTitle: f('Booking box · Heading', 'Book your {from} to {to} taxi'),
    },
  },

  'package-page': {
    name: 'Every tour package page',
    group: 'templates',
    path: `/tour-packages/${PACKAGES[0]?.slug ?? ''}/`,
    note: 'The fixed headings and lines on all package pages at once. Each package’s summary, days and lists are under its form.',
    vars: { name: 'The package’s name', short: 'Its short name', nights: 'Nights', days: 'Days', price: 'Price per person', priceNote: 'What the price covers' },
    fields: {
      ...seo('{short} Tour Package {nights}N/{days}D from {price}', '{nights}N/{days}D {short} tour from Bagdogra, from {price} per person. Private car, hotels, day-wise itinerary and clear inclusions.'),
      heroEyebrow: f('Top · Small heading above', '{nights} nights / {days} days · from Bagdogra or NJP'),
      heroTitle: f('Top · Main heading', '{name} tour package'),
      itineraryTitle: f('Day by day · Heading', 'Day-wise itinerary'),
      includedTitle: f('Included · Heading', 'Included'),
      excludedTitle: f('Not included · Heading', 'Not included'),
      placesText: f('Places · Before the links', 'Read more about the places on this trip:'),
      costQ: f('Questions every package answers · Price question', 'How much does the {name} tour cost?'),
      costA: f('Questions every package answers · Price answer', 'From {price} {priceNote}, for {nights} nights and {days} days starting and ending at Bagdogra Airport or NJP. The price depends on season, hotel category and group size.'),
      confirmQ: f('Questions every package answers · Booking question', 'How do I confirm the package?'),
      confirmA: f('Questions every package answers · Booking answer', 'Pay {advance}% of the package price as an advance to hold hotels and the car. You get a written itinerary and invoice on WhatsApp and email. The balance is due before the trip starts.'),
      sideFrom: f('Side box · Before the price', 'from'),
      bookButton: f('Side box · Book button', 'Get this package'),
      whatsappButton: f('Side box · WhatsApp button', 'Ask on WhatsApp'),
      side1: f('Side box · Promise 1', 'Only {advance}% advance to confirm'),
      side2: f('Side box · Promise 2', 'Same private car and driver throughout'),
      side3: f('Side box · Promise 3', 'Clear [cancellation terms](/cancellation-refund-policy/)'),
      othersTitle: f('Lower down · Other packages heading', 'Other tour packages'),
      ctaTitle: f('Booking box · Heading', 'Plan this trip with us'),
    },
  },

  'destination-page': {
    name: 'Every destination page',
    group: 'templates',
    path: `/destinations/${DESTINATIONS[0]?.slug ?? ''}/`,
    note: 'The fixed headings and lines on all destination pages at once. Each place’s own words are under its form.',
    vars: { name: 'The place’s name', short: 'Its short name', region: 'Its region', altitude: 'Its altitude' },
    fields: {
      ...seo('{short} Travel Guide: Best Time, Sights, Taxi', '{name} travel guide: best time to visit, how many days, top sights and how to reach from Bagdogra Airport or NJP, with taxi fares and tour packages.'),
      heroEyebrow: f('Top · Small heading above', '{region} · {altitude}'),
      heroTitle: f('Top · Main heading', '{name} travel guide'),
      bestTimeLabel: f('Facts · First box label', 'Best time to visit'),
      daysLabel: f('Facts · Second box label', 'Days needed'),
      highlightsTitle: f('Things to see · Heading', 'Top things to see in {name}'),
      reachTitle: f('How to reach · Heading', 'How to reach {name}'),
      permitTitle: f('Permits · Heading', 'Permits'),
      permitLink: f('Permits · After the permit text', 'See our [Sikkim permit guide](/guides/sikkim-permit-guide/).'),
      bestQ: f('Questions every destination answers · Best time question', 'What is the best time to visit {name}?'),
      daysQ: f('Questions every destination answers · Days question', 'How many days do I need in {name}?'),
      daysExtra: f('Questions every destination answers · Added to the days answer', 'Add a day if you want a slower pace.'),
      reachQ: f('Questions every destination answers · Getting there question', 'How do I reach {name} from Bagdogra Airport?'),
      taxiTitle: f('Side box · Heading', 'Taxi to {short}'),
      bookButton: f('Side box · Button', 'Book a taxi'),
      packagesTitle: f('Lower down · Packages heading', 'Tour packages with {short}'),
      ctaTitle: f('Booking box · Heading', 'Plan your {short} trip'),
    },
  },
} satisfies Record<string, WordPage>;

export type WordPageKey = keyof typeof WORD_PAGES;
type Value = string | string[];

const pages = WORD_PAGES as Record<string, WordPage>;

/** Each page's starting copy as { field: text }, for the dashboard. */
export const WORDS_START: Record<string, Record<string, Value>> = Object.fromEntries(
  Object.entries(pages).map(([key, p]) => [key, Object.fromEntries(Object.entries(p.fields).map(([k, x]) => [k, x.text]))]),
);

/** What the site shows: the starting copy with the dashboard's published changes laid over it. */
const WORDS: Record<string, Record<string, Value>> = Object.fromEntries(Object.keys(WORDS_START).map((k) => [k, overlayFields('text', WORDS_START[k], k)]));

/* ------------------------------------------------------------------ */
/* Fill-ins                                                            */
/* ------------------------------------------------------------------ */

const airport = ROUTES.filter((r) => r.fromShort === 'Bagdogra Airport');
const darjeeling = ROUTES.find((r) => r.fromShort === 'Bagdogra Airport' && r.toShort === 'Darjeeling') ?? ROUTES[0];
const gangtok = ROUTES.find((r) => r.fromShort === 'Bagdogra Airport' && r.toShort === 'Gangtok') ?? ROUTES[1] ?? ROUTES[0];
const t = (text: string | number, label: string, html?: string) => ({ text: String(text), label, ...(html !== undefined && { html }) });

/** The fill-ins every page can use. */
export const GLOBAL_VARS: WordVars = {
  siteName: t(SITE.name, 'The site’s name'),
  company: t(BUSINESS.legalName, 'The registered name'),
  tagline: t(BUSINESS.tagline, 'The tagline'),
  phone: t(BUSINESS.phone, 'Phone number'),
  email: t(BUSINESS.email, 'Email address'),
  hours: t(BUSINESS.hours, 'Opening hours'),
  street: t(BUSINESS.address.street, 'Office street'),
  town: t(BUSINESS.address.locality, 'Office town'),
  founded: t(BUSINESS.foundingYear, 'Year started'),
  years: t(new Date().getFullYear() - Number(BUSINESS.foundingYear), 'Years on the road'),
  advance: t(POLICY.advancePercent, 'Advance to confirm, in %'),
  freeWait: t(POLICY.freeWaitMinutes, 'Free waiting, in minutes'),
  freeCancel: t(POLICY.freeCancelHours, 'Free cancellation, in hours'),
  lateRefund: t(POLICY.lateCancelRefundPercent, 'Late cancellation refund, in %'),
  refundDays: t(POLICY.refundDays, 'Working days for a refund'),
  nightFrom: t(POLICY.nightChargeFrom, 'Night charge starts'),
  nightTo: t(POLICY.nightChargeTo, 'Night charge ends'),
  nightCharge: t(inr(POLICY.nightCharge), 'Night charge'),
  routes: t(ROUTES.length, 'Number of taxi routes'),
  packages: t(PACKAGES.length, 'Number of tour packages'),
  guides: t(GUIDES.length, 'Number of travel guides'),
  photos: t(GALLERY.length, 'Number of gallery photos'),
  regions: t(GALLERY_CATEGORIES.length, 'Number of gallery groups'),
  fromFare: t(inr(Math.min(...(airport.length ? airport : ROUTES).map(lowestFare))), 'Lowest fare from the airport'),
  packagesFrom: t(inr(Math.min(...PACKAGES.map((p) => p.fromPrice))), 'Lowest package price'),
  faresUpdated: t(SITE.faresUpdatedLabel, 'Month the fares were last changed'),
  faresUpdatedDate: t(SITE.faresUpdatedLabel, 'The same, marked as a date for Google', `<time datetime="${SITE.faresUpdated}">${SITE.faresUpdatedLabel}</time>`),
  darjeelingSedan: t(inr(darjeeling.fares.sedan), 'Airport to Darjeeling, sedan'),
  darjeelingInnova: t(inr(darjeeling.fares.innova), 'Airport to Darjeeling, Innova'),
  darjeelingKm: t(darjeeling.km, 'Airport to Darjeeling, km'),
  darjeelingTime: t(darjeeling.duration, 'Airport to Darjeeling, driving time'),
  gangtokSedan: t(inr(gangtok.fares.sedan), 'Airport to Gangtok, sedan'),
  gangtokInnova: t(inr(gangtok.fares.innova), 'Airport to Gangtok, Innova'),
  gangtokKm: t(gangtok.km, 'Airport to Gangtok, km'),
  gangtokTime: t(gangtok.duration, 'Airport to Gangtok, driving time'),
};

/** A route page's own fill-ins. */
export function routeVars(route: Route): WordVars {
  const dest = route.destination ? DESTINATIONS.find((d) => d.slug === route.destination) : undefined;
  const back = route.returnSlug ? routeBySlug(route.returnSlug) : undefined;
  const backWords = back ? `${back.fromShort} to ${back.toShort} taxi fare` : '';
  const v = WORD_PAGES['route-page'].vars;
  return {
    from: t(route.fromShort, v.from),
    to: t(route.toShort, v.to),
    fromFull: t(route.from, v.fromFull),
    toFull: t(route.to, v.toFull),
    km: t(route.km, v.km),
    time: t(route.duration, v.time),
    via: t(route.via, v.via),
    fare: t(inr(lowestFare(route)), v.fare),
    sedan: t(inr(route.fares.sedan), v.sedan),
    suv: t(inr(route.fares.suv), v.suv),
    innova: t(inr(route.fares.innova), v.innova),
    traveller: t(inr(route.fares.traveller), v.traveller),
    group: t(route.group, v.group),
    place: t(dest?.name ?? route.toShort, v.place),
    placeShort: t(dest?.short ?? dest?.name ?? route.toShort, v.placeShort),
    returnLink: t(backWords, v.returnLink, back ? `<a href="/taxi/${back.slug}/">${backWords}</a>` : ''),
  };
}

/** A package page's own fill-ins. */
export function packageVars(pkg: TourPackage): WordVars {
  const v = WORD_PAGES['package-page'].vars;
  return { name: t(pkg.name, v.name), short: t(pkg.short, v.short), nights: t(pkg.nights, v.nights), days: t(pkg.days, v.days), price: t(inr(pkg.fromPrice), v.price), priceNote: t(pkg.priceNote, v.priceNote) };
}

/** A destination page's own fill-ins. */
export function destinationVars(d: Destination): WordVars {
  const v = WORD_PAGES['destination-page'].vars;
  return { name: t(d.name, v.name), short: t(d.short ?? d.name, v.short), region: t(d.region, v.region), altitude: t(d.altitude, v.altitude) };
}

/** The fill-in names a page may use: everyone's plus its own. */
export function allowedVars(page: string): string[] {
  return [...Object.keys(GLOBAL_VARS), ...Object.keys(pages[page]?.vars ?? {})];
}

/** The fill-ins with their values for the page at a web address, for the page editor's previews. */
export function varsForPath(path: string): WordVars {
  const m = path.match(/^\/(taxi|tour-packages|destinations)\/([^/]+)\/$/);
  if (m?.[1] === 'taxi') {
    const r = ROUTES.find((x) => x.slug === m[2]);
    if (r) return { ...GLOBAL_VARS, ...routeVars(r) };
  }
  if (m?.[1] === 'tour-packages') {
    const p = PACKAGES.find((x) => x.slug === m[2]);
    if (p) return { ...GLOBAL_VARS, ...packageVars(p) };
  }
  if (m?.[1] === 'destinations') {
    const d = DESTINATIONS.find((x) => x.slug === m[2]);
    if (d) return { ...GLOBAL_VARS, ...destinationVars(d) };
  }
  return GLOBAL_VARS;
}

/* ------------------------------------------------------------------ */
/* For templates                                                       */
/* ------------------------------------------------------------------ */

function raw(page: string, field: string): Value {
  const v = WORDS[page]?.[field];
  if (v === undefined || v === null) throw new Error(`[page-text] No words for ${page}.${field}: add the field to WORD_PAGES in src/data/page-text.ts`);
  return v;
}

export interface WordOpts {
  /** Class for *accent* words. */
  accent?: string;
  /** Class for **bold** words. */
  strong?: string;
  /** Class for links. */
  link?: string;
}

/** One text as HTML, for set:html. */
export function words(page: WordPageKey, field: string, vars: WordVars = {}, opts: WordOpts = {}): string {
  const v = raw(page, field);
  return withClasses(wordsToHtml(Array.isArray(v) ? v.join(' ') : v, { ...GLOBAL_VARS, ...vars }, opts), opts);
}

/** One text as plain text: page titles, search descriptions, questions in structured data. */
export function wordsText(page: WordPageKey, field: string, vars: WordVars = {}): string {
  const v = raw(page, field);
  return wordsToText(Array.isArray(v) ? v.join(' ') : v, { ...GLOBAL_VARS, ...vars });
}

/** A list (bullet points, paragraphs) as HTML items. */
export function wordsList(page: WordPageKey, field: string, vars: WordVars = {}, opts: WordOpts = {}): string[] {
  const v = raw(page, field);
  return (Array.isArray(v) ? v : [v]).map((x) => withClasses(wordsToHtml(x, { ...GLOBAL_VARS, ...vars }, opts), opts));
}

/** data-edit="text:home:heroTitle": tells the page editor which words a spot shows. */
export function editAttr(page: WordPageKey, field: string): string {
  raw(page, field);
  return `text:${page}:${field}`;
}

/** Whether a page has a field (SectionHead uses it to find a section's parts). */
export function hasWords(page: string, field: string): boolean {
  return WORDS[page]?.[field] !== undefined && WORDS[page]?.[field] !== null;
}

/** Adds the design's classes to bold words and links. */
function withClasses(html: string, opts: WordOpts): string {
  let out = html;
  if (opts.strong) out = out.replace(/<strong>/g, `<strong class="${opts.strong}">`);
  if (opts.link) out = out.replace(/<a href="([^"]*)">/g, `<a href="$1" class="${opts.link}">`);
  return out;
}
