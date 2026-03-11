Supabase Setup (Important)
Project URL: https://lphkkgggxzxyvaimwmja.supabase.co

This site now sends orders to Supabase table: public.orders

1) Create table (SQL Editor) - run this:

create table if not exists public.orders (
  id uuid primary key,
  created_at timestamptz not null,
  status text not null default 'new',
  order_no text,
  total numeric,
  delivery_type text,
  customer_name text,
  customer_phone text,
  data jsonb
);

2) For testing, you can temporarily turn OFF RLS for orders table.
Later, we can secure it with RLS policies.

If you see no orders in admin:
- Check the table name is exactly: orders
- Check RLS is OFF (for quick test)
- Check internet connection



RLS ON Setup:
- Run SUPABASE_RLS_SETUP.sql in SQL Editor.
- Admin key used in site: PB-ADMIN-2323
(You can change it later in admin/orders.html and checkout.html)
