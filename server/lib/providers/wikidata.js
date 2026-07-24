import { log } from '../logger.js';

const UA = 'TravelExplorer/1.0 (travel planning app)';
const QID_RE = /^Q\d+$/;

// A Wikidata QID is an exact, unambiguous cross-reference to a single
// real-world entity — unlike a name/keyword search, there is zero risk of
// matching the wrong place. When an OSM element carries a `wikidata` tag,
// its P18 ("image") claim — when present — is the most trustworthy photo
// source available: free, unlimited, and tied to that specific entity.
export async function fetchWikidataImage(qid) {
  if (!qid || !QID_RE.test(qid)) return null;

  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;

    const data  = await res.json();
    const claims = data.entities?.[qid]?.claims;
    const filename = claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!filename) return null;

    // Special:FilePath redirects straight to the actual image bytes on
    // Commons — safe to use directly as an <img src>.
    const encoded = encodeURIComponent(filename.replace(/ /g, '_'));
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=800`;
  } catch (err) {
    log.warn('Wikidata image lookup failed', { qid, error: err.message });
    return null;
  }
}
