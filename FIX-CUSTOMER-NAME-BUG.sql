-- ========================================
-- FIX: Customer Name Overwriting Bug
-- ========================================
-- Problem: When same phone number is used, old customer names get overwritten
-- Solution: Remove the UPDATE logic - keep original customer data intact

DROP FUNCTION IF EXISTS public.create_booking_with_slots(
  text, date, integer, numeric, numeric, text, text, jsonb, text, text
);

CREATE OR REPLACE FUNCTION public.create_booking_with_slots(
  p_customer_name text,
  p_booking_date date,
  p_total_hours integer,
  p_total_amount numeric,
  p_advance_payment numeric,
  p_advance_payment_method text,
  p_advance_payment_proof text,
  p_slots jsonb,
  p_customer_phone text DEFAULT NULL,
  p_customer_notes text DEFAULT NULL
)
RETURNS TABLE(success boolean, booking_id uuid, booking_number text, error_message text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_id UUID;
  v_booking_id UUID;
  v_booking_number TEXT;
  v_slot JSONB;
  v_slot_hours INTEGER[];
  v_conflicts JSONB;
  v_is_available BOOLEAN;
BEGIN
  -- Extract slot hours for conflict check
  SELECT array_agg((slot->>'slot_hour')::INTEGER)
  INTO v_slot_hours
  FROM jsonb_array_elements(p_slots) AS slot;

  -- Step 1: Check slot availability (atomic check)
  SELECT * INTO v_is_available, v_conflicts
  FROM check_and_reserve_slots(p_booking_date, v_slot_hours);

  IF NOT v_is_available THEN
    RETURN QUERY SELECT 
      false AS success,
      NULL::UUID AS booking_id,
      NULL::TEXT AS booking_number,
      'Slot conflict: Some selected slots are no longer available' AS error_message;
    RETURN;
  END IF;

  -- Step 2: Create or find customer
  -- ✅ FIX: ALWAYS CREATE NEW CUSTOMER (don't reuse based on phone)
  -- Each booking gets its own customer record with the name they provided
  INSERT INTO customers (name, phone)
  VALUES (p_customer_name, p_customer_phone)
  RETURNING id INTO v_customer_id;

  -- Step 3: Create booking
  INSERT INTO bookings (
    customer_id,
    booking_date,
    total_hours,
    total_amount,
    advance_payment,
    advance_payment_method,
    advance_payment_proof,
    advance_payment_date,
    remaining_payment,
    customer_notes,
    status
  ) VALUES (
    v_customer_id,
    p_booking_date,
    p_total_hours,
    p_total_amount,
    p_advance_payment,
    p_advance_payment_method,
    p_advance_payment_proof,
    NOW(),
    p_total_amount - p_advance_payment,
    p_customer_notes,
    'pending'
  )
  RETURNING bookings.id, bookings.booking_number INTO v_booking_id, v_booking_number;

  -- Step 4: Create booking slots (atomic batch insert)
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    BEGIN
      INSERT INTO booking_slots (
        booking_id,
        slot_date,
        slot_time,
        slot_hour,
        is_night_rate,
        hourly_rate,
        status
      ) VALUES (
        v_booking_id,
        -- ✅ FIX: Use slot_date from JSON if provided, otherwise use booking_date
        COALESCE((v_slot->>'slot_date')::DATE, p_booking_date),
        (v_slot->>'slot_time')::TIME,
        (v_slot->>'slot_hour')::INTEGER,
        (v_slot->>'is_night_rate')::BOOLEAN,
        (v_slot->>'hourly_rate')::NUMERIC,
        'pending'
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- Slot was booked by someone else in race condition
        -- Rollback by deleting the booking
        DELETE FROM bookings WHERE id = v_booking_id;
        RETURN QUERY SELECT 
          false AS success,
          NULL::UUID AS booking_id,
          NULL::TEXT AS booking_number,
          'Slot conflict: One or more slots were just booked by another customer' AS error_message;
        RETURN;
    END;
  END LOOP;

  -- Success!
  RETURN QUERY SELECT 
    true AS success,
    v_booking_id AS booking_id,
    v_booking_number AS booking_number,
    NULL::TEXT AS error_message;

  RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_booking_with_slots(
  text, date, integer, numeric, numeric, text, text, jsonb, text, text
) TO anon;

GRANT EXECUTE ON FUNCTION public.create_booking_with_slots(
  text, date, integer, numeric, numeric, text, text, jsonb, text, text
) TO authenticated;

COMMENT ON FUNCTION public.create_booking_with_slots IS 'Create booking with slots - FIXED to prevent customer name overwriting';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
