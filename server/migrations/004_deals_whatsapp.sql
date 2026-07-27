alter table public.destination_deals
  add column if not exists whatsapp text,
  add column if not exists whatsapp_clicks integer not null default 0;

create or replace function public.increment_whatsapp_clicks(deal_id uuid)
returns void
language sql
as $$
  update public.destination_deals
  set whatsapp_clicks = whatsapp_clicks + 1
  where id = deal_id;
$$;

notify pgrst, 'reload schema';
