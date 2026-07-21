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

