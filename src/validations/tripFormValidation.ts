import {
  BALKAN_DESTINATIONS,
  ALLOWED_COUNTRIES,
  isDestinationAllowed,
} from "../constants/allowedDestinations";

// Characters allowed while typing a location (letters incl. diacritics,
// spaces, commas, hyphens, apostrophes, dots).
export const LOCATION_INPUT_REGEX = /^[\p{L}\s,\-'.]+$/u;

export interface TripFormValues {
  starting_location: string;
  destination: string;
  destinationConfirmed: boolean;
  starting_date: string;
  returning_date: string;
  travel_style: string;
  budget_total: number;
}

export interface TripFormErrors {
  starting_location?: string;
  destination?: string;
  starting_date?: string;
  returning_date?: string;
  budget_total?: string;
}

// ─── Location normalisation & fuzzy matching ─────────────────────────────────

function normCity(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

function isSameCityFuzzy(inputCity: string, knownCity: string): boolean {
  const a = normCity(inputCity);
  const b = normCity(knownCity);
  if (a === b) return true;
  // ≤3 chars: exact only (avoids "Bar" vs "Bari"); 4-5 chars: 1 edit; 6+: 2 edits
  const threshold = b.length <= 3 ? 0 : b.length <= 5 ? 1 : 2;
  return editDistance(a, b) <= threshold;
}

// ─── Country resolution ───────────────────────────────────────────────────────

// Layer 1 — resolve a typed location's country from the curated dataset (offline).
// Catches known cities with or without a ", Country" suffix, including misspellings
// and missing diacritics ("Klina", "Kukes", "Peje" …).
function resolveCountryLocally(input: string): string | null {
  const city = input.split(",")[0].trim();
  const norm = normCity(input);
  for (const { country, cities } of BALKAN_DESTINATIONS) {
    if (norm.includes(normCity(country))) return country;
    if (cities.some(c => isSameCityFuzzy(city, c))) return country;
  }
  return null;
}

// Layer 2 — resolve unknown places (villages, small towns) by geocoding.
// Four outcomes, deliberately distinct:
//   in_dest_country → the place exists inside the destination country → rule broken
//   elsewhere       → exists in another country → fine
//   not_found       → geocoder knows no such place anywhere (typo / gibberish)
//   error           → network / timeout — OUR problem, never blocks the user (fail-open)
type GeocodeResult =
  | { status: "in_dest_country" }
  | { status: "elsewhere"; country: string }
  | { status: "not_found" }
  | { status: "error" };

const geoCountryCache = new Map<string, GeocodeResult>();

// limit=3, not 1 — Nominatim applies `limit` before deduplication, so
// limit=1 can return an empty array even when the place exists.
async function nominatimSearch(
  q: string,
  countryCodes?: string
): Promise<Array<{ address?: { country?: string } }>> {
  const scope = countryCodes ? `&countrycodes=${countryCodes}` : "";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=3&accept-language=en${scope}`,
      { signal: ctrl.signal }
    );
    if (!res.ok) throw new Error("geocode failed");
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function checkStartCountryByGeocoding(
  location: string,
  destCountryCode: string
): Promise<GeocodeResult> {
  const key = `${normCity(location)}|${destCountryCode}`;
  const cached = geoCountryCache.get(key);
  if (cached && cached.status !== "error") return cached;
  try {
    // Ask the question we actually care about first: "does this place exist
    // inside the destination country?" — immune to global-ranking ambiguity
    // (e.g. "Zym" the Kosovo village vs. a higher-ranked "Zym" abroad).
    const scoped = await nominatimSearch(location, destCountryCode);
    if (scoped.length > 0) {
      const result: GeocodeResult = { status: "in_dest_country" };
      geoCountryCache.set(key, result);
      return result;
    }
    // Not in the destination country — resolve globally to tell a legitimate
    // foreign place apart from a typo.
    const global = await nominatimSearch(location);
    const country = global.find(r => r.address?.country)?.address?.country;
    const result: GeocodeResult = country
      ? { status: "elsewhere", country }
      : { status: "not_found" };
    geoCountryCache.set(key, result);
    return result;
  } catch {
    return { status: "error" };
  }
}

// ─── Cross-field rule: starting location vs destination ─────────────────────

async function validateLocationPair(
  startingLocation: string,
  destination: string
): Promise<Pick<TripFormErrors, "starting_location" | "destination">> {
  const startNorm = startingLocation.toLowerCase();
  const destNorm = destination.trim().toLowerCase();

  if (startNorm === destNorm) {
    return { destination: "Starting location and destination cannot be the same." };
  }

  const startCity = startingLocation.split(",")[0].trim();
  const destCity = destination.split(",")[0].trim();
  // Destination comes from the confirmed allowlist, so its country is reliable:
  // "Pejë, Kosovo" → "Kosovo"; country-only picks ("Kosovo") resolve to themselves.
  const destCountry = destination.split(",").pop()!.trim();

  const canonicalCity = BALKAN_DESTINATIONS
    .flatMap(d => [...d.cities])
    .find(c => isSameCityFuzzy(c, destCity));
  if (canonicalCity && isSameCityFuzzy(startCity, canonicalCity)) {
    return { destination: "Your starting location appears to be the same city as your destination." };
  }

  const sameCountryError = `"${startingLocation}" is in ${destCountry} — your starting location must be in a different country than your destination.`;

  // Layer 1: offline dataset — catches "Klina", "Kukes", "Peje" typed without a country.
  const localCountry = resolveCountryLocally(startingLocation);
  if (localCountry) {
    return normCity(localCountry) === normCity(destCountry)
      ? { destination: sameCountryError }
      : {};
  }

  // Layer 2: unknown place (village, small town) — geocode it, scoped to the
  // destination country first (see GeocodeResult).
  const destCode = BALKAN_DESTINATIONS.find(
    d => normCity(d.country) === normCity(destCountry)
  )?.countryCode;
  if (!destCode) return {};

  const geo = await checkStartCountryByGeocoding(startingLocation, destCode);
  if (geo.status === "in_dest_country") {
    return { destination: sameCountryError };
  }
  if (geo.status === "not_found") {
    // The geocoder answered and knows no such place — typo ("Čaglavicaa")
    // or gibberish. Blocking here also prevents same-country bypass via
    // deliberate misspelling. Network errors ('error') still fail open.
    return {
      starting_location: `We couldn't find "${startingLocation}". Please check the spelling or use the nearest city.`,
    };
  }
  return {};
}

// ─── Form validation ─────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function validateTripForm(values: TripFormValues): Promise<TripFormErrors> {
  const {
    starting_location, destination, destinationConfirmed,
    starting_date, returning_date, travel_style, budget_total,
  } = values;

  const errors: TripFormErrors = {};
  const today = toDateString(new Date());
  const minBusReturn = toDateString(new Date(Date.now() + 7 * 86_400_000));
  const maxBusReturn = toDateString(new Date(Date.now() + 14 * 86_400_000));
  const maxDefaultReturn = toDateString(new Date(Date.now() + 31 * 86_400_000));

  const trimmedStart = starting_location.trim();
  if (!trimmedStart) {
    errors.starting_location = "Starting location is required";
  } else if (trimmedStart.length < 2) {
    errors.starting_location = "Please enter a valid location";
  }

  if (!destination.trim()) {
    errors.destination = "Destination is required";
  } else if (!destinationConfirmed) {
    errors.destination = "Please select a destination from the list";
  } else if (!isDestinationAllowed(destination)) {
    errors.destination = `Only destinations in ${ALLOWED_COUNTRIES.join(", ")} are supported`;
  }

  // Cross-field rule only when both fields pass their own checks
  if (!errors.starting_location && !errors.destination) {
    Object.assign(errors, await validateLocationPair(trimmedStart, destination));
  }

  if (!starting_date) {
    errors.starting_date = "Departure date is required";
  } else if (starting_date < today) {
    errors.starting_date = "Departure date cannot be in the past";
  }

  if (!returning_date) {
    errors.returning_date = "Return date is required";
  } else if (returning_date <= starting_date) {
    errors.returning_date = "Return date must be after departure date";
  } else if (travel_style === "bus" && (returning_date < minBusReturn || returning_date > maxBusReturn)) {
    errors.returning_date = "Bus travel requires a trip length between 7 and 14 days.";
  } else if ((travel_style === "road" || travel_style === "resort") && returning_date > maxDefaultReturn) {
    errors.returning_date = "This travel style supports a maximum of 31 days.";
  }

  if (!budget_total || budget_total < 500) {
    errors.budget_total = "Budget should be at least $500";
  }

  return errors;
}
