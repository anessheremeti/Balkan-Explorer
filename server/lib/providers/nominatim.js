import { geocodeCache } from '../cache.js';
import { log } from '../logger.js';

const UA        = 'TravelExplorer/1.0 (open-source travel planner; github.com/travel-explorer)';
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function geocodeCity(cityName) {
  if (!cityName?.trim()) throw new Error('City name required');

  const key    = cityName.toLowerCase().trim();
  const cached = geocodeCache.get(key);
  if (cached) { log.debug('Geocode cache hit', { city: cityName }); return cached; }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&addressdetails=1`;

  const res = await fetch(url, {
    headers: {
      'User-Agent':      UA,
      'Accept':          'application/json',
      'Accept-Language': 'en',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

  const data = await res.json();
  if (!data?.length) throw new Error(`City not found: "${cityName}"`);

  const result = {
    lat:          parseFloat(data[0].lat),
    lon:          parseFloat(data[0].lon),
    displayName:  data[0].display_name,
    country:      data[0].address?.country      ?? null,
    countryCode:  data[0].address?.country_code ?? null,
  };

  log.info('Geocoded', { city: cityName, lat: result.lat.toFixed(4), lon: result.lon.toFixed(4), country: result.country });
  geocodeCache.set(key, result, CACHE_TTL);
  return result;
}
