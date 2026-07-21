-- Grant SELECT access on order_batches to everyone (including anonymous customers)
CREATE POLICY "Allow public select access to order_batches"
ON public.order_batches FOR SELECT
USING (true);
