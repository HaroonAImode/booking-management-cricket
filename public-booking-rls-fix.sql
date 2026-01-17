-- ========================================
-- PUBLIC BOOKING RLS FIX
-- ========================================
-- Fix RLS policies to allow public bookings to work properly
-- Issue: Triggers need elevated privileges to insert notifications and update customers

-- ========================================
-- SOLUTION 1: Add SECURITY DEFINER to trigger functions
-- This allows triggers to bypass RLS when executing
-- ========================================

-- Fix: Update customer statistics trigger
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER 
SECURITY DEFINER -- Execute with elevated privileges
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE customers
    SET 
      total_bookings = (
        SELECT COUNT(*) 
        FROM bookings 
        WHERE customer_id = NEW.customer_id 
        AND status IN ('approved', 'completed')
      ),
      total_spent = (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM bookings
        WHERE customer_id = NEW.customer_id
        AND status IN ('approved', 'completed')
        AND is_fully_paid = true
      )
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix: Create notification on new booking trigger
CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER
SECURITY DEFINER -- Execute with elevated privileges
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (
      notification_type,
      title,
      message,
      booking_id,
      customer_id,
      priority
    ) VALUES (
      'new_booking',
      'New Booking Request',
      'New booking request #' || NEW.booking_number || ' received from customer.',
      NEW.id,
      NEW.customer_id,
      'high'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SOLUTION 2: Alternative - Add specific RLS policies
-- (Use this if SECURITY DEFINER doesn't work)
-- ========================================

-- Allow public to update customer stats (for trigger)
-- DROP POLICY IF EXISTS "Public can update customer stats" ON customers;
-- CREATE POLICY "Public can update customer stats"
--   ON customers FOR UPDATE
--   TO public
--   USING (true)
--   WITH CHECK (true);

-- Allow public to insert notifications (for trigger)
-- DROP POLICY IF EXISTS "Public can insert notifications" ON notifications;
-- CREATE POLICY "Public can insert notifications"
--   ON notifications FOR INSERT
--   TO public
--   WITH CHECK (true);

-- ========================================
-- VERIFICATION
-- ========================================

-- Check that functions now have SECURITY DEFINER
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_customer_stats', 'create_booking_notification')
ORDER BY routine_name;

-- Test output should show:
-- update_customer_stats | FUNCTION | DEFINER
-- create_booking_notification | FUNCTION | DEFINER
