-- Pretty Bites Catalog Setup
create extension if not exists pgcrypto;

create table if not exists public.pb_settings (
  id int primary key,
  data jsonb not null default '{}'::jsonb,
  admin_key text not null default 'PB-ADMIN-2323',
  updated_at timestamptz not null default now()
);

create table if not exists public.pb_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text not null default '',
  image text not null default '',
  slug text not null unique,
  enabled boolean not null default true,
  sort int not null default 0,
  admin_key text not null default 'PB-ADMIN-2323',
  created_at timestamptz not null default now()
);

create table if not exists public.pb_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null default '',
  name text not null default '',
  price numeric not null default 0,
  "desc" text not null default '',
  image text not null default '',
  enabled boolean not null default true,
  available boolean not null default true,
  admin_key text not null default 'PB-ADMIN-2323',
  created_at timestamptz not null default now()
);

alter table public.pb_settings enable row level security;
alter table public.pb_cards enable row level security;
alter table public.pb_products enable row level security;

drop policy if exists pb_settings_read on public.pb_settings;
drop policy if exists pb_cards_read on public.pb_cards;
drop policy if exists pb_products_read on public.pb_products;
drop policy if exists pb_settings_write on public.pb_settings;
drop policy if exists pb_cards_write on public.pb_cards;
drop policy if exists pb_products_write on public.pb_products;

create policy pb_settings_read on public.pb_settings
for select to anon
using (true);

create policy pb_cards_read on public.pb_cards
for select to anon
using (enabled = true or admin_key = (current_setting('request.headers', true)::json ->> 'x-admin-key'));

create policy pb_products_read on public.pb_products
for select to anon
using ((enabled = true and available = true) or admin_key = (current_setting('request.headers', true)::json ->> 'x-admin-key'));

create policy pb_settings_write on public.pb_settings
for all to anon
using (admin_key = (current_setting('request.headers', true)::json ->> 'x-admin-key'))
with check (admin_key = (current_setting('request.headers', true)::json ->> 'x-admin-key'));

create policy pb_cards_write on public.pb_cards
for all to anon
using (admin_key = (current_setting('request.headers', true)::json ->> 'x-admin-key'))
with check (admin_key = (current_setting('request.headers', true)::json ->> 'x-admin-key'));

create policy pb_products_write on public.pb_products
for all to anon
using (admin_key = (current_setting('request.headers', true)::json ->> 'x-admin-key'))
with check (admin_key = (current_setting('request.headers', true)::json ->> 'x-admin-key'));

insert into public.pb_settings (id, data, admin_key)
values (1, '{}'::jsonb, 'PB-ADMIN-2323')
on conflict (id) do nothing;
