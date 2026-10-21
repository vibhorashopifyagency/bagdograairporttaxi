/**
 * Current weather for the dashboard greeting, from Open-Meteo (free, no key).
 * Cached for 30 minutes per server instance. Never slows the page by more
 * than 1.5 seconds, and returns an empty list when the service is down.
 */

const PLACES = [
  { name: 'Bagdogra', lat: 26.6993, lng: 88.3214 },
  { name: 'Darjeeling', lat: 27.041, lng: 88.2663 },
  { name: 'Gangtok', lat: 27.3314, lng: 88.6138 },
];

export type Weather = { place: string; temp: number; sky: string };

/** WMO weather codes, in the words a driver would use. */
function sky(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly cloudy';
  if (code === 3) return 'cloudy';
  if (code <= 48) return 'mist';
  if (code <= 57) return 'drizzle';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'showers';
  if (code <= 86) return 'snow showers';
  return 'thunderstorms';
}

const TTL_MS = 30 * 60 * 1000;
let cache: { at: number; data: Weather[] } | undefined;

export async function currentWeather(): Promise<Weather[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${PLACES.map((p) => p.lat).join(',')}` +
    `&longitude=${PLACES.map((p) => p.lng).join(',')}` +
    '&current=temperature_2m,weather_code&timezone=Asia%2FKolkata';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { current: { temperature_2m: number; weather_code: number } }[];
    const data = PLACES.map((p, i) => ({
      place: p.name,
      temp: Math.round(json[i].current.temperature_2m),
      sky: sky(json[i].current.weather_code),
    }));
    cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    console.warn('[weather] unavailable', (e as Error).message);
    // Keep showing the last good reading rather than nothing.
    return cache?.data ?? [];
  }
}
