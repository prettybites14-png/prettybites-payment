create extension if not exists pgcrypto;

create table if not exists public.pb_weekly_orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'new',
  customer_name text,
  customer_phone text,
  delivery_type text,
  address text,
  delivery_time text,
  notes text,
  package_price numeric(10,2) not null default 0,
  delivery_fee_per_day numeric(10,2) not null default 0,
  delivery_days integer not null default 5,
  total numeric(10,2) not null default 0,
  admin_key text,
  data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.pb_weekly_orders
  add column if not exists status text default 'new',
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists delivery_type text,
  add column if not exists address text,
  add column if not exists delivery_time text,
  add column if not exists notes text,
  add column if not exists package_price numeric(10,2) default 0,
  add column if not exists delivery_fee_per_day numeric(10,2) default 0,
  add column if not exists delivery_days integer default 5,
  add column if not exists total numeric(10,2) default 0,
  add column if not exists admin_key text,
  add column if not exists data jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

alter table public.pb_weekly_orders enable row level security;

drop policy if exists "Allow public insert weekly orders" on public.pb_weekly_orders;
create policy "Allow public insert weekly orders"
on public.pb_weekly_orders
for insert
to anon
with check (true);

drop policy if exists "Allow admin read weekly orders" on public.pb_weekly_orders;
create policy "Allow admin read weekly orders"
on public.pb_weekly_orders
for select
to anon
using (true);

drop policy if exists "Allow admin update weekly orders" on public.pb_weekly_orders;
create policy "Allow admin update weekly orders"
on public.pb_weekly_orders
for update
to anon
using (true)
with check (true);
