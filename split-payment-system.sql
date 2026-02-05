-- ========================================
-- SPLIT PAYMENT SYSTEM FOR REMAINING AMOUNT
-- ========================================
-- Allows splitting remaining payment between Cash and Online (EasyPaisa/SadaPay)

BEGIN;

-- ========================================
-- 1. ADD NEW COLUMNS FOR SPLIT PAYMENT
-- ========================================

-- Add columns to store split payment details
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS remaining_cash_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_online_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_online_method TEXT; -- 'easypaisa' or 'sadapay'

COMMENT ON COLUMN bookings.remaining_cash_amount IS 'Cash portion of remaining payment';
COMMENT ON COLUMN bookings.remaining_online_amount IS 'Online portion of remaining payment';
COMMENT ON COLUMN bookings.remaining_online_method IS 'Online payment method: easypaisa or sadapay';

-- ========================================
-- 2. MIGRATE EXISTING DATA
-- ========================================

-- Migrate existing remaining payments to new structure
UPDATE bookings
SET 
  remaining_cash_amount = CASE 
    WHEN remaining_payment_method = 'cash' THEN remaining_payment_amount
    ELSE 0
  END,
  remaining_online_amount = CASE
    WHEN remaining_payment_method IN ('easypaisa', 'sadapay') THEN remaining_payment_amount
    ELSE 0
  END,
  remaining_online_method = CASE
    WHEN remaining_payment_method IN ('easypaisa', 'sadapay') THEN remaining_payment_method
    ELSE NULL
  END
WHERE status = 'completed' 
  AND remaining_payment_amount > 0
  AND remaining_payment_method IS NOT NULL;

-- ========================================
-- 3. VERIFICATION QUERIES
-- ========================================

-- Check migrated data
SELECT 
  booking_number,
  status,
  remaining_payment_amount as old_total,
  remaining_payment_method as old_method,
  remaining_cash_amount as new_cash,
  remaining_online_amount as new_online,
  remaining_online_method as new_online_method,
  (remaining_cash_amount + remaining_online_amount) as new_total
FROM bookings
WHERE status = 'completed' 
  AND remaining_payment_amount > 0
ORDER BY created_at DESC
LIMIT 10;

-- Verify totals match
SELECT 
  COUNT(*) as total_bookings,
  SUM(CASE 
    WHEN (remaining_cash_amount + remaining_online_amount) = remaining_payment_amount 
    THEN 1 ELSE 0 
  END) as correct_totals,
  SUM(CASE 
    WHEN (remaining_cash_amount + remaining_online_amount) != remaining_payment_amount 
    THEN 1 ELSE 0 
  END) as incorrect_totals
FROM bookings
WHERE status = 'completed' 
  AND remaining_payment_amount > 0;

COMMIT;

-- ========================================
-- 4. TEST QUERIES
-- ========================================

-- Test split payment calculation
-- Example: Total remaining = 4500, Online = 2000, Cash should = 2500
SELECT 
  4500 as total_remaining,
  2000 as online_payment,
  (4500 - 2000) as auto_calculated_cash,
  'Should show: Cash = 2500' as expected_result;

-- ========================================
-- 5. REVENUE CALCULATION UPDATE
-- ========================================

-- View updated revenue with split payments
SELECT 
  'Cash Revenue' as type,
  SUM(
    COALESCE(advance_payment, 0) * CASE WHEN advance_payment_method = 'cash' THEN 1 ELSE 0 END +
    COALESCE(remaining_cash_amount, 0)
  ) as amount
FROM bookings
WHERE status IN ('completed', 'approved')
UNION ALL
SELECT 
  'EasyPaisa Revenue' as type,
  SUM(
    COALESCE(advance_payment, 0) * CASE WHEN advance_payment_method = 'easypaisa' THEN 1 ELSE 0 END +
    COALESCE(remaining_online_amount, 0) * CASE WHEN remaining_online_method = 'easypaisa' THEN 1 ELSE 0 END
  ) as amount
FROM bookings
WHERE status IN ('completed', 'approved')
UNION ALL
SELECT 
  'SadaPay Revenue' as type,
  SUM(
    COALESCE(advance_payment, 0) * CASE WHEN advance_payment_method = 'sadapay' THEN 1 ELSE 0 END +
    COALESCE(remaining_online_amount, 0) * CASE WHEN remaining_online_method = 'sadapay' THEN 1 ELSE 0 END
  ) as amount
FROM bookings
WHERE status IN ('completed', 'approved');

-- ========================================
-- NOTES
-- ========================================
-- After running this migration:
-- 1. Old bookings will have their payments migrated to new columns
-- 2. remaining_payment_method column kept for backward compatibility
-- 3. New bookings will use split payment system
-- 4. Total validation: remaining_cash_amount + remaining_online_amount = remaining_payment_amount
