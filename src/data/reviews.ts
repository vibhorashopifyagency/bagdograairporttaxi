/**
 * Google reviews, as saved by `scripts/fetch-google-reviews.mjs` before each
 * build. Nothing in google-reviews.json is typed in by hand: the rating,
 * count and review text are Google's own, so the badge and the slider can
 * never disagree with the listing.
 *
 * They are shown as plain HTML only. Google's review-snippet guidelines rule
 * out Review/AggregateRating markup for a business's own reviews and for
 * ratings copied from another site (see src/lib/schema.ts), so no schema is
 * built from this data.
 *
 * Until the API key is set and that file is filled, the site falls back to
 * `reviews-sample.json`: the real rating from the listing with sample review
 * cards, labelled as samples on the page. `scripts/verify-build.mjs` refuses
 * to build with PRE_LAUNCH off while samples are still showing.
 */
import data from './google-reviews.json';
import sample from './reviews-sample.json';
import { BUSINESS } from './site';

export interface GoogleReview {
  author: string;
  authorUrl?: string;
  photo?: string;
  rating: number;
  text: string;
  published?: string;
  relative?: string;
  url?: string;
}

const live = data.count > 0 && data.reviews.length > 0;

const reviews: GoogleReview[] = (live ? (data.reviews as GoogleReview[]) : (sample.reviews as GoogleReview[]))
  // Best first, then newest, so the slider opens on strong, recent reviews.
  .slice()
  .sort((a, b) => b.rating - a.rating || (b.published ?? '').localeCompare(a.published ?? ''));

const rating = live ? data.rating : sample.rating;

export const GOOGLE = {
  rating: Math.round(rating * 10) / 10,
  count: live ? data.count : 0,
  reviews,
  /** True while the cards are samples rather than Google's reviews. */
  isSample: !live,
  /** The Google Business Profile, from the API when known. */
  url: data.mapsUrl || BUSINESS.mapsUrl,
  /** Opens Google's "write a review" box for the listing. */
  writeReviewUrl: data.placeId ? `https://search.google.com/local/writereview?placeid=${data.placeId}` : BUSINESS.mapsUrl,
  fetchedAt: data.fetchedAt,
  hasRating: rating > 0,
  /** True once the file holds Google's own reviews rather than samples. */
  isLive: live,
};
