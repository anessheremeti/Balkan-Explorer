// Runs `fn` over `items` with at most `limit` in flight at once. Used
// anywhere we'd otherwise fire an unbounded Promise.all against a public API
// that enforces its own concurrent-request/slot limits (Overpass, photo
// providers) — going over that limit gets requests queued or 504'd by the
// provider itself rather than actually finishing faster.
export async function mapWithConcurrency(items, limit, fn) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
