-- ========================================
-- FIX CROSS-DATE BOOKING CRASH
-- ========================================
-- Problem: prevent_slot_overlap() trigger uses booking_date instead of slot_date
-- This causes crashes on cross-date bookings (e.g., Feb 19 11PM + Feb 20 12AM)
-- ========================================

-- 1. FIX prevent_slot_overlap TRIGGER FUNCTION
-- Drop and recreate with correct slot_date comparison
DROP TRIGGER IF EXISTS trg_prevent_slot_overlap ON booking_slots;
DROP FUNCTION IF EXISTS prevent_slot_overlap();

CREATE OR REPLACE FUNCTION prevent_slot_overlap()
RETURNS TRIGGER AS $$
DECLARE
  v_booking_status TEXT;
  v_conflict_count INTEGER;
BEGIN
  -- Skip check if no booking_id (shouldn't happen but be safe)
  IF NEW.booking_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get booking status
  SELECT status
  INTO v_booking_status
  FROM bookings
  WHERE id = NEW.booking_id;

  -- Only check for active bookings
  IF v_booking_status IN ('pending', 'approved', 'completed') THEN
    -- Check for conflicts using ACTUAL SLOT DATE (not booking_date)
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM booking_slots bs
    INNER JOIN bookings b ON bs.booking_id = b.id
    WHERE bs.slot_date = NEW.slot_date  -- ✅ Compare actual slot dates
      AND bs.slot_hour = NEW.slot_hour  -- ✅ Compare slot hours
      AND b.status IN ('pending', 'approved', 'completed')
      AND bs.booking_id != NEW.booking_id;  -- Exclude self

    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'Slot hour % on date % is already booked', 
        NEW.slot_hour, NEW.slot_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trg_prevent_slot_overlap
  BEFORE INSERT OR UPDATE ON booking_slots
  FOR EACH ROW
  EXECUTE FUNCTION prevent_slot_overlap();

-- ========================================
-- 2. FIX check_and_reserve_slots TO SUPPORT MULTIPLE DATES
-- ========================================
-- Current function only checks ONE date, but cross-date bookings need multiple dates
DROP FUNCTION IF EXISTS check_and_reserve_slots(DATE, INTEGER[]);

CREATE OR REPLACE FUNCTION check_and_reserve_slots(
  p_slots JSONB  -- Changed: Now accepts full slot data with dates
)
RETURNS TABLE(available BOOLEAN, conflicting_slots JSONB) AS $$
DECLARE
  v_conflicts JSONB;
  v_slot JSONB;
  v_slot_date DATE;
  v_slot_hour INTEGER;
BEGIN
  -- Build conflict check for all slots (supporting multiple dates)
  SELECT jsonb_agg(
    jsonb_build_object(
      'slot_date', bs.slot_date,
      'slot_hour', bs.slot_hour,
      'slot_time', bs.slot_time,
      'status', bs.status,
      'booking_id', bs.booking_id
    )
  ) INTO v_conflicts
  FROM booking_slots bs
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_slots) AS slot
    WHERE bs.slot_date = COALESCE((slot->>'slot_date')::DATE, (slot->>'slot_date')::DATE)
      AND bs.slot_hour = (slot->>'slot_hour')::INTEGER
      AND bs.status IN ('pending', 'booked')
  );

  -- Return availability status
  IF v_conflicts IS NULL THEN
    RETURN QUERY SELECT true AS available, '[]'::JSONB AS conflicting_slots;
  ELSE
    RETURN QUERY SELECT false AS available, v_conflicts AS conflicting_slots;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. UPDATE create_booking_with_slots TO USE NEW check_and_reserve_slots
-- ========================================
DROP FUNCTION IF EXISTS create_booking_with_slots(TEXT, DATE, INTEGER, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_booking_with_slots(
  p_customer_name TEXT,
  p_booking_date DATE,
  p_total_hours INTEGER,
  p_total_amount NUMERIC,
  p_advance_payment NUMERIC,
  p_advance_payment_method TEXT,
  p_advance_payment_proof TEXT,
  p_slots JSONB,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, booking_id UUID, booking_number TEXT, error_message TEXT) AS $$
DECLARE
  v_customer_id UUID;
  v_booking_id UUID;
  v_booking_number TEXT;
  v_slot JSONB;
  v_is_available BOOLEAN;
  v_conflicts JSONB;
BEGIN
  -- Step 1: Check slot availability (supports multiple dates now)
  SELECT * INTO v_is_available, v_conflicts
  FROM check_and_reserve_slots(p_slots);

  IF NOT v_is_available THEN
    RETURN QUERY SELECT 
      false AS success,
      NULL::UUID AS booking_id,
      NULL::TEXT AS booking_number,
      'Slot conflict: Some selected slots are no longer available' AS error_message;
    RETURN;
  END IF;

  -- Step 2: Create customer
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

  -- Step 4: Create booking slots (supports cross-date bookings)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VERIFICATION
-- ========================================

-- 1. Verify prevent_slot_overlap now checks slot_date
SELECT 
  'prevent_slot_overlap fix' as test,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%bs.slot_date = NEW.slot_date%' 
    THEN '✅ Now uses slot_date (FIXED)'
    ELSE '❌ Still has bug'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'prevent_slot_overlap';

-- 2. Verify functions exist
SELECT 
  proname as function_name,
  '✅ Function exists' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('prevent_slot_overlap', 'check_and_reserve_slots', 'create_booking_with_slots')
ORDER BY proname;

-- ========================================
-- TEST: Try booking the problematic slots
-- ========================================
-- Feb 19 11PM + Feb 20 12AM & 1AM
-- You can test this manually after applying the fix

SELECT '✅ FIX APPLIED - Try booking again now' as status;
