-- ========================================
-- FIX NOTIFICATIONS TABLE CHECK CONSTRAINT
-- ========================================
-- Add missing notification types that are used by functions

-- Drop the old CHECK constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

-- Add new CHECK constraint with all notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'new_booking',
    'booking_approved',
    'booking_cancelled', 
    'payment_received',
    'payment_completed',
    'slot_conflict',
    'system'
  ));

-- Verify the constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'notifications_notification_type_check';
