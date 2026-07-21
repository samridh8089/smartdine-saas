-- Add completed, cancelled, and cancellation details to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_by text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Add performer details to order_batches table
ALTER TABLE public.order_batches ADD COLUMN IF NOT EXISTS accepted_by text;
ALTER TABLE public.order_batches ADD COLUMN IF NOT EXISTS preparing_by text;
ALTER TABLE public.order_batches ADD COLUMN IF NOT EXISTS ready_by text;
ALTER TABLE public.order_batches ADD COLUMN IF NOT EXISTS served_by text;

-- Add custom_charges column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_charges jsonb default '[]'::jsonb;

-- Function to synchronize parent order totals from associated order_items with custom charges support
CREATE OR REPLACE FUNCTION public.sync_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_restaurant_id UUID;
  v_subtotal NUMERIC;
  v_gst_percentage NUMERIC;
  v_service_charge_percentage NUMERIC;
  v_gst_enabled BOOLEAN;
  v_service_charge_enabled BOOLEAN;
  v_gst NUMERIC;
  v_service_charge NUMERIC;
  v_total NUMERIC;
  v_settings JSONB;
  v_custom_charges_snapshot JSONB;
  v_charge_row JSONB;
  v_custom_total NUMERIC := 0;
  v_charge_val NUMERIC;
BEGIN
  -- Determine the order_id depending on the trigger event type
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;

  -- Ensure we have a valid order ID
  IF v_order_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch restaurant ID
  SELECT restaurant_id INTO v_restaurant_id FROM public.orders WHERE id = v_order_id;
  IF v_restaurant_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch restaurant settings
  SELECT settings INTO v_settings FROM public.restaurants WHERE id = v_restaurant_id;

  -- Extract configuration
  v_gst_enabled := COALESCE((v_settings->>'gst_enabled')::BOOLEAN, true);
  v_gst_percentage := CASE WHEN v_gst_enabled THEN COALESCE((v_settings->>'gst_percentage')::NUMERIC, 0) ELSE 0 END;

  v_service_charge_enabled := COALESCE((v_settings->>'service_charge_enabled')::BOOLEAN, true);
  v_service_charge_percentage := CASE WHEN v_service_charge_enabled THEN COALESCE((v_settings->>'service_charge_percentage')::NUMERIC, 0) ELSE 0 END;

  -- Sum up order_items
  SELECT COALESCE(SUM(price * quantity), 0) INTO v_subtotal
  FROM public.order_items
  WHERE order_id = v_order_id;

  -- Compute GST and service charges
  v_gst := ROUND((v_subtotal * v_gst_percentage / 100.0), 2);
  v_service_charge := ROUND((v_subtotal * v_service_charge_percentage / 100.0), 2);

  -- Fetch custom charges snapshot from order
  SELECT custom_charges INTO v_custom_charges_snapshot FROM public.orders WHERE id = v_order_id;
  
  -- If snapshot is empty or null, initialize from restaurant settings
  IF v_custom_charges_snapshot IS NULL OR v_custom_charges_snapshot = '[]'::jsonb THEN
    v_custom_charges_snapshot := '[]'::jsonb;
    IF v_settings ? 'custom_charges' AND jsonb_typeof(v_settings->'custom_charges') = 'array' THEN
      FOR v_charge_row IN SELECT jsonb_array_elements(v_settings->'custom_charges') LOOP
        IF (v_charge_row->>'enabled')::BOOLEAN = true THEN
          v_custom_charges_snapshot := v_custom_charges_snapshot || jsonb_build_array(v_charge_row);
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Calculate total of custom charges from snapshot
  IF jsonb_typeof(v_custom_charges_snapshot) = 'array' THEN
    FOR v_charge_row IN SELECT jsonb_array_elements(v_custom_charges_snapshot) LOOP
      v_charge_val := (v_charge_row->>'value')::NUMERIC;
      IF v_charge_row->>'type' = 'percentage' THEN
        v_custom_total := v_custom_total + ROUND((v_subtotal * v_charge_val / 100.0), 2);
      ELSE
        v_custom_total := v_custom_total + v_charge_val;
      END IF;
    END LOOP;
  END IF;

  v_total := v_subtotal + v_gst + v_service_charge + v_custom_total;

  -- Update the parent order record
  UPDATE public.orders
  SET 
    subtotal = v_subtotal,
    gst = v_gst,
    service_charge = v_service_charge,
    custom_charges = v_custom_charges_snapshot,
    total = v_total
  WHERE id = v_order_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
