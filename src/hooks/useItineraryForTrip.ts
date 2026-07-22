import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../createClient';

export interface MapCoords {
  lat: number;
  lon: number;
}

export interface ItineraryItemView {
  id: string;
  title: string;
  description: string | null;
  item_type: string;
  start_time: string | null;
  coords: MapCoords | null;
}

export interface ItineraryDayView {
  id: string;
  day_number: number;
  title: string;
  date: string | null;
  // Set only for country-wide trips ("Albania" — all cities); null otherwise.
  city: string | null;
  items: ItineraryItemView[];
}

// Raw Supabase shapes — avoids `any` while keeping strict types
interface RawItem {
  id: string;
  title: string;
  description: string | null;
  item_type: string;
  start_time: string | null;
  metadata: Record<string, unknown> | null;
}

interface RawDay {
  id: string;
  day_number: number;
  title: string | null;
  date: string | null;
  city: string | null;
  itinerary_items: RawItem[];
}

export function useItineraryForTrip() {
  const [days, setDays] = useState<ItineraryDayView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref so fetchTrip is a stable function reference (no deps that change)
  const loadedIdRef = useRef<string | null>(null);

  const fetchTrip = useCallback(async (tripId: string) => {
    if (loadedIdRef.current === tripId) return; // already loaded

    setIsLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('itinerary_days')
      .select(
        'id, day_number, title, date, city, itinerary_items(id, title, description, item_type, start_time, metadata)'
      )
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true });

    if (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }

    const raw = (data ?? []) as unknown as RawDay[];

    const mapped: ItineraryDayView[] = raw.map(d => ({
      id: d.id,
      day_number: d.day_number,
      title: d.title ?? `Day ${d.day_number}`,
      date: d.date,
      city: d.city ?? null,
      items: (d.itinerary_items ?? [])
        .slice()
        .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
        .map(item => {
          const meta = item.metadata;
          const lat = typeof meta?.lat === 'number' ? meta.lat : null;
          const lon = typeof meta?.lon === 'number' ? meta.lon : null;
          return {
            id: item.id,
            title: item.title,
            description: item.description,
            item_type: item.item_type,
            start_time: item.start_time,
            coords: lat !== null && lon !== null ? { lat, lon } : null,
          };
        }),
    }));

    setDays(mapped);
    loadedIdRef.current = tripId;
    setIsLoading(false);
  }, []);

  return { days, isLoading, error, fetchTrip };
}
