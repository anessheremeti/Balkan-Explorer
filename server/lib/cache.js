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
    const timer = setTimeout(() => this.store.delete(key), ttlMs);
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
