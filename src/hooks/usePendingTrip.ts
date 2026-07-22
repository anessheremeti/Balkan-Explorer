const KEY = "pending_trip";
// Generously covers the server's 150s poll window (POLL_MAX_ATTEMPTS * interval)
// plus the 10-minute in-memory tripCache TTL. Any resumed id older than this is
// treated as abandoned/stale rather than resumed forever.
const TTL_MS = 10 * 60 * 1000;

interface StoredPendingTrip {
  tripId: string;
  ts: number;
}

/**
 * Survives a full page reload so a trip that's still generating (or whose
 * background persistItinerary() hasn't landed in Supabase yet) keeps showing
 * its progress screen instead of falling back to "no trip found" — a reload
 * mid-generation previously made a real, in-progress itinerary look like it
 * had "disappeared".
 */
export function getPendingTripId(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { tripId, ts } = JSON.parse(raw) as StoredPendingTrip;
    if (!tripId || Date.now() - ts > TTL_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return tripId;
  } catch {
    return null;
  }
}

export function setPendingTripId(tripId: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ tripId, ts: Date.now() } satisfies StoredPendingTrip));
  } catch {
    // sessionStorage unavailable (private browsing etc.) — the trip still
    // works for the current tab via ordinary React state, just won't survive a reload.
  }
}

export function clearPendingTripId(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
