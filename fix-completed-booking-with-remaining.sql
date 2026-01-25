-- ========================================
-- FIX COMPLETED BOOKINGS WITH REMAINING PAYMENT
-- ========================================
-- Purpose: Fix bookings marked as completed but still have remaining payment
-- Date: January 25, 2026
-- Issue: BK-20260124-001 is completed but has Rs 1.00 remaining
-- ========================================

-- OPTION 1: Mark the Rs 1 as paid (waived/forgiven)
-- Use this if you want to consider it fully paid and close it out
UPDATE bookings
SET 
  remaining_payment_amount = COALESCE(remaining_payment_amount, 0) + remaining_payment,
  remaining_payment = 0,
  updated_at = NOW()
WHERE 
  status = 'completed' 
  AND remaining_payment > 0
  AND id = '5ecf61fc-dbdf-400a-b95a-511c5e90b0a3';  -- BK-20260124-001

-- OPTION 2: Revert to approved status (customer still owes Rs 1)
-- Use this if they should actually pay the remaining Rs 1
-- UPDATE bookings
-- SET 
--   status = 'approved',
--   updated_at = NOW()
-- WHERE 
--   status = 'completed' 
--   AND remaining_payment > 0
--   AND id = '5ecf61fc-dbdf-400a-b95a-511c5e90b0a3';  -- BK-20260124-001

-- Verify the fix
SELECT 
  booking_number,
  total_amount,
  advance_payment,
  remaining_payment_amount,
  remaining_payment,
  status,
  (advance_payment + COALESCE(remaining_payment_amount, 0)) as total_paid,
  (total_amount - advance_payment - COALESCE(remaining_payment_amount, 0)) as balance
FROM bookings
WHERE id = '5ecf61fc-dbdf-400a-b95a-511c5e90b0a3';

-- Check for other bookings with the same issue
SELECT 
  id,
  booking_number,
  booking_date,
  total_amount,
  advance_payment,
  remaining_payment,
  status
FROM bookings
WHERE 
  status = 'completed' 
  AND remaining_payment > 0
ORDER BY booking_date DESC;

-- ========================================
-- INSTRUCTIONS:
-- ========================================
-- 1. Choose OPTION 1 (waive the Rs 1) OR OPTION 2 (mark as approved)
-- 2. Run the chosen UPDATE query
-- 3. Run the verify query to confirm the fix
-- 4. Run the check query to find other similar issues
-- ========================================
