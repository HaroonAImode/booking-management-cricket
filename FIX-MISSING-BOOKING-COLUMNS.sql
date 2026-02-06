-- ========================================
-- FIX: Add Missing Columns to Bookings Table
-- ========================================
-- ISSUE: Database error - columns don't exist:
-- - completed_at
-- - completed_by
-- 
-- Other columns that should exist (from previous migrations):
-- - remaining_payment_amount (from comprehensive-updates.sql)
-- - discount_amount (from implement-discount-tracking.sql)
-- - remaining_cash_amount (from split-payment-system.sql)
-- - remaining_online_amount (from split-payment-system.sql)
-- - remaining_online_method (from split-payment-system.sql)
-- ========================================

-- Add completion tracking columns
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN bookings.completed_at IS 'Timestamp when booking was marked as completed';
COMMENT ON COLUMN bookings.completed_by IS 'Admin user who completed the booking';

-- Verify columns that should already exist (from previous migrations)
-- If these don't exist, you need to run the respective SQL files first:

-- From comprehensive-updates.sql:
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS remaining_payment_amount NUMERIC(10, 2) DEFAULT 0;

-- From implement-discount-tracking.sql:
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL;

-- From split-payment-system.sql:
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS remaining_cash_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_online_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_online_method TEXT;

-- Add comments for new columns
COMMENT ON COLUMN bookings.remaining_payment_amount IS 'Actual amount paid for remaining payment (may be less than calculated remaining_payment due to discounts)';
COMMENT ON COLUMN bookings.discount_amount IS 'Total discount given on this booking (not counted in revenue)';
COMMENT ON COLUMN bookings.remaining_cash_amount IS 'Cash portion of remaining payment';
COMMENT ON COLUMN bookings.remaining_online_amount IS 'Online portion of remaining payment';
COMMENT ON COLUMN bookings.remaining_online_method IS 'Online payment method: easypaisa or sadapay';

-- Add constraints for data integrity
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_discount;
ALTER TABLE bookings ADD CONSTRAINT valid_discount CHECK (
  discount_amount >= 0 AND
  discount_amount <= total_amount
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_completed_at ON bookings(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_completed_by ON bookings(completed_by) WHERE completed_by IS NOT NULL;

-- ========================================
-- VERIFICATION
-- ========================================

-- Check all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN (
    'completed_at',
    'completed_by',
    'remaining_payment_amount',
    'discount_amount',
    'remaining_cash_amount',
    'remaining_online_amount',
    'remaining_online_method'
  )
ORDER BY column_name;

-- Expected output: 7 rows showing all columns exist

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MISSING BOOKING COLUMNS ADDED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Columns Added/Verified:';
  RAISE NOTICE '  ✓ completed_at (timestamp)';
  RAISE NOTICE '  ✓ completed_by (admin reference)';
  RAISE NOTICE '  ✓ remaining_payment_amount (numeric)';
  RAISE NOTICE '  ✓ discount_amount (numeric)';
  RAISE NOTICE '  ✓ remaining_cash_amount (numeric)';
  RAISE NOTICE '  ✓ remaining_online_amount (numeric)';
  RAISE NOTICE '  ✓ remaining_online_method (text)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Run FIX-PAYMENT-DISCOUNT-VALIDATION.sql to update payment function';
  RAISE NOTICE '========================================';
END $$;
