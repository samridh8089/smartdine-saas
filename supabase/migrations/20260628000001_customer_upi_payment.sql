-- Add payment status, method, reference, paid_at and marked_paid_by to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS marked_paid_by text;

-- Allow public (customers) to update order payment status on checkout
DROP POLICY IF EXISTS "Allow public to update payment status" ON public.orders;
CREATE POLICY "Allow public to update payment status" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
