-- ============================================================
-- Migration: Staff Management Improvements
-- Adds plain_password column to profiles for staff management
-- Updates trigger to store it
-- Adds RPC to securely delete staff users
-- ============================================================

-- Add plain_password to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plain_password text;

-- Update handle_new_user to capture plain_password
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
  r_plain text;
begin
  r_name := new.raw_user_meta_data->>'restaurantName';
  r_slug := new.raw_user_meta_data->>'slug';
  r_phone := new.raw_user_meta_data->>'phone';
  r_plan := coalesce(new.raw_user_meta_data->>'subscriptionPlan', 'starter');
  r_interval := coalesce(new.raw_user_meta_data->>'billingInterval', 'monthly');
  r_role := coalesce(new.raw_user_meta_data->>'role', 'owner');
  r_plain := new.raw_user_meta_data->>'plain_password';

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

  insert into public.profiles (id, email, full_name, role, restaurant_id, plain_password)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'fullName', ''),
    r_role,
    new_restaurant_id,
    r_plain
  );
  
  return new;
end;
$$ language plpgsql security definer;

-- Create RPC to securely delete staff user by ID
create or replace function public.delete_staff_user(target_user_id uuid)
returns void as $$
begin
  -- ensure the caller is an owner or super_admin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'super_admin')) then
    raise exception 'Unauthorized';
  end if;
  
  -- ensure target is not an owner
  if exists (select 1 from public.profiles where id = target_user_id and role = 'owner') then
    raise exception 'Cannot delete owner account';
  end if;
  
  -- delete the user from auth.users
  delete from auth.users where id = target_user_id;
end;
$$ language plpgsql security definer;
