-- Pretty Bites - Orders table + RLS
-- Run this in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  status text default 'new',
  order_no text,
  created_at timestamptz default now(),
  total numeric,
  delivery_type text,
  customer_name text,
  customer_phone text,
  admin_key text,
  data jsonb
);

-- Ensure columns exist (safe if table already existed)
alter table public.orders add column if not exists status text default 'new';
alter table public.orders add column if not exists order_no text;
alter table public.orders add column if not exists created_at timestamptz default now();
alter table public.orders add column if not exists total numeric;
alter table public.orders add column if not exists delivery_type text;
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists admin_key text;
alter table public.orders add column if not exists data jsonb;

-- RLS
alter table public.orders enable row level security;

-- Public can INSERT orders (from checkout)
drop policy if exists "public_insert_orders" on public.orders;
create policy "public_insert_orders"
on public.orders
for insert
to anon
with check (true);

-- Admin SELECT / UPDATE / DELETE requires matching x-admin-key header
drop policy if exists "admin_select_orders" on public.orders;
create policy "admin_select_orders"
on public.orders
for select
to anon
using (admin_key = current_setting('request.headers', true)::json->>'x-admin-key');

drop policy if exists "admin_update_orders" on public.orders;
create policy "admin_update_orders"
on public.orders
for update
to anon
using (admin_key = current_setting('request.headers', true)::json->>'x-admin-key')
with check (admin_key = current_setting('request.headers', true)::json->>'x-admin-key');

drop policy if exists "admin_delete_orders" on public.orders;
create policy "admin_delete_orders"
on public.orders
for delete
to anon
using (admin_key = current_setting('request.headers', true)::json->>'x-admin-key');
