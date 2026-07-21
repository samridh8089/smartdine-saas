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
