-- ========================================
-- FIX BOOKING_SLOTS STATUS CONSTRAINT
-- ========================================
-- Issue: booking_slots status constraint missing 'completed' value
-- Error: new row violates check constraint "booking_slots_status_check"
-- Solution: Add 'completed' to allowed status values
-- Date: January 17, 2026
-- ========================================

-- Step 1: Drop the existing check constraint
ALTER TABLE booking_slots 
DROP CONSTRAINT IF EXISTS booking_slots_status_check;

-- Step 2: Add new check constraint with 'completed' status included
ALTER TABLE booking_slots 
ADD CONSTRAINT booking_slots_status_check 
CHECK (status IN ('available', 'pending', 'booked', 'completed', 'cancelled'));

-- Step 3: Verify the constraint was updated successfully
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'booking_slots'::regclass
  AND conname = 'booking_slots_status_check';

-- Step 4: Show current status distribution in booking_slots
SELECT 
  status,
  COUNT(*) as count
FROM booking_slots
GROUP BY status
ORDER BY status;

-- ========================================
-- VERIFICATION COMPLETE
-- ========================================
-- Expected result: Constraint now allows: 
--   'available', 'pending', 'booked', 'completed', 'cancelled'
-- ========================================
