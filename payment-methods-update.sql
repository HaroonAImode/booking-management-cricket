-- ========================================
-- PAYMENT METHODS UPDATE
-- ========================================
-- Description: Update payment methods to only Easypaisa, SadaPay, and Cash
-- Date: January 2026
-- 
-- Changes:
-- - Remove: JazzCash, Bank Transfer, Online Transfer, Bank Deposit
-- - Keep: Easypaisa, SadaPay, Cash
-- - Add payment account settings to system_settings
-- ========================================

-- ========================================
-- 1. ADD PAYMENT ACCOUNT SETTINGS
-- ========================================

-- Insert payment account details into system_settings
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('payment_accounts', 
   '{
     "easypaisa": {
       "account_number": "03001234567",
       "account_name": "Cricket Ground Bookings",
       "active": true
     },
     "sadapay": {
       "account_number": "03007654321",
       "account_name": "Cricket Ground Bookings",
       "active": true
     },
     "cash": {
       "active": true,
       "note": "Cash collected at venue"
     }
   }'::JSONB,
   'Payment method account details for bookings'
  )
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- ========================================
-- 2. UPDATE EXISTING PAYMENT METHODS
-- ========================================

-- Standardize existing payment method values
-- Map old values to new standardized values

UPDATE bookings
SET advance_payment_method = CASE
  WHEN LOWER(advance_payment_method) IN ('jazzcash', 'jazz cash') THEN 'easypaisa'
  WHEN LOWER(advance_payment_method) IN ('bank', 'bank transfer', 'bank deposit', 'online', 'online transfer') THEN 'sadapay'
  WHEN LOWER(advance_payment_method) IN ('easypaisa', 'easy paisa') THEN 'easypaisa'
  WHEN LOWER(advance_payment_method) = 'sadapay' THEN 'sadapay'
  WHEN LOWER(advance_payment_method) = 'cash' THEN 'cash'
  ELSE 'cash' -- Default to cash for any other values
END
WHERE advance_payment_method IS NOT NULL;

UPDATE bookings
SET remaining_payment_method = CASE
  WHEN LOWER(remaining_payment_method) IN ('jazzcash', 'jazz cash') THEN 'easypaisa'
  WHEN LOWER(remaining_payment_method) IN ('bank', 'bank transfer', 'bank_transfer', 'bank deposit', 'online', 'upi', 'card', 'cheque') THEN 'sadapay'
  WHEN LOWER(remaining_payment_method) IN ('easypaisa', 'easy paisa') THEN 'easypaisa'
  WHEN LOWER(remaining_payment_method) = 'sadapay' THEN 'sadapay'
  WHEN LOWER(remaining_payment_method) = 'cash' THEN 'cash'
  ELSE 'cash' -- Default to cash for any other values
END
WHERE remaining_payment_method IS NOT NULL;

-- ========================================
-- 3. ADD CHECK CONSTRAINTS (OPTIONAL)
-- ========================================

-- Add check constraint to ensure only valid payment methods
-- Note: This will prevent invalid values in future inserts

ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS bookings_advance_payment_method_check;

ALTER TABLE bookings 
ADD CONSTRAINT bookings_advance_payment_method_check 
CHECK (advance_payment_method IN ('easypaisa', 'sadapay', 'cash') OR advance_payment_method IS NULL);

ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS bookings_remaining_payment_method_check;

ALTER TABLE bookings 
ADD CONSTRAINT bookings_remaining_payment_method_check 
CHECK (remaining_payment_method IN ('easypaisa', 'sadapay', 'cash') OR remaining_payment_method IS NULL);

-- ========================================
-- 4. CREATE HELPER FUNCTION
-- ========================================

-- Function to get payment account details
CREATE OR REPLACE FUNCTION get_payment_accounts()
RETURNS JSONB AS $$
DECLARE
  v_accounts JSONB;
BEGIN
  SELECT setting_value INTO v_accounts
  FROM system_settings
  WHERE setting_key = 'payment_accounts';
  
  RETURN COALESCE(v_accounts, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_payment_accounts() IS 'Returns payment account details for all active payment methods';

-- ========================================
-- 5. UPDATE PAYMENT ACCOUNT SETTINGS
-- ========================================

-- Function to update payment account details
CREATE OR REPLACE FUNCTION update_payment_account(
  p_method TEXT, -- 'easypaisa' or 'sadapay'
  p_account_number TEXT,
  p_account_name TEXT,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_accounts JSONB;
  v_updated JSONB;
BEGIN
  -- Validate payment method
  IF p_method NOT IN ('easypaisa', 'sadapay') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid payment method. Must be easypaisa or sadapay'
    );
  END IF;

  -- Get current accounts
  SELECT setting_value INTO v_accounts
  FROM system_settings
  WHERE setting_key = 'payment_accounts';

  -- Update the specific account
  v_updated := jsonb_set(
    v_accounts,
    ARRAY[p_method],
    json_build_object(
      'account_number', p_account_number,
      'account_name', p_account_name,
      'active', true
    )::JSONB
  );

  -- Save updated settings
  UPDATE system_settings
  SET 
    setting_value = v_updated,
    updated_by = p_updated_by,
    updated_at = NOW()
  WHERE setting_key = 'payment_accounts';

  RETURN json_build_object(
    'success', true,
    'message', 'Payment account updated successfully',
    'method', p_method,
    'account_number', p_account_number
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_payment_account(TEXT, TEXT, TEXT, UUID) IS 'Updates payment account details for a specific payment method';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- View payment account settings
-- SELECT get_payment_accounts();

-- View current payment methods in use
-- SELECT 
--   advance_payment_method,
--   COUNT(*) as count
-- FROM bookings
-- WHERE advance_payment_method IS NOT NULL
-- GROUP BY advance_payment_method
-- ORDER BY count DESC;

-- Check for any invalid payment methods
-- SELECT 
--   id,
--   booking_number,
--   advance_payment_method,
--   remaining_payment_method
-- FROM bookings
-- WHERE 
--   (advance_payment_method NOT IN ('easypaisa', 'sadapay', 'cash') AND advance_payment_method IS NOT NULL)
--   OR (remaining_payment_method NOT IN ('easypaisa', 'sadapay', 'cash') AND remaining_payment_method IS NOT NULL);

-- Update specific payment account (example)
-- SELECT update_payment_account('easypaisa', '03001234567', 'Cricket Ground Bookings', NULL);
-- SELECT update_payment_account('sadapay', '03007654321', 'Cricket Ground Bookings', NULL);

-- ========================================
-- ROLLBACK SCRIPT (if needed)
-- ========================================

-- To rollback payment account settings:
-- DELETE FROM system_settings WHERE setting_key = 'payment_accounts';

-- To remove check constraints:
-- ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_advance_payment_method_check;
-- ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_remaining_payment_method_check;

-- ========================================
-- SETUP COMPLETE
-- ========================================
-- 
-- Summary of Changes:
-- ✅ Added payment_accounts to system_settings
-- ✅ Standardized existing payment method values
-- ✅ Added check constraints for valid payment methods
-- ✅ Created helper functions to get/update payment accounts
--
-- Note: Update account numbers in the payment_accounts setting
-- before deploying to production!
-- ========================================
