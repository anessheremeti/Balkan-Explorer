-- Deal inquiries: "I'm interested" leads captured from the public site.
-- Run once in Supabase → SQL Editor.

create table if not exists public.deal_inquiries (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid not null references public.destination_deals(id) on delete cascade,
  user_id    uuid,
  name       text not null,
  email      text not null,
  phone      text,
  message    text,
  status     text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now(),
  -- One inquiry per email per deal — repeat submits update the existing row
  unique (deal_id, email)
);

alter table public.deal_inquiries enable row level security;
-- No public policies: reads and writes go exclusively through the server
-- with the service-role key (which bypasses RLS).

notify pgrst, 'reload schema';
