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
