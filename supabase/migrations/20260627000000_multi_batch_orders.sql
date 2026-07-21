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
