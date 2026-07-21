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

