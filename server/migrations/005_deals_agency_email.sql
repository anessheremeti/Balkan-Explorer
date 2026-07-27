alter table public.destination_deals
  add column if not exists agency_email text;
