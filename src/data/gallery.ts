/**
 * The photo gallery: every picture on the site, grouped the way a traveller
 * thinks about the region. Photos come from src/data/photos.json (licences and
 * credits are on /photo-credits/). `href` points at the page that lets the
 * viewer act on what they see: a destination guide, a route or the cars.
 *
 * To add the business's own photographs, drop them into public/img/ as
 * name-{400,800,1600}.webp, add the entry to src/data/photos.json and list
 * the key here.
 */
import type { PhotoKey } from '../lib/photos';
import { overlayWhole } from './published';

export type GalleryCategory = 'Darjeeling hills' | 'Sikkim' | 'Dooars and Bhutan' | 'On the road' | 'Our cars';

export interface GalleryItem {
  photo: PhotoKey;
  title: string;
  place: string;
  category: GalleryCategory;
  href?: string;
  /** Call to action shown in the lightbox, e.g. "Taxi from ₹2,800". */
  cta?: string;
}

export const GALLERY_CATEGORIES: GalleryCategory[] = ['Darjeeling hills', 'Sikkim', 'Dooars and Bhutan', 'On the road', 'Our cars'];

/** The starting copy; once the gallery is edited in the dashboard, its list is used instead (see ./published.ts). */
export const GALLERY_START: GalleryItem[] = [
  { photo: 'hero', title: 'Kanchenjunga at dawn', place: 'Darjeeling tea gardens', category: 'Darjeeling hills', href: '/destinations/darjeeling/', cta: 'Darjeeling guide and taxi fare' },
  { photo: 'toy-train', title: 'The toy train', place: 'Darjeeling Himalayan Railway', category: 'Darjeeling hills', href: '/destinations/darjeeling/', cta: 'Darjeeling guide and taxi fare' },
  { photo: 'tea-worker', title: 'Plucking first flush', place: 'A Darjeeling tea estate', category: 'Darjeeling hills', href: '/tour-packages/darjeeling-tour-package/', cta: 'Darjeeling tour package' },
  { photo: 'kurseong', title: 'Tea on the hillside', place: 'Kurseong', category: 'Darjeeling hills', href: '/destinations/kurseong/', cta: 'Kurseong guide and taxi fare' },
  { photo: 'mirik', title: 'Sumendu Lake', place: 'Mirik', category: 'Darjeeling hills', href: '/destinations/mirik/', cta: 'Mirik guide and taxi fare' },
  { photo: 'kalimpong', title: 'Town on the ridge', place: 'Kalimpong', category: 'Darjeeling hills', href: '/destinations/kalimpong/', cta: 'Kalimpong guide and taxi fare' },
  { photo: 'lava', title: 'Kagyu Thekchen Ling Monastery', place: 'Lava', category: 'Darjeeling hills', href: '/destinations/lava/', cta: 'Lava guide and taxi fare' },
  { photo: 'gangtok', title: 'MG Marg at dusk', place: 'Gangtok', category: 'Sikkim', href: '/destinations/gangtok/', cta: 'Gangtok guide and taxi fare' },
  { photo: 'tsomgo', title: 'Tsomgo Lake', place: 'East Sikkim, 3,753 m', category: 'Sikkim', href: '/tour-packages/gangtok-tsomgo-nathula-tour-package/', cta: 'Gangtok, Tsomgo and Nathula package' },
  { photo: 'nathula', title: 'Nathula Pass', place: 'India–China border, 4,310 m', category: 'Sikkim', href: '/guides/nathula-pass-guide/', cta: 'Nathula Pass guide' },
  { photo: 'pelling', title: 'Kanchenjunga from Pelling', place: 'West Sikkim', category: 'Sikkim', href: '/destinations/pelling/', cta: 'Pelling guide and taxi fare' },
  { photo: 'north-sikkim', title: 'The road to Yumthang', place: 'North Sikkim', category: 'Sikkim', href: '/destinations/north-sikkim/', cta: 'North Sikkim guide' },
  { photo: 'gurudongmar', title: 'Gurudongmar Lake', place: 'North Sikkim, 5,430 m', category: 'Sikkim', href: '/tour-packages/north-sikkim-lachung-yumthang-tour-package/', cta: 'North Sikkim package' },
  { photo: 'lachung', title: 'Lachung Monastery', place: 'Lachung', category: 'Sikkim', href: '/tour-packages/north-sikkim-lachung-yumthang-tour-package/', cta: 'North Sikkim package' },
  { photo: 'zuluk', title: 'Morning on the Silk Route', place: 'Zuluk', category: 'Sikkim', href: '/destinations/silk-route/', cta: 'Silk Route guide' },
  { photo: 'silk-route', title: 'The zig-zag road', place: 'Zuluk, Old Silk Route', category: 'Sikkim', href: '/tour-packages/silk-route-zuluk-tour-package/', cta: 'Silk Route package' },
  { photo: 'ravangla', title: 'Buddha Park', place: 'Ravangla', category: 'Sikkim', href: '/tour-packages/pelling-ravangla-tour-package/', cta: 'Pelling and Ravangla package' },
  { photo: 'rumtek', title: 'Rumtek Monastery', place: 'Near Gangtok', category: 'Sikkim', href: '/destinations/gangtok/', cta: 'Gangtok guide and taxi fare' },
  { photo: 'rhino', title: 'One-horned rhino', place: 'Jaldapara National Park', category: 'Dooars and Bhutan', href: '/destinations/dooars/', cta: 'Dooars guide and taxi fare' },
  { photo: 'dooars', title: 'Elephant safari', place: 'Jaldapara, Dooars', category: 'Dooars and Bhutan', href: '/tour-packages/dooars-jungle-safari-tour-package/', cta: 'Dooars jungle safari package' },
  { photo: 'bhutan', title: 'Punakha Dzong', place: 'Bhutan', category: 'Dooars and Bhutan', href: '/destinations/bhutan/', cta: 'Bhutan guide and taxi to the border' },
  { photo: 'airport', title: 'Where every trip starts', place: 'Bagdogra Airport (IXB)', category: 'On the road', href: '/taxi/', cta: 'All taxi fares from the airport' },
  { photo: 'teesta', title: 'Coronation Bridge over the Teesta', place: 'Sevoke, on the road to Gangtok', category: 'On the road', href: '/taxi/bagdogra-airport-to-gangtok-taxi/', cta: 'Bagdogra to Gangtok taxi fare' },
  { photo: 'car-innova', title: 'Innova Crysta', place: 'Our most comfortable car for the hills', category: 'Our cars', href: '/book/?vehicle=innova', cta: 'Book an Innova Crysta' },
  { photo: 'car-suv', title: 'SUV', place: 'Ertiga or Carens, six seats', category: 'Our cars', href: '/book/?vehicle=suv', cta: 'Book an SUV' },
  { photo: 'car-sedan', title: 'Sedan', place: 'Dzire or Etios, four seats', category: 'Our cars', href: '/book/?vehicle=sedan', cta: 'Book a sedan' },
  { photo: 'car-traveller', title: 'Tempo Traveller', place: 'Twelve seats for groups', category: 'Our cars', href: '/book/?vehicle=traveller', cta: 'Book a Tempo Traveller' },
];

export const GALLERY = overlayWhole('gallery', GALLERY_START);
