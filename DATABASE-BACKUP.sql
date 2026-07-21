-- ============================================================
-- SmartDine QR – DATABASE BACKUP
-- Generated: 2026-06-29T06:08:34.388Z
-- Git Commit: de7458cd164efc194d6b9235f4115c3f64455076
-- ============================================================
-- 
-- This file is a combined SQL backup from all migration files.
-- To restore, execute each section in order in your Supabase SQL Editor.
-- 
-- TABLES: profiles, restaurants, categories, menu_items, tables,
--         orders, order_items, order_batches, waiter_calls,
--         bill_requests, audit_logs
-- ============================================================


-- ============================================================
-- MIGRATION: 20260624000000_schema.sql
-- ============================================================

-- Supabase Database Schema for SmartDine QR

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. RESTAURANTS TABLE
create table public.restaurants (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    slug text not null unique,
    logo_url text,
    phone text,
    address text,
    settings jsonb default '{"currency": "INR", "gst_percentage": 5, "service_charge_percentage": 0}'::jsonb,
    subscription_plan text default 'starter' check (subscription_plan in ('starter', 'pro', 'premium')),
    subscription_status text default 'trial' check (subscription_status in ('active', 'trial', 'past_due', 'cancelled')),
    trial_ends_at timestamptz default (now() + interval '14 days'),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Enable RLS for restaurants
alter table public.restaurants enable row level security;

-- 2. PROFILES (STAFF/OWNER) TABLE
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    restaurant_id uuid references public.restaurants(id) on delete set null,
    email text not null,
    full_name text,
    role text not null default 'owner' check (role in ('owner', 'staff', 'super_admin')),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- 3. CATEGORIES TABLE
create table public.categories (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid references public.restaurants(id) on delete cascade not null,
    name text not null,
    sort_order integer default 0,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Enable RLS for categories
alter table public.categories enable row level security;

-- 4. MENU ITEMS TABLE
create table public.menu_items (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid references public.restaurants(id) on delete cascade not null,
    category_id uuid references public.categories(id) on delete cascade not null,
    name text not null,
    description text,
    price numeric(10, 2) not null check (price >= 0),
    image_url text,
    is_available boolean default true not null,
    is_veg boolean default true not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Enable RLS for menu_items
alter table public.menu_items enable row level security;

-- 5. TABLES TABLE
create table public.tables (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid references public.restaurants(id) on delete cascade not null,
    name text not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Enable RLS for tables
alter table public.tables enable row level security;

-- 6. ORDERS TABLE
create table public.orders (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid references public.restaurants(id) on delete cascade not null,
    table_id uuid references public.tables(id) on delete set null,
    table_name text,
    status text not null default 'new' check (status in ('new', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    special_instructions text,
    subtotal numeric(10, 2) not null default 0.00,
    gst numeric(10, 2) not null default 0.00,
    service_charge numeric(10, 2) not null default 0.00,
    total numeric(10, 2) not null default 0.00,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Enable RLS for orders
alter table public.orders enable row level security;

-- 7. ORDER ITEMS TABLE
create table public.order_items (
    id uuid default gen_random_uuid() primary key,
    order_id uuid references public.orders(id) on delete cascade not null,
    menu_item_id uuid references public.menu_items(id) on delete set null,
    menu_item_name text not null,
    quantity integer not null check (quantity > 0),
    price numeric(10, 2) not null check (price >= 0),
    notes text,
    created_at timestamptz default now() not null
);

-- Enable RLS for order_items
alter table public.order_items enable row level security;


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Profiles Policies
create policy "Allow users to read their own profile" 
    on public.profiles for select 
    using (auth.uid() = id);

create policy "Allow users to update their own profile" 
    on public.profiles for update 
    using (auth.uid() = id);

create policy "Allow super admin to manage all profiles" 
    on public.profiles for all 
    using (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    );

-- Restaurants Policies
create policy "Allow public to read restaurants (for customer menu)"
    on public.restaurants for select
    using (true);

create policy "Allow owners/staff to update their own restaurant"
    on public.restaurants for update
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid() 
              and profiles.restaurant_id = restaurants.id 
              and profiles.role in ('owner', 'staff')
        )
    );

create policy "Allow super admin to manage all restaurants"
    on public.restaurants for all
    using (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    );

-- Categories Policies
create policy "Allow public to read categories"
    on public.categories for select
    using (true);

create policy "Allow owners/staff to manage categories"
    on public.categories for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid() 
              and profiles.restaurant_id = categories.restaurant_id
        )
    );

-- Menu Items Policies
create policy "Allow public to read menu items"
    on public.menu_items for select
    using (true);

create policy "Allow owners/staff to manage menu items"
    on public.menu_items for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid() 
              and profiles.restaurant_id = menu_items.restaurant_id
        )
    );

-- Tables Policies
create policy "Allow public to read tables"
    on public.tables for select
    using (true);

create policy "Allow owners/staff to manage tables"
    on public.tables for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid() 
              and profiles.restaurant_id = tables.restaurant_id
        )
    );

-- Orders Policies
create policy "Allow public to insert orders"
    on public.orders for insert
    with check (true);

create policy "Allow public to read their specific order by ID"
    on public.orders for select
    using (true); -- Accessible to customers tracking their order via UUID link

create policy "Allow owners/staff to read/write their restaurant orders"
    on public.orders for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid() 
              and profiles.restaurant_id = orders.restaurant_id
        )
    );

-- Order Items Policies
create policy "Allow public to insert order items"
    on public.order_items for insert
    with check (true);

create policy "Allow public to read order items"
    on public.order_items for select
    using (true); -- Accessible for order tracking details

create policy "Allow owners/staff to read/write order items"
    on public.order_items for all
    using (
        exists (
            select 1 from public.profiles p
            join public.orders o on o.id = order_items.order_id
            where p.id = auth.uid() 
              and p.restaurant_id = o.restaurant_id
        )
    );

-- Allow public to insert restaurants during signup
create policy "Allow public to insert restaurants"
    on public.restaurants for insert
    with check (true);

-- Trigger to automatically create a public profile when a new user signs up in auth
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_restaurant_id uuid;
  r_name text;
  r_slug text;
  r_phone text;
  r_plan text;
  r_interval text;
  r_role text;
begin
  r_name := new.raw_user_meta_data->>'restaurantName';
  r_slug := new.raw_user_meta_data->>'slug';
  r_phone := new.raw_user_meta_data->>'phone';
  r_plan := coalesce(new.raw_user_meta_data->>'subscriptionPlan', 'starter');
  r_interval := coalesce(new.raw_user_meta_data->>'billingInterval', 'monthly');
  r_role := coalesce(new.raw_user_meta_data->>'role', 'owner');

  if r_name is not null and r_slug is not null then
    insert into public.restaurants (name, slug, phone, subscription_plan, subscription_status, billing_interval)
    values (r_name, r_slug, r_phone, r_plan, 'trial', r_interval)
    returning id into new_restaurant_id;
  else
    new_restaurant_id := case 
      when (new.raw_user_meta_data->>'restaurant_id') is not null then (new.raw_user_meta_data->>'restaurant_id')::uuid
      else null
    end;
  end if;

  insert into public.profiles (id, email, full_name, role, restaurant_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'fullName', ''),
    r_role,
    new_restaurant_id
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();



-- ============================================================
-- MIGRATION: 20260625000000_schema_updates.sql
-- ============================================================

-- 1. ADD COLUMNS TO RESTAURANTS
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS gst_number TEXT,
ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly'));

-- 2. CREATE PRICING PLANS TABLE
CREATE TABLE IF NOT EXISTS public.pricing_plans (
    id TEXT PRIMARY KEY, -- 'starter', 'pro', 'premium'
    name TEXT NOT NULL,
    price_monthly NUMERIC(10, 2) NOT NULL,
    price_yearly NUMERIC(10, 2) NOT NULL,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for pricing plans
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public to read pricing plans" ON public.pricing_plans;
DROP POLICY IF EXISTS "Allow super admin to manage pricing plans" ON public.pricing_plans;

-- Create policies
CREATE POLICY "Allow public to read pricing plans"
    ON public.pricing_plans FOR SELECT
    USING (true);

CREATE POLICY "Allow super admin to manage pricing plans"
    ON public.pricing_plans FOR ALL
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    );

-- Seed default pricing plan data
INSERT INTO public.pricing_plans (id, name, price_monthly, price_yearly, features) VALUES
('starter', 'Starter', 299.00, 2990.00, '["Up to 5 tables", "Up to 15 menu items", "Standard KDS", "QR Code Generation"]'::jsonb),
('pro', 'Pro', 799.00, 7990.00, '["Up to 20 tables", "Up to 50 menu items", "Premium KDS", "Analytics Dashboard", "Waiter Panel", "Real-time Alerts"]'::jsonb),
('premium', 'Premium', 1499.00, 14990.00, '["Unlimited tables", "Unlimited menu items", "Priority Support", "Branding settings", "Real-time Analytics", "Waiter & Kitchen Panels"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    features = EXCLUDED.features;

-- 3. CREATE CUSTOMER REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.customer_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    table_id UUID REFERENCES public.tables(id) ON DELETE CASCADE NOT NULL,
    table_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('call_waiter', 'request_bill')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for customer requests
ALTER TABLE public.customer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public to insert customer requests" ON public.customer_requests;
DROP POLICY IF EXISTS "Allow public to read customer requests" ON public.customer_requests;
DROP POLICY IF EXISTS "Allow owners/staff to manage customer requests" ON public.customer_requests;

CREATE POLICY "Allow public to insert customer requests"
    ON public.customer_requests FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public to read customer requests"
    ON public.customer_requests FOR SELECT
    USING (true);

CREATE POLICY "Allow owners/staff to manage customer requests"
    ON public.customer_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
              AND profiles.restaurant_id = customer_requests.restaurant_id
        )
    );

-- 4. CREATE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow owners/staff to read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow owners/staff to insert audit logs" ON public.audit_logs;

CREATE POLICY "Allow owners/staff to read audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
              AND profiles.restaurant_id = audit_logs.restaurant_id
        )
    );

CREATE POLICY "Allow owners/staff to insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
              AND profiles.restaurant_id = audit_logs.restaurant_id
        )
    );

-- 5. UPDATE PROFILES ROLE CHECK CONSTRAINT
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner', 'manager', 'waiter', 'kitchen', 'cashier', 'super_admin'));

-- 6. ENABLE REALTIME FOR UPDATED AND NEW TABLES
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;

-- 7. UPDATE SIGNUP TRIGGER FUNCTION TO CAPTURE PHONE AND PLAN
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_restaurant_id UUID;
  r_name TEXT;
  r_slug TEXT;
  r_phone TEXT;
  r_plan TEXT;
  r_interval TEXT;
  r_role TEXT;
BEGIN
  r_name := new.raw_user_meta_data->>'restaurantName';
  r_slug := new.raw_user_meta_data->>'slug';
  r_phone := new.raw_user_meta_data->>'phone';
  r_plan := COALESCE(new.raw_user_meta_data->>'subscriptionPlan', 'starter');
  r_interval := COALESCE(new.raw_user_meta_data->>'billingInterval', 'monthly');
  r_role := COALESCE(new.raw_user_meta_data->>'role', 'owner');

  IF r_name IS NOT NULL AND r_slug IS NOT NULL THEN
    INSERT INTO public.restaurants (name, slug, phone, subscription_plan, subscription_status, billing_interval)
    VALUES (r_name, r_slug, r_phone, r_plan, 'trial', r_interval)
    RETURNING id INTO new_restaurant_id;
  ELSE
    new_restaurant_id := CASE 
      WHEN (new.raw_user_meta_data->>'restaurant_id') IS NOT NULL THEN (new.raw_user_meta_data->>'restaurant_id')::UUID
      ELSE NULL
    END;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, restaurant_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'fullName', ''),
    r_role,
    new_restaurant_id
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. ADD POLICY TO ALLOW RESTAURANT STAFF TO READ ALL PROFILES IN THE SAME RESTAURANT
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(user_id UUID)
RETURNS UUID AS $$
  SELECT restaurant_id FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

DROP POLICY IF EXISTS "Allow users of same restaurant to read profiles" ON public.profiles;
CREATE POLICY "Allow users of same restaurant to read profiles"
    ON public.profiles FOR SELECT
    USING (
        restaurant_id = public.get_user_restaurant_id(auth.uid())
    );



-- ============================================================
-- MIGRATION: 20260626000000_realtime_rls_fixes.sql
-- ============================================================

-- 1. SET REPLICA IDENTITY FULL FOR REALTIME TABLES
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.customer_requests REPLICA IDENTITY FULL;
ALTER TABLE public.restaurants REPLICA IDENTITY FULL;

-- 2. RECREATE REALTIME PUBLICATION SPECIFICALLY FOR THE USED TABLES
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.orders, public.customer_requests, public.restaurants;
COMMIT;

-- 3. SIMPLIFY RLS POLICIES FOR ORDERS TO USE SECURITY DEFINER FUNCTION (NO DIRECT SUBQUERIES)
DROP POLICY IF EXISTS "Allow owners/staff to read/write their restaurant orders" ON public.orders;
CREATE POLICY "Allow owners/staff to read/write their restaurant orders"
    ON public.orders FOR ALL
    USING (
        restaurant_id = public.get_user_restaurant_id(auth.uid())
    );

-- 4. SIMPLIFY RLS POLICIES FOR ORDER_ITEMS
DROP POLICY IF EXISTS "Allow owners/staff to read/write order items" ON public.order_items;
CREATE POLICY "Allow owners/staff to read/write order items"
    ON public.order_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id 
              AND o.restaurant_id = public.get_user_restaurant_id(auth.uid())
        )
    );

-- 5. SIMPLIFY RLS POLICIES FOR CUSTOMER_REQUESTS
DROP POLICY IF EXISTS "Allow owners/staff to manage customer requests" ON public.customer_requests;
CREATE POLICY "Allow owners/staff to manage customer requests"
    ON public.customer_requests FOR ALL
    USING (
        restaurant_id = public.get_user_restaurant_id(auth.uid())
    );


-- ============================================================
-- MIGRATION: 20260626000001_restaurant_alert_workflow.sql
-- ============================================================

-- 1. SET REPLICA IDENTITY FULL FOR ALL TABLES
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.customer_requests REPLICA IDENTITY FULL;
ALTER TABLE public.restaurants REPLICA IDENTITY FULL;

-- 2. RECREATE PUBLICATION FOR REALTIME TABLES
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.orders, public.order_items, public.customer_requests, public.restaurants;

-- 3. DROP AND RECREATE CUSTOMER REQUESTS STATUS CHECK CONSTRAINT
ALTER TABLE public.customer_requests DROP CONSTRAINT IF EXISTS customer_requests_status_check;
ALTER TABLE public.customer_requests ADD CONSTRAINT customer_requests_status_check CHECK (status IN ('pending', 'completed'));

-- 4. MIGRATE EXISTING USERS' METADATA TO INCLUDE RESTAURANT_ID AND ROLE
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('restaurant_id', p.restaurant_id, 'role', p.role)
FROM public.profiles p
WHERE p.id = u.id AND p.restaurant_id IS NOT NULL;

-- 5. UPDATE SIGNUP TRIGGER FUNCTION TO AUTOMATICALLY CAPTURE AND SYNC METADATA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_restaurant_id UUID;
  r_name TEXT;
  r_slug TEXT;
  r_phone TEXT;
  r_plan TEXT;
  r_interval TEXT;
  r_role TEXT;
BEGIN
  r_name := new.raw_user_meta_data->>'restaurantName';
  r_slug := new.raw_user_meta_data->>'slug';
  r_phone := new.raw_user_meta_data->>'phone';
  r_plan := COALESCE(new.raw_user_meta_data->>'subscriptionPlan', 'starter');
  r_interval := COALESCE(new.raw_user_meta_data->>'billingInterval', 'monthly');
  r_role := COALESCE(new.raw_user_meta_data->>'role', 'owner');

  IF r_name IS NOT NULL AND r_slug IS NOT NULL THEN
    INSERT INTO public.restaurants (name, slug, phone, subscription_plan, subscription_status, billing_interval)
    VALUES (r_name, r_slug, r_phone, r_plan, 'trial', r_interval)
    RETURNING id INTO new_restaurant_id;
  ELSE
    new_restaurant_id := CASE 
      WHEN (new.raw_user_meta_data->>'restaurant_id') IS NOT NULL THEN (new.raw_user_meta_data->>'restaurant_id')::UUID
      ELSE NULL
    END;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, restaurant_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'fullName', ''),
    r_role,
    new_restaurant_id
  );

  -- Update auth.users metadata to contain restaurant_id and role
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('restaurant_id', new_restaurant_id, 'role', r_role)
  WHERE id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. SIMPLIFY RLS POLICIES FOR ORDERS
DROP POLICY IF EXISTS "Allow owners/staff to read/write their restaurant orders" ON public.orders;
CREATE POLICY "Allow owners/staff to read/write their restaurant orders"
    ON public.orders FOR ALL
    USING (
        restaurant_id = ((auth.jwt() -> 'user_metadata' ->> 'restaurant_id')::uuid)
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    );

-- 7. SIMPLIFY RLS POLICIES FOR CUSTOMER_REQUESTS
DROP POLICY IF EXISTS "Allow owners/staff to manage customer requests" ON public.customer_requests;
CREATE POLICY "Allow owners/staff to manage customer requests"
    ON public.customer_requests FOR ALL
    USING (
        restaurant_id = ((auth.jwt() -> 'user_metadata' ->> 'restaurant_id')::uuid)
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    );

-- 8. SIMPLIFY RLS POLICIES FOR RESTAURANTS UPDATE
DROP POLICY IF EXISTS "Allow owners/staff to update their own restaurant" ON public.restaurants;
CREATE POLICY "Allow owners/staff to update their own restaurant"
    ON public.restaurants FOR UPDATE
    USING (
        id = ((auth.jwt() -> 'user_metadata' ->> 'restaurant_id')::uuid)
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    );

-- 9. SIMPLIFY RLS POLICIES FOR PROFILES
DROP POLICY IF EXISTS "Allow users of same restaurant to read profiles" ON public.profiles;
CREATE POLICY "Allow users of same restaurant to read profiles"
    ON public.profiles FOR SELECT
    USING (
        restaurant_id = ((auth.jwt() -> 'user_metadata' ->> 'restaurant_id')::uuid)
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    );


-- ============================================================
-- MIGRATION: 20260627000000_multi_batch_orders.sql
-- ============================================================

-- Migration: Multi-batch orders support and stage tracking timestamps

-- 1. Create order_batches table
CREATE TABLE IF NOT EXISTS public.order_batches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    batch_number integer NOT NULL,
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'preparing', 'ready', 'served')),
    special_instructions text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    accepted_at timestamptz,
    preparing_at timestamptz,
    ready_at timestamptz,
    served_at timestamptz
);

-- Enable RLS for order_batches
ALTER TABLE public.order_batches ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for order_batches
DROP POLICY IF EXISTS "Allow public to insert order_batches" ON public.order_batches;
CREATE POLICY "Allow public to insert order_batches" ON public.order_batches FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public to read order_batches" ON public.order_batches;
CREATE POLICY "Allow public to read order_batches" ON public.order_batches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow owners/staff to manage order_batches" ON public.order_batches;
CREATE POLICY "Allow owners/staff to manage order_batches" ON public.order_batches FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_batches.order_id 
          AND (o.restaurant_id = ((auth.jwt() -> 'user_metadata' ->> 'restaurant_id')::uuid)
               OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
    )
);

-- 2. Add batch_id to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.order_batches(id) ON DELETE CASCADE;

-- 3. Migrate existing data to create default batches
DO $$
DECLARE
    r RECORD;
    b_id uuid;
BEGIN
    FOR r IN SELECT id, status, special_instructions, created_at FROM public.orders LOOP
        -- Only insert if the order doesn't already have any batches
        IF NOT EXISTS (SELECT 1 FROM public.order_batches WHERE order_id = r.id) THEN
            -- Create a default batch for each order
            INSERT INTO public.order_batches (
                order_id, 
                batch_number, 
                status, 
                special_instructions, 
                created_at, 
                updated_at,
                accepted_at,
                preparing_at,
                ready_at,
                served_at
            )
            VALUES (
                r.id, 
                1, 
                CASE 
                    WHEN r.status IN ('completed', 'cancelled') THEN 'served'::text
                    ELSE r.status 
                END, 
                r.special_instructions, 
                r.created_at, 
                r.created_at,
                CASE WHEN r.status IN ('accepted', 'preparing', 'ready', 'served', 'completed') THEN r.created_at ELSE NULL END,
                CASE WHEN r.status IN ('preparing', 'ready', 'served', 'completed') THEN r.created_at ELSE NULL END,
                CASE WHEN r.status IN ('ready', 'served', 'completed') THEN r.created_at ELSE NULL END,
                CASE WHEN r.status IN ('served', 'completed') THEN r.created_at ELSE NULL END
            )
            RETURNING id INTO b_id;

            -- Update order_items for this order to point to the new batch
            UPDATE public.order_items 
            SET batch_id = b_id 
            WHERE order_id = r.id;
        END IF;
    END LOOP;
END $$;

-- 4. Enable replica identity and update realtime publication
ALTER TABLE public.order_batches REPLICA IDENTITY FULL;

DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.orders, 
    public.order_items, 
    public.order_batches, 
    public.customer_requests, 
    public.restaurants;


-- ============================================================
-- MIGRATION: 20260627000001_order_batches_rls_fix.sql
-- ============================================================

-- Fix RLS policy for order_batches to use get_user_restaurant_id helper instead of auth.jwt()
DROP POLICY IF EXISTS "Allow owners/staff to manage order_batches" ON public.order_batches;

CREATE POLICY "Allow owners/staff to manage order_batches" 
ON public.order_batches FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_batches.order_id 
          AND (
              o.restaurant_id = public.get_user_restaurant_id(auth.uid())
              OR EXISTS (
                  SELECT 1 FROM public.profiles p 
                  WHERE p.id = auth.uid() AND p.role = 'super_admin'
              )
          )
    )
);


-- ============================================================
-- MIGRATION: 20260627000002_billing_trigger.sql
-- ============================================================

-- Function to synchronize parent order totals from associated order_items
CREATE OR REPLACE FUNCTION public.sync_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_restaurant_id UUID;
  v_subtotal NUMERIC;
  v_gst_percentage NUMERIC;
  v_service_charge_percentage NUMERIC;
  v_gst NUMERIC;
  v_service_charge NUMERIC;
  v_total NUMERIC;
  v_settings JSONB;
BEGIN
  -- Determine the order_id depending on the trigger event type
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;

  -- Ensure we have a valid order ID
  IF v_order_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch restaurant ID and settings
  SELECT restaurant_id INTO v_restaurant_id FROM public.orders WHERE id = v_order_id;
  IF v_restaurant_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT settings INTO v_settings FROM public.restaurants WHERE id = v_restaurant_id;

  -- Extract percentages (defaulting to 0 if missing)
  v_gst_percentage := COALESCE((v_settings->>'gst_percentage')::NUMERIC, 0);
  v_service_charge_percentage := COALESCE((v_settings->>'service_charge_percentage')::NUMERIC, 0);

  -- Sum up order_items
  SELECT COALESCE(SUM(price * quantity), 0) INTO v_subtotal
  FROM public.order_items
  WHERE order_id = v_order_id;

  -- Compute GST and service charges
  v_gst := ROUND((v_subtotal * v_gst_percentage / 100.0), 2);
  v_service_charge := ROUND((v_subtotal * v_service_charge_percentage / 100.0), 2);
  v_total := v_subtotal + v_gst + v_service_charge;

  -- Update the parent order record
  UPDATE public.orders
  SET 
    subtotal = v_subtotal,
    gst = v_gst,
    service_charge = v_service_charge,
    total = v_total
  WHERE id = v_order_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_sync_order_totals ON public.order_items;
CREATE TRIGGER trg_sync_order_totals
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.sync_order_totals();


-- ============================================================
-- MIGRATION: 20260627000003_order_batches_public_select.sql
-- ============================================================

-- Grant SELECT access on order_batches to everyone (including anonymous customers)
CREATE POLICY "Allow public select access to order_batches"
ON public.order_batches FOR SELECT
USING (true);


-- ============================================================
-- MIGRATION: 20260628000000_activity_log_and_cancellation.sql
-- ============================================================

-- Add completed, cancelled, and cancellation details to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_by text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Add performer details to order_batches table
ALTER TABLE public.order_batches ADD COLUMN IF NOT EXISTS accepted_by text;
ALTER TABLE public.order_batches ADD COLUMN IF NOT EXISTS preparing_by text;
ALTER TABLE public.order_batches ADD COLUMN IF NOT EXISTS ready_by text;
ALTER TABLE public.order_batches ADD COLUMN IF NOT EXISTS served_by text;

-- Add custom_charges column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_charges jsonb default '[]'::jsonb;

-- Function to synchronize parent order totals from associated order_items with custom charges support
CREATE OR REPLACE FUNCTION public.sync_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_restaurant_id UUID;
  v_subtotal NUMERIC;
  v_gst_percentage NUMERIC;
  v_service_charge_percentage NUMERIC;
  v_gst_enabled BOOLEAN;
  v_service_charge_enabled BOOLEAN;
  v_gst NUMERIC;
  v_service_charge NUMERIC;
  v_total NUMERIC;
  v_settings JSONB;
  v_custom_charges_snapshot JSONB;
  v_charge_row JSONB;
  v_custom_total NUMERIC := 0;
  v_charge_val NUMERIC;
BEGIN
  -- Determine the order_id depending on the trigger event type
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;

  -- Ensure we have a valid order ID
  IF v_order_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch restaurant ID
  SELECT restaurant_id INTO v_restaurant_id FROM public.orders WHERE id = v_order_id;
  IF v_restaurant_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch restaurant settings
  SELECT settings INTO v_settings FROM public.restaurants WHERE id = v_restaurant_id;

  -- Extract configuration
  v_gst_enabled := COALESCE((v_settings->>'gst_enabled')::BOOLEAN, true);
  v_gst_percentage := CASE WHEN v_gst_enabled THEN COALESCE((v_settings->>'gst_percentage')::NUMERIC, 0) ELSE 0 END;

  v_service_charge_enabled := COALESCE((v_settings->>'service_charge_enabled')::BOOLEAN, true);
  v_service_charge_percentage := CASE WHEN v_service_charge_enabled THEN COALESCE((v_settings->>'service_charge_percentage')::NUMERIC, 0) ELSE 0 END;

  -- Sum up order_items
  SELECT COALESCE(SUM(price * quantity), 0) INTO v_subtotal
  FROM public.order_items
  WHERE order_id = v_order_id;

  -- Compute GST and service charges
  v_gst := ROUND((v_subtotal * v_gst_percentage / 100.0), 2);
  v_service_charge := ROUND((v_subtotal * v_service_charge_percentage / 100.0), 2);

  -- Fetch custom charges snapshot from order
  SELECT custom_charges INTO v_custom_charges_snapshot FROM public.orders WHERE id = v_order_id;
  
  -- If snapshot is empty or null, initialize from restaurant settings
  IF v_custom_charges_snapshot IS NULL OR v_custom_charges_snapshot = '[]'::jsonb THEN
    v_custom_charges_snapshot := '[]'::jsonb;
    IF v_settings ? 'custom_charges' AND jsonb_typeof(v_settings->'custom_charges') = 'array' THEN
      FOR v_charge_row IN SELECT jsonb_array_elements(v_settings->'custom_charges') LOOP
        IF (v_charge_row->>'enabled')::BOOLEAN = true THEN
          v_custom_charges_snapshot := v_custom_charges_snapshot || jsonb_build_array(v_charge_row);
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Calculate total of custom charges from snapshot
  IF jsonb_typeof(v_custom_charges_snapshot) = 'array' THEN
    FOR v_charge_row IN SELECT jsonb_array_elements(v_custom_charges_snapshot) LOOP
      v_charge_val := (v_charge_row->>'value')::NUMERIC;
      IF v_charge_row->>'type' = 'percentage' THEN
        v_custom_total := v_custom_total + ROUND((v_subtotal * v_charge_val / 100.0), 2);
      ELSE
        v_custom_total := v_custom_total + v_charge_val;
      END IF;
    END LOOP;
  END IF;

  v_total := v_subtotal + v_gst + v_service_charge + v_custom_total;

  -- Update the parent order record
  UPDATE public.orders
  SET 
    subtotal = v_subtotal,
    gst = v_gst,
    service_charge = v_service_charge,
    custom_charges = v_custom_charges_snapshot,
    total = v_total
  WHERE id = v_order_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- MIGRATION: 20260628000001_customer_upi_payment.sql
-- ============================================================

-- Add payment status, method, reference, paid_at and marked_paid_by to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS marked_paid_by text;

-- Allow public (customers) to update order payment status on checkout
DROP POLICY IF EXISTS "Allow public to update payment status" ON public.orders;
CREATE POLICY "Allow public to update payment status" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);


-- ============================================================
-- MIGRATION: 20260628000002_takeaway_fields.sql
-- ============================================================

-- Add order_type, customer_arrival_minutes and takeaway_notes to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway')),
ADD COLUMN IF NOT EXISTS customer_arrival_minutes integer,
ADD COLUMN IF NOT EXISTS takeaway_notes text;


-- ============================================================
-- END OF DATABASE BACKUP
-- Migrations applied: 11
-- ============================================================
