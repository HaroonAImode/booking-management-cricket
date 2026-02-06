-- ========================================
-- COMPLETE BOOKING WORKFLOW TEST
-- ========================================
-- This tests the entire booking system from creation to completion

-- ========================================
-- STEP 1: Create a New Booking (Simulate Customer)
-- ========================================
SELECT '=== STEP 1: CREATE NEW BOOKING ===' as step;

-- Create a test booking
SELECT * FROM public.create_booking_with_slots(
  'Test Workflow Customer',              -- p_customer_name
  '2026-02-15',                          -- p_booking_date (future date)
  3,                                      -- p_total_hours
  3000.00,                               -- p_total_amount
  1000.00,                               -- p_advance_payment
  'easypaisa',                           -- p_advance_payment_method
  'test_proof.jpg',                      -- p_advance_payment_proof
  '[
    {"slot_hour": 14, "slot_time": "2:00 PM", "is_night_rate": false, "hourly_rate": 1000},
    {"slot_hour": 15, "slot_time": "3:00 PM", "is_night_rate": false, "hourly_rate": 1000},
    {"slot_hour": 16, "slot_time": "4:00 PM", "is_night_rate": false, "hourly_rate": 1000}
  ]'::jsonb,                             -- p_slots
  '0300-9999999',                        -- p_customer_phone
  'Test booking for workflow'            -- p_customer_notes
);

-- Get the booking number (save this for next steps)
SELECT 
  '=== NEW BOOKING CREATED ===' as result,
  booking_number,
  booking_date,
  total_amount,
  advance_payment,
  remaining_payment,
  status
FROM bookings
WHERE booking_date = '2026-02-15'
  AND customer_id IN (
    SELECT id FROM customers WHERE phone = '0300-9999999'
  )
ORDER BY created_at DESC
LIMIT 1;

-- Save the booking_id for next steps
DO $$
DECLARE
  v_booking_id UUID;
BEGIN
  SELECT id INTO v_booking_id
  FROM bookings
  WHERE booking_date = '2026-02-15'
    AND customer_id IN (
      SELECT id FROM customers WHERE phone = '0300-9999999'
    )
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Store in temp variable for session
  RAISE NOTICE 'Booking ID: %', v_booking_id;
END $$;

-- ========================================
-- STEP 2: View Booking Details (Before Approval)
-- ========================================
SELECT '=== STEP 2: BOOKING BEFORE APPROVAL ===' as step;

SELECT 
  b.booking_number,
  b.booking_date,
  c.name as customer_name,
  c.phone as customer_phone,
  b.total_hours,
  b.total_amount,
  b.advance_payment,
  b.advance_payment_method,
  b.remaining_payment,
  b.status,
  b.customer_notes,
  -- Slots info
  (
    SELECT string_agg(slot_time::text || ' (' || slot_hour || 'h)', ', ' ORDER BY slot_hour)
    FROM booking_slots
    WHERE booking_id = b.id
  ) as booked_slots
FROM bookings b
JOIN customers c ON b.customer_id = c.id
WHERE b.booking_date = '2026-02-15'
  AND c.phone = '0300-9999999'
ORDER BY b.created_at DESC
LIMIT 1;

-- ========================================
-- STEP 3: Admin Approves Booking
-- ========================================
SELECT '=== STEP 3: APPROVE BOOKING ===' as step;

-- Approve the booking (using NULL for admin in test environment)
DO $$
DECLARE
  v_booking_id UUID;
  v_admin_id UUID := NULL;  -- Use NULL for test
BEGIN
  -- Get booking ID
  SELECT id INTO v_booking_id
  FROM bookings
  WHERE booking_date = '2026-02-15'
    AND customer_id IN (SELECT id FROM customers WHERE phone = '0300-9999999')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Try to get first admin user from auth.users (via user_roles)
  SELECT ur.user_id INTO v_admin_id
  FROM user_roles ur
  WHERE ur.role = 'admin'
    AND EXISTS (SELECT 1 FROM auth.users WHERE id = ur.user_id)
  LIMIT 1;
  
  -- Approve the booking (approved_by can be NULL)
  UPDATE bookings
  SET 
    status = 'approved',
    approved_by = v_admin_id,  -- NULL is allowed
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = v_booking_id;
  
  -- Note: Slots keep their original status ('pending' or 'booked')
  -- Slot status is managed separately by the booking system
  
  RAISE NOTICE 'Booking approved with ID: % by admin: %', v_booking_id, COALESCE(v_admin_id::text, 'NULL (test mode)');
END $$;

-- View booking after approval
SELECT 
  '=== BOOKING AFTER APPROVAL ===' as result,
  booking_number,
  status,
  approved_at,
  total_amount,
  advance_payment,
  remaining_payment
FROM bookings
WHERE booking_date = '2026-02-15'
  AND customer_id IN (SELECT id FROM customers WHERE phone = '0300-9999999')
ORDER BY created_at DESC
LIMIT 1;

-- ========================================
-- STEP 4: Complete Remaining Payment with Extra Charges & Discount
-- ========================================
SELECT '=== STEP 4: COMPLETE PAYMENT WITH EXTRAS ===' as step;

-- Scenario:
-- - Remaining payment: Rs 2,000
-- - Extra charge: Food & Drinks Rs 500
-- - Discount applied: Rs 200
-- - Final payable: 2,000 + 500 - 200 = Rs 2,300
-- - Payment split: Rs 1,000 Cash + Rs 1,300 Easypaisa

DO $$
DECLARE
  v_booking_id UUID;
  v_result JSON;
BEGIN
  -- Get booking ID
  SELECT id INTO v_booking_id
  FROM bookings
  WHERE booking_date = '2026-02-15'
    AND customer_id IN (SELECT id FROM customers WHERE phone = '0300-9999999')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Complete payment with extra charges, discount, and split payment
  SELECT public.verify_remaining_payment_with_extra_charges(
    'Payment completed with food charges and discount',  -- p_admin_notes
    v_booking_id,                                        -- p_booking_id
    '[{"category": "Food & Drinks", "amount": 500}]'::jsonb,  -- p_extra_charges
    2300.00,                                             -- p_payment_amount (2000 + 500 - 200)
    'Split Payment',                                     -- p_payment_method
    'payment_proof_final.jpg',                          -- p_payment_proof_path
    NULL,                                                -- p_created_by
    200.00,                                              -- p_discount_amount
    1000.00,                                             -- p_cash_amount
    1300.00,                                             -- p_online_amount
    'easypaisa'                                          -- p_online_method
  ) INTO v_result;
  
  RAISE NOTICE 'Payment result: %', v_result;
END $$;

-- ========================================
-- STEP 5: Verify Final Booking State
-- ========================================
SELECT '=== STEP 5: FINAL BOOKING STATE ===' as step;

SELECT 
  b.booking_number,
  b.booking_date,
  c.name as customer_name,
  c.phone as customer_phone,
  -- Payment breakdown
  b.advance_payment as advance_paid,
  b.advance_payment_method as advance_method,
  b.remaining_payment_amount as remaining_paid,
  b.remaining_cash_amount as remaining_cash,
  b.remaining_online_amount as remaining_online,
  b.remaining_online_method as remaining_method,
  -- Totals
  b.total_amount as final_total_amount,
  b.discount_amount as total_discount,
  b.advance_payment + COALESCE(b.remaining_payment_amount, 0) as total_received,
  -- Extra charges
  b.extra_charges,
  -- Status
  b.status,
  b.admin_notes
FROM bookings b
JOIN customers c ON b.customer_id = c.id
WHERE b.booking_date = '2026-02-15'
  AND c.phone = '0300-9999999'
ORDER BY b.created_at DESC
LIMIT 1;

-- ========================================
-- STEP 6: Verify Calculations Are Correct
-- ========================================
SELECT '=== STEP 6: VERIFY CALCULATIONS ===' as step;

SELECT 
  booking_number,
  -- Original amounts
  3000.00 as original_booking_amount,
  1000.00 as advance_payment,
  2000.00 as original_remaining,
  -- Extra charges
  500.00 as extra_charges_added,
  200.00 as discount_applied,
  -- Expected calculation
  2000.00 + 500.00 - 200.00 as expected_final_payment,
  -- Actual in database
  remaining_payment_amount as actual_final_payment,
  -- Split payment
  remaining_cash_amount as cash_paid,
  remaining_online_amount as online_paid,
  remaining_cash_amount + remaining_online_amount as split_total,
  -- Validation
  CASE 
    WHEN remaining_payment_amount = 2300.00 
     AND remaining_cash_amount = 1000.00 
     AND remaining_online_amount = 1300.00
     AND total_amount = 3300.00  -- 3000 + 500 - 200
     AND discount_amount = 200.00
    THEN '✅ ALL CORRECT'
    ELSE '❌ MISMATCH'
  END as validation
FROM bookings
WHERE booking_date = '2026-02-15'
  AND customer_id IN (SELECT id FROM customers WHERE phone = '0300-9999999')
ORDER BY created_at DESC
LIMIT 1;

-- ========================================
-- STEP 7: Check Dashboard Revenue Includes This Booking
-- ========================================
SELECT '=== STEP 7: DASHBOARD REVENUE CHECK ===' as step;

-- Get dashboard totals
SELECT 
  'Dashboard' as source,
  (get_dashboard_data()->'revenue'->>'total_revenue')::numeric as total_revenue,
  (get_dashboard_data()->'revenue'->>'cash_total')::numeric as cash_total,
  (get_dashboard_data()->'revenue'->>'easypaisa_total')::numeric as easypaisa_total,
  (get_dashboard_data()->'revenue'->>'sadapay_total')::numeric as sadapay_total;

-- Calculate what dashboard SHOULD show (including our test booking)
SELECT 
  'Expected (includes test)' as source,
  SUM(advance_payment + COALESCE(remaining_payment_amount, 0)) as total_revenue,
  SUM(
    CASE WHEN advance_payment_method = 'cash' THEN advance_payment ELSE 0 END +
    COALESCE(remaining_cash_amount, 0)
  ) as cash_total,
  SUM(
    CASE WHEN advance_payment_method = 'easypaisa' THEN advance_payment ELSE 0 END +
    CASE WHEN remaining_online_method = 'easypaisa' THEN remaining_online_amount ELSE 0 END
  ) as easypaisa_total,
  SUM(
    CASE WHEN advance_payment_method = 'sadapay' THEN advance_payment ELSE 0 END +
    CASE WHEN remaining_online_method = 'sadapay' THEN remaining_online_amount ELSE 0 END
  ) as sadapay_total
FROM bookings
WHERE status IN ('approved', 'completed');

-- ========================================
-- STEP 8: Cleanup Test Data (Optional)
-- ========================================
SELECT '=== STEP 8: CLEANUP (OPTIONAL) ===' as step;

-- Run this to remove test booking:
/*
DELETE FROM booking_slots 
WHERE booking_id IN (
  SELECT b.id FROM bookings b
  JOIN customers c ON b.customer_id = c.id
  WHERE b.booking_date = '2026-02-15' AND c.phone = '0300-9999999'
);

DELETE FROM bookings 
WHERE id IN (
  SELECT b.id FROM bookings b
  JOIN customers c ON b.customer_id = c.id
  WHERE b.booking_date = '2026-02-15' AND c.phone = '0300-9999999'
);

DELETE FROM customers WHERE phone = '0300-9999999';

SELECT 'Test data cleaned up' as status;
*/

-- ========================================
-- WORKFLOW TEST COMPLETE
-- ========================================
SELECT '=== ✅ WORKFLOW TEST COMPLETE ===' as final_result;
SELECT 'All steps executed successfully!' as message;
SELECT 'Review the outputs above to verify everything works correctly' as instruction;
