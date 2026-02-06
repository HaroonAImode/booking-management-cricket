-- ========================================
-- EMERGENCY FIX: Restore create_booking_with_slots Function
-- ========================================
-- Issue: Function not found in schema cache, blocking all customer bookings
-- Solution: Drop all versions and recreate with exact signature
-- Run this in Supabase SQL Editor IMMEDIATELY

-- ========================================
-- STEP 1: Drop ALL existing versions
-- ========================================

-- Drop with all possible parameter combinations
DROP FUNCTION IF EXISTS public.create_booking_with_slots(text, date, integer, numeric, numeric, text, text, jsonb, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_booking_with_slots(text, text, date, integer, numeric, numeric, text, text, jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_booking_with_slots CASCADE;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- ========================================
-- STEP 2: Recreate function with EXACT signature
-- ========================================

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

  -- Step 2: Create customer
  -- Each booking gets its own customer record
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
        -- Use slot_date from JSON if provided, otherwise use booking_date
        COALESCE((v_slot->>'slot_date')::DATE, p_booking_date),
        (v_slot->>'slot_time')::TIME,
        (v_slot->>'slot_hour')::INTEGER,
        (v_slot->>'is_night_rate')::BOOLEAN,
        (v_slot->>'hourly_rate')::NUMERIC,
        'pending'
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- Slot was booked by someone else - rollback
        DELETE FROM bookings WHERE id = v_booking_id;
        DELETE FROM customers WHERE id = v_customer_id;
        RETURN QUERY SELECT 
          false AS success,
          NULL::UUID AS booking_id,
          NULL::TEXT AS booking_number,
          'Slot conflict: One or more slots were just booked by another customer' AS error_message;
        RETURN;
      WHEN OTHERS THEN
        -- Any other error - rollback everything
        DELETE FROM bookings WHERE id = v_booking_id;
        DELETE FROM customers WHERE id = v_customer_id;
        RETURN QUERY SELECT 
          false AS success,
          NULL::UUID AS booking_id,
          NULL::TEXT AS booking_number,
          'Database error: ' || SQLERRM AS error_message;
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

-- ========================================
-- STEP 3: Grant permissions to ALL roles
-- ========================================

-- Grant to anonymous users (public booking form)
GRANT EXECUTE ON FUNCTION public.create_booking_with_slots(
  text, date, integer, numeric, numeric, text, text, jsonb, text, text
) TO anon;

-- Grant to authenticated users (admin manual booking)
GRANT EXECUTE ON FUNCTION public.create_booking_with_slots(
  text, date, integer, numeric, numeric, text, text, jsonb, text, text
) TO authenticated;

-- Grant to public role (backup)
GRANT EXECUTE ON FUNCTION public.create_booking_with_slots(
  text, date, integer, numeric, numeric, text, text, jsonb, text, text
) TO public;

-- ========================================
-- STEP 4: Add function comment
-- ========================================

COMMENT ON FUNCTION public.create_booking_with_slots IS 
'Create booking with customer and slots atomically. Prevents double booking with database-level transaction safety. Supports multi-day bookings via slot_date in JSON.';

-- ========================================
-- STEP 5: Force schema reload (multiple times)
-- ========================================

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- ========================================
-- STEP 6: Verify function exists
-- ========================================

SELECT 
  routine_name,
  routine_type,
  data_type,
  specific_name
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'create_booking_with_slots';

-- Expected output: Should show create_booking_with_slots function

-- ========================================
-- STEP 7: Test the function
-- ========================================

-- Test call to verify it works
-- (Will fail with slot conflict since we're using test data)
SELECT * FROM public.create_booking_with_slots(
  'Test Customer',                    -- p_customer_name
  CURRENT_DATE + INTERVAL '7 days',   -- p_booking_date (future date)
  2,                                  -- p_total_hours
  3000.00,                            -- p_total_amount
  500.00,                             -- p_advance_payment
  'cash',                             -- p_advance_payment_method
  'test-proof-url',                   -- p_advance_payment_proof
  '[
    {"slot_hour": 14, "slot_time": "14:00:00", "slot_date": "2026-02-13", "is_night_rate": false, "hourly_rate": 1500},
    {"slot_hour": 15, "slot_time": "15:00:00", "slot_date": "2026-02-13", "is_night_rate": false, "hourly_rate": 1500}
  ]'::jsonb,                          -- p_slots
  '03001234567',                      -- p_customer_phone
  'Test booking'                      -- p_customer_notes
);

-- If this returns a result (success=true or success=false with error), the function is working!

-- ========================================
-- TROUBLESHOOTING
-- ========================================

-- If function still not found:
-- 1. Check PostgREST logs in Supabase Dashboard > Database > Logs
-- 2. Try restarting PostgREST: Contact Supabase support or wait 5 minutes
-- 3. Verify permissions: Run the GRANT commands again
-- 4. Check if function exists: Run STEP 6 query above

-- If "check_and_reserve_slots not found":
-- That function might be missing. Check database-schema-v2.sql or booking-conflict-prevention.sql

-- ========================================
-- SUCCESS INDICATORS
-- ========================================

-- ✅ Function verification query returns 1 row
-- ✅ Test call returns result (even if error about slots)
-- ✅ Customer booking form works without 404 error

NOTIFY pgrst, 'reload schema';
