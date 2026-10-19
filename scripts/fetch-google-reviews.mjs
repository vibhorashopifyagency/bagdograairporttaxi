// Pulls the Google rating, review count and latest reviews for the business
// from the Places API (New) and writes them to src/data/google-reviews.json,
// which the site renders and marks up. Runs before every build.
//
//   GOOGLE_PLACES_API_KEY  Maps Platform key with "Places API (New)" enabled
//   GOOGLE_PLACE_ID        the listing's place ID (optional: without it the
//                          script finds the listing by name and prints its ID)
//   GOOGLE_PLACE_QUERY     search text used when no place ID is set
//
// With no key set it leaves the JSON untouched, so local builds and builds
// without network keep the last saved reviews. Google returns at most five
// reviews per request (its "most relevant" five); each build refreshes them.
import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../src/data/google-reviews.json', import.meta.url);
const key = process.env.GOOGLE_PLACES_API_KEY;
const query = process.env.GOOGLE_PLACE_QUERY || 'Bagdogra Airport Taxi, Bagdogra, West Bengal';
// The listing's place ID, derived from its Maps feature ID (0x39e4470265c3e681:0x4d514b7dcdb590f4).
let placeId = process.env.GOOGLE_PLACE_ID || 'ChIJgebDZQJH5DkR9JC1zX1LUU0';

if (!key) {
  console.log('google-reviews: no GOOGLE_PLACES_API_KEY, keeping the saved reviews');
  process.exit(0);
}

const api = async (url, init, fields) => {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fields, ...init?.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
};

try {
  if (!placeId) {
    const found = await api('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      body: JSON.stringify({ textQuery: query, languageCode: 'en', regionCode: 'IN' }),
    }, 'places.id,places.displayName,places.formattedAddress');
    const first = found.places?.[0];
    if (!first) throw new Error(`no place found for "${query}"`);
    placeId = first.id;
    console.log(`google-reviews: using "${first.displayName?.text}" at ${first.formattedAddress}`);
    console.log(`google-reviews: set GOOGLE_PLACE_ID=${placeId} to pin this listing`);
  }

  const p = await api(`https://places.googleapis.com/v1/places/${placeId}?languageCode=en&regionCode=IN`, {},
    'id,displayName,rating,userRatingCount,googleMapsUri,reviews');

  const data = {
    source: 'Google Places API',
    fetchedAt: new Date().toISOString(),
    placeId: p.id,
    name: p.displayName?.text ?? '',
    mapsUrl: p.googleMapsUri ?? '',
    rating: p.rating ?? 0,
    count: p.userRatingCount ?? 0,
    reviews: (p.reviews ?? [])
      .filter((r) => (r.originalText?.text || r.text?.text))
      .map((r) => ({
        author: r.authorAttribution?.displayName ?? 'Google user',
        authorUrl: r.authorAttribution?.uri ?? '',
        photo: r.authorAttribution?.photoUri ?? '',
        rating: r.rating ?? 0,
        text: (r.originalText?.text || r.text?.text || '').trim(),
        published: r.publishTime ?? '',
        relative: r.relativePublishTimeDescription ?? '',
        url: r.googleMapsUri ?? '',
      })),
  };
  await writeFile(OUT, JSON.stringify(data, null, 2) + '\n');
  console.log(`google-reviews: ${data.rating} from ${data.count} reviews, saved ${data.reviews.length}`);
} catch (err) {
  // Never fail a deploy because Google was unreachable; the saved file stays.
  const saved = JSON.parse(await readFile(OUT, 'utf8'));
  console.warn(`google-reviews: fetch failed (${err.message}); keeping ${saved.reviews.length} saved reviews`);
}
