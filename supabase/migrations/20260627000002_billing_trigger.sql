-- Function to synchronize parent order totals from associated order_items
CREATE OR REPLACE FUNCTION public.sync_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_restaurant_id UUID;
  v_subtotal NUMERIC;
  v_gst_percentage NUMERIC;
  v_service_charge_percentage NUMERIC;
  v_gst NUMERIC;
  v_service_charge NUMERIC;
  v_total NUMERIC;
  v_settings JSONB;
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

  -- Fetch restaurant ID and settings
  SELECT restaurant_id INTO v_restaurant_id FROM public.orders WHERE id = v_order_id;
  IF v_restaurant_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT settings INTO v_settings FROM public.restaurants WHERE id = v_restaurant_id;

  -- Extract percentages (defaulting to 0 if missing)
  v_gst_percentage := COALESCE((v_settings->>'gst_percentage')::NUMERIC, 0);
  v_service_charge_percentage := COALESCE((v_settings->>'service_charge_percentage')::NUMERIC, 0);

  -- Sum up order_items
  SELECT COALESCE(SUM(price * quantity), 0) INTO v_subtotal
  FROM public.order_items
  WHERE order_id = v_order_id;

  -- Compute GST and service charges
  v_gst := ROUND((v_subtotal * v_gst_percentage / 100.0), 2);
  v_service_charge := ROUND((v_subtotal * v_service_charge_percentage / 100.0), 2);
  v_total := v_subtotal + v_gst + v_service_charge;

  -- Update the parent order record
  UPDATE public.orders
  SET 
    subtotal = v_subtotal,
    gst = v_gst,
    service_charge = v_service_charge,
    total = v_total
  WHERE id = v_order_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_sync_order_totals ON public.order_items;
CREATE TRIGGER trg_sync_order_totals
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.sync_order_totals();
