-- Adds a per-day city label, populated only for country-wide trips
-- (e.g. destination = "Albania" spanning Tirana → Berat → Sarandë).
-- NULL for regular single-city trips.
alter table public.itinerary_days
  add column if not exists city text;

notify pgrst, 'reload schema';
