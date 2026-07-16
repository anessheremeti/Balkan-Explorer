-- Destination deals (travel-agency offers) shown in the admin dashboard
-- Run once in Supabase → SQL Editor.

create table if not exists public.destination_deals (
  id          uuid primary key default gen_random_uuid(),
  city        text not null,
  country     text not null,
  title       text not null,
  description text,
  price       numeric,
  currency    text default 'EUR',
  agency      text,
  valid_until date,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.destination_deals enable row level security;

-- Anyone may read active deals (frontend); writes go through the server
-- with the service-role key, which bypasses RLS.
drop policy if exists "public read active deals" on public.destination_deals;
create policy "public read active deals"
  on public.destination_deals for select
  using (true);

-- Photo support (safe to re-run)
alter table public.destination_deals
  add column if not exists image_url text;
