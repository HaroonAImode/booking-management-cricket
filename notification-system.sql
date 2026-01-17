-- ========================================
-- ADMIN NOTIFICATION SYSTEM
-- ========================================
-- Description: SQL functions for admin notifications
-- Features:
-- - Get admin notifications with filtering
-- - Mark notifications as read
-- - Get unread count
-- - Auto-create notifications on events
-- ========================================

-- ========================================
-- 1. GET ADMIN NOTIFICATIONS
-- ========================================

CREATE OR REPLACE FUNCTION get_admin_notifications(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_is_read BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  notification_type TEXT,
  title TEXT,
  message TEXT,
  booking_id UUID,
  booking_number TEXT,
  customer_id UUID,
  customer_name TEXT,
  priority TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.notification_type,
    n.title,
    n.message,
    n.booking_id,
    b.booking_number,
    n.customer_id,
    c.name AS customer_name,
    n.priority,
    n.is_read,
    n.created_at,
    n.read_at
  FROM notifications n
  LEFT JOIN bookings b ON b.id = n.booking_id
  LEFT JOIN customers c ON c.id = n.customer_id
  WHERE (p_is_read IS NULL OR n.is_read = p_is_read)
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_admin_notifications(INTEGER, INTEGER, BOOLEAN) IS 'Returns admin notifications with optional filtering by read status';

-- ========================================
-- 2. GET UNREAD NOTIFICATION COUNT
-- ========================================

CREATE OR REPLACE FUNCTION get_unread_notifications_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE is_read = false
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_unread_notifications_count() IS 'Returns count of unread notifications';

-- ========================================
-- 3. MARK NOTIFICATION AS READ
-- ========================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS JSON AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE notifications
  SET 
    is_read = true,
    read_at = NOW()
  WHERE id = p_notification_id
    AND is_read = false
  RETURNING true INTO v_updated;

  IF v_updated IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Notification not found or already read'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Notification marked as read'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_notification_read(UUID) IS 'Marks a notification as read';

-- ========================================
-- 4. MARK ALL NOTIFICATIONS AS READ
-- ========================================

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS JSON AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET 
    is_read = true,
    read_at = NOW()
  WHERE is_read = false
  RETURNING COUNT(*) INTO v_count;

  RETURN json_build_object(
    'success', true,
    'count', COALESCE(v_count, 0),
    'message', 'All notifications marked as read'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_all_notifications_read() IS 'Marks all unread notifications as read';

-- ========================================
-- 5. TRIGGER: NEW BOOKING NOTIFICATION
-- ========================================

CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification for new bookings with pending status
  IF NEW.status = 'pending' AND TG_OP = 'INSERT' THEN
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
      'New booking request #' || NEW.booking_number || ' from customer. Requires approval.',
      NEW.id,
      NEW.customer_id,
      'high'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_new_booking() IS 'Trigger function to create notification on new booking';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_new_booking_notification ON bookings;

-- Create trigger for new bookings
CREATE TRIGGER trigger_new_booking_notification
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

COMMENT ON TRIGGER trigger_new_booking_notification ON bookings IS 'Creates admin notification when new booking is created';

-- ========================================
-- 6. GET NOTIFICATION SUMMARY
-- ========================================

CREATE OR REPLACE FUNCTION get_notification_summary()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'unread', COUNT(*) FILTER (WHERE is_read = false),
    'by_type', json_build_object(
      'new_booking', COUNT(*) FILTER (WHERE notification_type = 'new_booking' AND is_read = false),
      'booking_approved', COUNT(*) FILTER (WHERE notification_type = 'booking_approved' AND is_read = false),
      'payment_completed', COUNT(*) FILTER (WHERE notification_type = 'payment_completed' AND is_read = false),
      'booking_cancelled', COUNT(*) FILTER (WHERE notification_type = 'booking_cancelled' AND is_read = false)
    ),
    'by_priority', json_build_object(
      'high', COUNT(*) FILTER (WHERE priority = 'high' AND is_read = false),
      'medium', COUNT(*) FILTER (WHERE priority = 'medium' AND is_read = false),
      'low', COUNT(*) FILTER (WHERE priority = 'low' AND is_read = false)
    )
  ) INTO v_result
  FROM notifications;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_notification_summary() IS 'Returns notification statistics and counts';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Get all notifications
-- SELECT * FROM get_admin_notifications(50, 0, NULL);

-- Get unread notifications only
-- SELECT * FROM get_admin_notifications(50, 0, false);

-- Get unread count
-- SELECT get_unread_notifications_count();

-- Mark notification as read
-- SELECT mark_notification_read('NOTIFICATION_ID'::UUID);

-- Mark all as read
-- SELECT mark_all_notifications_read();

-- Get notification summary
-- SELECT get_notification_summary();

-- ========================================
-- SETUP COMPLETE
-- ========================================
