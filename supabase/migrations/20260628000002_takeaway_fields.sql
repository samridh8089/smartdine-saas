-- Add order_type, customer_arrival_minutes and takeaway_notes to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway')),
ADD COLUMN IF NOT EXISTS customer_arrival_minutes integer,
ADD COLUMN IF NOT EXISTS takeaway_notes text;
