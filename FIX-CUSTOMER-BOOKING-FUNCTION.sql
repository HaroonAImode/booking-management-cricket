-- ========================================
-- FIX: Customer Booking Function (Complete Solution)
-- ========================================
-- ISSUE: Customers getting 404 error when booking
-- ERROR: "Could not find the function public.create_booking_with_slots"
-- 
-- Frontend sends these parameters:
-- - p_customer_name, p_booking_date, p_total_hours, p_total_amount
-- - p_advance_payment, p_advance_payment_method, p_advance_payment_proof
-- - p_slots, p_customer_phone, p_customer_notes
-- ========================================

-- ========================================
-- STEP 1: Drop ALL existing versions
-- ========================================

DROP FUNCTION IF EXISTS public.create_booking_with_slots(
    text, date, integer, numeric, numeric, text, text, jsonb, text, text
) CASCADE;

DROP FUNCTION IF EXISTS public.create_booking_with_slots(
    text, text, date, integer, numeric, numeric, text, jsonb, text
) CASCADE;

DROP FUNCTION IF EXISTS public.create_booking_with_slots(
    text, date, integer, numeric, numeric, text, jsonb, text, text
) CASCADE;

DROP FUNCTION IF EXISTS public.create_booking_with_slots CASCADE;

-- ========================================
-- STEP 2: Create function with EXACT signature
-- ========================================

CREATE OR REPLACE FUNCTION public.create_booking_with_slots(
  p_customer_name text,
  p_booking_date date,
  p_total_hours integer,
  p_total_amount numeric,
  p_advance_payment numeric,
  p_advance_payment_method text,
  p_advance_payment_proof text DEFAULT NULL,
  p_slots jsonb DEFAULT '[]'::jsonb,
  p_customer_phone text DEFAULT NULL,
  p_customer_notes text DEFAULT NULL
)
RETURNS TABLE(success boolean, booking_id uuid, booking_number text, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
  v_booking_id UUID;
  v_booking_number TEXT;
  v_slot JSONB;
  v_slot_hours INTEGER[];
  v_conflicts JSONB;
  v_is_available BOOLEAN;
  v_remaining_payment NUMERIC;
  v_date_counter INTEGER := 1;
  v_max_number INTEGER;
BEGIN
  -- Validate inputs
  IF p_customer_name IS NULL OR p_customer_name = '' THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Customer name is required';
    RETURN;
  END IF;

  IF p_customer_phone IS NULL OR p_customer_phone = '' THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Customer phone is required';
    RETURN;
  END IF;

  IF p_slots IS NULL OR jsonb_array_length(p_slots) = 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'No slots provided';
    RETURN;
  END IF;

  -- Extract slot hours for conflict check
  SELECT array_agg((slot->>'slot_hour')::INTEGER)
  INTO v_slot_hours
  FROM jsonb_array_elements(p_slots) AS slot;

  -- Check slot availability for the first slot's date
  SELECT is_slots_available(
    (p_slots->0->>'slot_date')::DATE,
    v_slot_hours
  ) INTO v_is_available;

  IF NOT v_is_available THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'One or more selected slots are no longer available';
    RETURN;
  END IF;

  -- Find or create customer
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = p_customer_phone;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (name, phone)
    VALUES (p_customer_name, p_customer_phone)
    RETURNING id INTO v_customer_id;
  ELSE
    -- Update customer name if changed
    UPDATE customers
    SET name = p_customer_name,
        updated_at = NOW()
    WHERE id = v_customer_id;
  END IF;

  -- Generate booking number (BK-YYYYMMDD-XXX)
  SELECT COALESCE(MAX(
    CASE 
      WHEN booking_number ~ 'BK-[0-9]{8}-[0-9]+' 
      THEN (regexp_match(booking_number, 'BK-[0-9]{8}-([0-9]+)'))[1]::INTEGER
      ELSE 0
    END
  ), 0) INTO v_max_number
  FROM bookings
  WHERE booking_number LIKE 'BK-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';

  v_booking_number := 'BK-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                      LPAD((v_max_number + 1)::TEXT, 3, '0');

  -- Calculate remaining payment
  v_remaining_payment := p_total_amount - p_advance_payment;

  -- Create booking record
  INSERT INTO bookings (
    booking_number,
    customer_id,
    booking_date,
    total_hours,
    total_amount,
    advance_payment,
    advance_payment_method,
    advance_payment_proof,
    advance_payment_date,
    remaining_payment,
    status,
    customer_notes,
    created_at,
    updated_at
  )
  VALUES (
    v_booking_number,
    v_customer_id,
    p_booking_date,
    p_total_hours,
    p_total_amount,
    p_advance_payment,
    p_advance_payment_method,
    p_advance_payment_proof,
    NOW(),
    v_remaining_payment,
    'pending',
    p_customer_notes,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_booking_id;

  -- Insert booking slots
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO booking_slots (
      booking_id,
      slot_date,
      slot_time,
      slot_hour,
      is_night_rate,
      hourly_rate,
      status,
      created_at,
      updated_at
    )
    VALUES (
      v_booking_id,
      (v_slot->>'slot_date')::DATE,
      (v_slot->>'slot_time')::TIME,
      (v_slot->>'slot_hour')::INTEGER,
      (v_slot->>'is_night_rate')::BOOLEAN,
      (v_slot->>'hourly_rate')::NUMERIC,
      'pending',
      NOW(),
      NOW()
    );
  END LOOP;

  -- Return success
  RETURN QUERY SELECT true, v_booking_id, v_booking_number, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 
      format('Database error: %s', SQLERRM);
END;
$$;

-- ========================================
-- STEP 3: Grant permissions
-- ========================================

-- Revoke all first
REVOKE ALL ON FUNCTION public.create_booking_with_slots(
    text, date, integer, numeric, numeric, text, text, jsonb, text, text
) FROM PUBLIC, anon, authenticated;

-- Grant execute to all users (customers book without auth)
GRANT EXECUTE ON FUNCTION public.create_booking_with_slots(
    text, date, integer, numeric, numeric, text, text, jsonb, text, text
) TO anon, authenticated, PUBLIC;

-- ========================================
-- STEP 4: Force PostgREST schema reload
-- ========================================

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';

-- Wait a moment for reload
SELECT pg_sleep(2);

-- Force another reload
NOTIFY pgrst, 'reload schema';

-- ========================================
-- STEP 5: Verify function is accessible
-- ========================================

-- Check function exists
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'create_booking_with_slots';
    
  IF v_count > 0 THEN
    RAISE NOTICE '✅ Function create_booking_with_slots exists';
  ELSE
    RAISE WARNING '❌ Function not found!';
  END IF;
END $$;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CUSTOMER BOOKING FUNCTION RESTORED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Function: create_booking_with_slots';
  RAISE NOTICE 'Parameters: 10 (including p_advance_payment_proof)';
  RAISE NOTICE 'Permissions: Granted to anon, authenticated, public';
  RAISE NOTICE 'PostgREST: Schema cache reloaded';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Wait 1-2 minutes for PostgREST to fully reload';
  RAISE NOTICE '2. Test customer booking from public page';
  RAISE NOTICE '3. If still not working, restart Supabase services';
  RAISE NOTICE '========================================';
END $$;
