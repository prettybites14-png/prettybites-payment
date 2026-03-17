-- Add tax_rate column only if you use a generic public.settings table
alter table if exists public.settings
add column if not exists tax_rate numeric default 0.13;
