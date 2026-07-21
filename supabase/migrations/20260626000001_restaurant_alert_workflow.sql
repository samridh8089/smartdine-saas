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
