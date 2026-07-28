// OpenTripMap's bulk "radius" endpoint (used to source places) returns only
// name/coords/rating/kinds — no address. Its per-place "xid" detail endpoint
// does have a real, OSM-derived address, but calling it for every candidate
// place would be too many requests; we only enrich the places that actually
// made it into the itinerary (a handful per day), after assembly.
import { log } from './logger.js';
import { mapWithConcurrency } from './concurrency.js';

const OTM_KEY = process.env.OPENTRIPMAP_API_KEY;

function formatAddress(address) {
  if (!address) return null;
  const street = address.house_number && address.road
    ? `${address.road} ${address.house_number}`
    : address.road ?? null;
  const parts = [street, address.city].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

async function fetchOpenTripMapAddress(xid) {
  const url = `https://api.opentripmap.com/0.1/en/places/xid/${xid}?apikey=${OTM_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6_000) });
  if (!res.ok) throw new Error(`OpenTripMap detail HTTP ${res.status}`);
  const data = await res.json();
  return formatAddress(data.address);
}

// Mutates items in place (same pattern as resolvePhotosForDays) — fills
// `_address` for OpenTripMap-sourced items that don't already have one.
export async function enrichOpenTripMapDetails(days) {
  if (!OTM_KEY) return;

  const targets = days
    .flatMap(d => d.itinerary_items)
    .filter(item => item._source === 'opentripmap' && !item._address && item._place_id?.startsWith('otm:'));
  if (!targets.length) return;

  let enriched = 0;
  await mapWithConcurrency(targets, 3, async item => {
    try {
      const xid = item._place_id.slice('otm:'.length);
      const address = await fetchOpenTripMapAddress(xid);
      if (address) {
        item._address = address;
        enriched++;
      }
    } catch (err) {
      log.debug('OpenTripMap detail fetch failed', { xid: item._place_id, error: err.message });
    }
  });

  log.info('OpenTripMap details enriched', { candidates: targets.length, enriched });
}
