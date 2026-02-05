-- ========================================
-- DATABASE STATE VERIFICATION QUERIES
-- ========================================
-- Run these queries to check what currently exists in your database
-- This will help us understand what needs to be fixed
-- ========================================

-- ========================================
-- 1. CHECK EXISTING FUNCTIONS
-- ========================================

-- List all custom functions related to slots and bookings
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'get_available_slots',
    'cleanup_expired_pending_bookings',
    'check_and_lock_slots',
    'calculate_booking_amount',
    'generate_booking_number',
    'update_slot_status'
)
ORDER BY p.proname;

-- ========================================
-- 2. CHECK CURRENT SLOT STATUS LOGIC
-- ========================================

-- Check if get_available_slots function exists and get its definition
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'get_available_slots';

-- ========================================
-- 3. CHECK EXISTING VIEWS
-- ========================================

-- Check if slot status view exists
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND viewname LIKE '%slot%';

-- ========================================
-- 4. CHECK CURRENT BOOKINGS STATUS
-- ========================================

-- Get summary of booking statuses
SELECT 
    status,
    COUNT(*) AS count,
    COUNT(CASE WHEN pending_expires_at < NOW() THEN 1 END) AS expired_pending_count
FROM bookings
GROUP BY status
ORDER BY status;

-- ========================================
-- 5. CHECK EXPIRED PENDING BOOKINGS
-- ========================================

-- Find all expired pending bookings that should be cleaned up
SELECT 
    b.id,
    b.booking_number,
    b.status,
    b.booking_date,
    b.pending_expires_at,
    EXTRACT(EPOCH FROM (NOW() - b.pending_expires_at))/3600 AS hours_expired,
    c.name AS customer_name,
    c.phone AS customer_phone,
    COUNT(bs.id) AS slot_count
FROM bookings b
LEFT JOIN customers c ON c.id = b.customer_id
LEFT JOIN booking_slots bs ON bs.booking_id = b.id
WHERE b.status = 'pending'
AND b.pending_expires_at < NOW()
GROUP BY b.id, b.booking_number, b.status, b.booking_date, b.pending_expires_at, c.name, c.phone
ORDER BY b.pending_expires_at;

-- ========================================
-- 6. CHECK SLOT STATUS ACCURACY
-- ========================================

-- Check booking_slots table for inconsistent statuses
SELECT 
    bs.slot_date,
    bs.slot_hour,
    bs.status AS slot_status,
    b.status AS booking_status,
    b.booking_number,
    b.pending_expires_at,
    CASE 
        WHEN b.status = 'cancelled' THEN 'Should be available'
        WHEN b.status = 'pending' AND b.pending_expires_at < NOW() THEN 'Should be available (expired)'
        WHEN b.status IN ('approved', 'completed') AND bs.status != 'booked' THEN 'Should be booked'
        WHEN b.status = 'pending' AND bs.status != 'pending' THEN 'Should be pending'
        ELSE 'OK'
    END AS status_check
FROM booking_slots bs
JOIN bookings b ON b.id = bs.booking_id
WHERE bs.slot_date >= CURRENT_DATE - INTERVAL '7 days'
AND (
    (b.status = 'cancelled')
    OR (b.status = 'pending' AND b.pending_expires_at < NOW())
    OR (b.status IN ('approved', 'completed') AND bs.status != 'booked')
    OR (b.status = 'pending' AND bs.status != 'pending')
)
ORDER BY bs.slot_date, bs.slot_hour;

-- ========================================
-- 7. CHECK SETTINGS TABLE
-- ========================================

-- Verify rate settings exist
SELECT 
    setting_key,
    setting_value,
    description
FROM settings
WHERE setting_key IN (
    'day_rate_per_hour',
    'night_rate_per_hour',
    'night_start_time',
    'night_end_time'
);

-- ========================================
-- 8. TEST CURRENT get_available_slots (if exists)
-- ========================================

-- Test for today (if function exists)
-- SELECT * FROM get_available_slots(CURRENT_DATE) LIMIT 24;

-- ========================================
-- 9. CHECK FOR DUPLICATE SLOTS
-- ========================================

-- Find any duplicate slot bookings (should not exist)
SELECT 
    slot_date,
    slot_hour,
    COUNT(*) AS booking_count,
    STRING_AGG(booking_id::text, ', ') AS booking_ids
FROM booking_slots
WHERE status IN ('pending', 'booked')
AND slot_date >= CURRENT_DATE
GROUP BY slot_date, slot_hour
HAVING COUNT(*) > 1;

-- ========================================
-- 10. CHECK ROW LEVEL SECURITY POLICIES
-- ========================================

-- Check RLS policies on booking_slots
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('bookings', 'booking_slots', 'customers')
ORDER BY tablename, policyname;

-- ========================================
-- 11. CHECK RECENT BOOKINGS ACTIVITY
-- ========================================

-- Get recent bookings with slot details
SELECT 
    b.booking_number,
    b.status AS booking_status,
    b.booking_date,
    b.created_at,
    b.pending_expires_at,
    c.name AS customer_name,
    COUNT(bs.id) AS total_slots,
    STRING_AGG(bs.slot_hour::text, ', ' ORDER BY bs.slot_hour) AS booked_hours,
    STRING_AGG(DISTINCT bs.status, ', ') AS slot_statuses
FROM bookings b
LEFT JOIN customers c ON c.id = b.customer_id
LEFT JOIN booking_slots bs ON bs.booking_id = b.id
WHERE b.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY b.id, b.booking_number, b.status, b.booking_date, b.created_at, b.pending_expires_at, c.name
ORDER BY b.created_at DESC
LIMIT 20;

-- ========================================
-- 12. CHECK GRANTS AND PERMISSIONS
-- ========================================

-- Check function permissions
SELECT 
    routine_schema,
    routine_name,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name LIKE '%slot%' OR routine_name LIKE '%booking%'
ORDER BY routine_name, privilege_type;

-- ========================================
-- SUMMARY REPORT
-- ========================================

-- Quick health check
SELECT 
    'Total Bookings' AS metric,
    COUNT(*)::text AS value
FROM bookings
UNION ALL
SELECT 
    'Pending Bookings',
    COUNT(*)::text
FROM bookings
WHERE status = 'pending'
UNION ALL
SELECT 
    'Expired Pending',
    COUNT(*)::text
FROM bookings
WHERE status = 'pending' AND pending_expires_at < NOW()
UNION ALL
SELECT 
    'Approved Bookings',
    COUNT(*)::text
FROM bookings
WHERE status = 'approved'
UNION ALL
SELECT 
    'Total Slots',
    COUNT(*)::text
FROM booking_slots
UNION ALL
SELECT 
    'Slots Today',
    COUNT(*)::text
FROM booking_slots
WHERE slot_date = CURRENT_DATE
UNION ALL
SELECT 
    'Functions Exist',
    COUNT(*)::text
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_available_slots', 'cleanup_expired_pending_bookings', 'check_and_lock_slots');

-- ========================================
-- END OF VERIFICATION QUERIES
-- ========================================

-- INSTRUCTIONS:
-- 1. Run these queries one by one or all together
-- 2. Check the output to see what exists and what doesn't
-- 3. Look for any expired pending bookings
-- 4. Check if functions exist (should show in query #1)
-- 5. Share the results so we can determine next steps
