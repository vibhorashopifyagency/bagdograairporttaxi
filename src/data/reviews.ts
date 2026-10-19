/**
 * Google reviews, as saved by `scripts/fetch-google-reviews.mjs` before each
 * build. Nothing here is typed in by hand: the rating, count and review text
 * are Google's own, so the badge, the slider and the AggregateRating schema
 * can never disagree with the listing.
 *
 * While the file is empty (no API key yet) the badge and slider render
 * nothing and no rating schema is emitted.
 */
import data from './google-reviews.json';
import { BUSINESS } from './site';

export interface GoogleReview {
  author: string;
  authorUrl: string;
  photo: string;
  rating: number;
  text: string;
  published: string;
  relative: string;
  url: string;
}

const reviews = (data.reviews as GoogleReview[])
  // Best first, then newest, so the slider opens on strong, recent reviews.
  .slice()
  .sort((a, b) => b.rating - a.rating || b.published.localeCompare(a.published));

export const GOOGLE = {
  rating: Math.round(data.rating * 10) / 10,
  count: data.count,
  reviews,
  /** The Google Business Profile, from the API when known. */
  url: data.mapsUrl || BUSINESS.mapsUrl,
  /** Opens Google's "write a review" box for the listing. */
  writeReviewUrl: data.placeId ? `https://search.google.com/local/writereview?placeid=${data.placeId}` : BUSINESS.mapsUrl,
  fetchedAt: data.fetchedAt,
  hasRating: data.count > 0 && data.rating > 0,
};
