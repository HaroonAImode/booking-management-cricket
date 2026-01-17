-- ========================================
-- BOOKING FORM FIELD REMOVAL UPDATE
-- ========================================
-- This script removes email, address, and alternate_phone fields
-- and makes phone number optional instead of required.
--
-- CHANGES:
-- 1. Remove email, address, alternate_phone from customers table
-- 2. Make phone column nullable
-- 3. Update database function create_booking_with_slots
-- 4. Drop unused indexes
-- ========================================

-- Backup current customers table (optional but recommended)
-- CREATE TABLE customers_backup AS SELECT * FROM customers;

-- ========================================
-- Step 1: Drop unused indexes
-- ========================================
DROP INDEX IF EXISTS customers_email_idx;

-- ========================================
-- Step 2: Remove columns from customers table
-- ========================================
ALTER TABLE customers DROP COLUMN IF EXISTS email;
ALTER TABLE customers DROP COLUMN IF EXISTS address;
ALTER TABLE customers DROP COLUMN IF EXISTS alternate_phone;

-- ========================================
-- Step 3: Make phone column optional (nullable)
-- ========================================
ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;

-- Update comment
COMMENT ON COLUMN customers.phone IS 'Primary contact number (optional)';

-- ========================================
-- Step 4: Update create_booking_with_slots function
-- Remove email, address, alternate_phone parameters
-- ========================================
DROP FUNCTION IF EXISTS create_booking_with_slots(TEXT, TEXT, DATE, INTEGER, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_booking_with_slots(
  -- Customer data (required)
  p_customer_name TEXT,
  p_customer_phone TEXT DEFAULT NULL, -- Now optional
  -- Booking data (required)
  p_booking_date DATE,
  p_total_hours INTEGER,
  p_total_amount NUMERIC,
  p_advance_payment NUMERIC,
  p_advance_payment_method TEXT,
  p_advance_payment_proof TEXT,
  -- Slots data (required)
  p_slots JSONB, -- Array of {slot_hour, slot_time, is_night_rate, hourly_rate}
  -- Optional parameters (with defaults)
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  booking_id UUID,
  booking_number TEXT,
  error_message TEXT
) AS $$
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
  -- Check if customer exists by phone (if phone provided)
  IF p_customer_phone IS NOT NULL AND p_customer_phone != '' THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE phone = p_customer_phone
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    -- Create new customer (phone can be null now)
    INSERT INTO customers (name, phone)
    VALUES (p_customer_name, p_customer_phone)
    RETURNING id INTO v_customer_id;
  ELSE
    -- Update existing customer info
    UPDATE customers
    SET 
      name = p_customer_name,
      updated_at = NOW()
    WHERE id = v_customer_id;
  END IF;

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
        p_booking_date,
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_booking_with_slots IS 'Create booking with customer and slots atomically (updated: phone optional, removed email/address/alternate_phone)';

-- ========================================
-- Step 5: Verify changes
-- ========================================
-- Check customers table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'customers' 
-- ORDER BY ordinal_position;

-- ========================================
-- ROLLBACK (if needed)
-- ========================================
-- To rollback these changes, you would need to:
-- 1. ALTER TABLE customers ADD COLUMN email TEXT;
-- 2. ALTER TABLE customers ADD COLUMN address TEXT;
-- 3. ALTER TABLE customers ADD COLUMN alternate_phone TEXT;
-- 4. ALTER TABLE customers ALTER COLUMN phone SET NOT NULL;
-- 5. CREATE INDEX customers_email_idx ON customers(email);
-- 6. Restore the old create_booking_with_slots function
-- ========================================
