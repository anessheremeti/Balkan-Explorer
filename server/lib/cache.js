// In-memory TTL cache with Redis-compatible interface.
// Swap this module for an ioredis adapter when you add Redis — all callers stay unchanged.
class Cache {
  constructor(name) {
    this.name  = name;
    this.store = new Map();
    this.hits  = 0;
    this.miss  = 0;
    this.sets  = 0;
  }

  set(key, value, ttlMs) {
    const existing = this.store.get(key);
    if (existing?.timer) clearTimeout(existing.timer);
    // setTimeout's delay is a 32-bit signed int internally — anything over
    // ~24.8 days (2^31-1 ms) silently overflows and fires almost immediately
    // instead of throwing, so a long TTL (e.g. the 30-day Wikidata photo
    // cache) would evict its entry within ~1ms of being set. `exp` below is
    // computed from the real ttlMs and stays correct regardless; only the
    // eager-delete timer needs clamping.
    const timerMs = Math.min(ttlMs, 2_147_483_647);
    const timer = setTimeout(() => this.store.delete(key), timerMs);
    if (timer.unref) timer.unref(); // don't keep the process alive
    this.store.set(key, { value, timer, exp: Date.now() + ttlMs });
    this.sets++;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry)                    { this.miss++; return null; }
    if (Date.now() > entry.exp)    { this.store.delete(key); this.miss++; return null; }
    this.hits++;
    return entry.value;
  }

  has(key) { return this.get(key) !== null; }

  del(key) {
    const e = this.store.get(key);
    if (e?.timer) clearTimeout(e.timer);
    this.store.delete(key);
  }

  stats() {
    const total = this.hits + this.miss;
    return { name: this.name, size: this.store.size, hits: this.hits, misses: this.miss, hitRate: total ? +(this.hits / total).toFixed(3) : 0 };
  }
}

export const tripCache      = new Cache('trips');
export const cityPlaceCache = new Cache('city-places');
export const geocodeCache   = new Cache('geocode');
export const photoCache     = new Cache('photos');
export const proxyGeoCache  = new Cache('proxy-geocode');
