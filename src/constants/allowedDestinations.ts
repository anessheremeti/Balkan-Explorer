export interface BalkanRegion {
  country: string;
  countryCode: string;
  cities: readonly string[];
}

export const BALKAN_DESTINATIONS: readonly BalkanRegion[] = [
  {
    country: 'Kosovo',
    countryCode: 'xk',
    cities: [
      'Pristina', 'Prizren', 'Pejë', 'Gjakova', 'Mitrovica',
      'Ferizaj', 'Gjilan', 'Vushtrri', 'Suhareka', 'Rahovec',
      'Drenas', 'Lipjan', 'Deçan', 'Klina', 'Malisheva', 'Kamenica',
    ],
  },
  {
    country: 'Albania',
    countryCode: 'al',
    cities: [
      'Tirana', 'Durrës', 'Shkodër', 'Vlorë', 'Elbasan',
      'Berat', 'Gjirokastër', 'Korçë', 'Fier', 'Sarandë',
      'Pogradec', 'Lushnjë', 'Kavajë', 'Lezhë', 'Kukës', 'Laç',
    ],
  },
  {
    country: 'North Macedonia',
    countryCode: 'mk',
    cities: [
      'Skopje', 'Ohrid', 'Bitola', 'Kumanovo', 'Tetovo',
      'Štip', 'Veles', 'Struga', 'Gostivar', 'Kičevo',
      'Strumica', 'Kavadarci', 'Debar', 'Kochani', 'Negotino',
    ],
  },
  {
    country: 'Montenegro',
    countryCode: 'me',
    cities: [
      'Podgorica', 'Budva', 'Kotor', 'Bar', 'Herceg Novi',
      'Nikšić', 'Tivat', 'Ulcinj', 'Bijelo Polje', 'Pljevlja',
      'Berane', 'Cetinje', 'Rožaje', 'Kolašin', 'Žabljak',
    ],
  },
] as const;

export const ALLOWED_COUNTRIES = BALKAN_DESTINATIONS.map(d => d.country);

export interface DestinationOption {
  label: string;
  value: string;
  type: 'country' | 'city';
  country: string;
}

export function getDestinationOptions(): DestinationOption[] {
  const options: DestinationOption[] = [];
  for (const region of BALKAN_DESTINATIONS) {
    options.push({ label: region.country, value: region.country, type: 'country', country: region.country });
    for (const city of region.cities) {
      options.push({ label: city, value: `${city}, ${region.country}`, type: 'city', country: region.country });
    }
  }
  return options;
}

function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function isDestinationAllowed(destination: string): boolean {
  if (!destination.trim()) return false;
  const norm = normalizeStr(destination);
  return BALKAN_DESTINATIONS.some(({ country, cities }) => {
    const cn = normalizeStr(country);
    if (norm === cn) return true;
    return cities.some(city => {
      const cn2 = normalizeStr(city);
      return norm === cn2 || norm === `${cn2}, ${cn}`;
    });
  });
}

// Resolves a loosely-typed name (e.g. from localStorage) to a valid dataset option.
export function findDestinationOption(query: string): DestinationOption | null {
  if (!query.trim()) return null;
  const norm = normalizeStr(query);
  return getDestinationOptions().find(
    opt => normalizeStr(opt.label) === norm || normalizeStr(opt.value) === norm
  ) ?? null;
}
