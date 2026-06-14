const KEY = 'te_mapState';

export interface ScopedMapState {
  tripId?: string;
  dayIdx?: number;
  zoom?: number;
  center?: { lat: number; lng: number };
}

interface Stored {
  planSection?: ScopedMapState;
  myTravels?: ScopedMapState;
}

function read(): Stored {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Stored;
  } catch {
    return {};
  }
}

function write(s: Stored): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // sessionStorage may be unavailable in private-browsing mode
  }
}

export function loadMapState(scope: 'planSection' | 'myTravels'): ScopedMapState | null {
  return read()[scope] ?? null;
}

export function saveMapState(
  scope: 'planSection' | 'myTravels',
  data: Partial<ScopedMapState>
): void {
  const s = read();
  s[scope] = { ...s[scope], ...data };
  write(s);
}
