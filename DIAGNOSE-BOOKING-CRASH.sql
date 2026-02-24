-- ========================================
-- DIAGNOSE BOOKING CRASH - ERR_CONNECTION_CLOSED
-- ========================================
-- Run these queries one by one and share the output
-- ========================================

-- 1. CHECK IF create_booking_with_slots FUNCTION EXISTS
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_booking_with_slots';

-- ========================================
-- 2. CHECK BOOKINGS TABLE STRUCTURE
-- ========================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY ordinal_position;

-- ========================================
-- 3. CHECK BOOKING_SLOTS TABLE STRUCTURE
-- ========================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'booking_slots'
ORDER BY ordinal_position;

-- ========================================
-- 4. CHECK FOR EXISTING SLOTS ON FEB 19-20
-- ========================================
SELECT 
  slot_date,
  slot_hour,
  status,
  booking_id,
  created_at
FROM booking_slots
WHERE slot_date IN ('2026-02-19', '2026-02-20')
  AND slot_hour IN (23, 0, 1)
ORDER BY slot_date, slot_hour;

-- ========================================
-- 5. CHECK TABLE CONSTRAINTS
-- ========================================
SELECT
  tc.constraint_name,
  tc.constraint_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('bookings', 'booking_slots')
ORDER BY tc.table_name, tc.constraint_type;

-- ========================================
-- 6. CHECK IF THERE ARE TRIGGERS ON THESE TABLES
-- ========================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('bookings', 'booking_slots')
ORDER BY event_object_table, trigger_name;

-- ========================================
-- 7. TEST IF FUNCTION CAN BE CALLED (DRY RUN - READ ONLY)
-- ========================================
-- This won't actually create a booking, just checks if function is callable
SELECT 
  'Function callable status' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'create_booking_with_slots'
    ) THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as status;

-- ========================================
-- 8. CHECK FOR RECENT ERROR LOGS (if pg_stat_statements is enabled)
-- ========================================
-- This might not work if extension is not enabled
SELECT 
  'Checking for error tracking' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')
    THEN '✅ pg_stat_statements enabled'
    ELSE '⚠️ pg_stat_statements not enabled - cannot see query stats'
  END as status;

-- ========================================
-- 9. CHECK CURRENT SYSTEM_SETTINGS VALUES
-- ========================================
SELECT 
  setting_key,
  setting_value,
  updated_at
FROM system_settings
ORDER BY setting_key;

-- ========================================
-- 10. VERIFY RLS POLICIES ON TABLES
-- ========================================
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
WHERE schemaname = 'public'
  AND tablename IN ('bookings', 'booking_slots')
ORDER BY tablename, policyname;

-- ========================================
-- 11. CHECK IF THERE ARE ANY LOCKS ON TABLES
-- ========================================
SELECT 
  pg_class.relname as table_name,
  pg_locks.locktype,
  pg_locks.mode,
  pg_locks.granted,
  pg_stat_activity.query,
  pg_stat_activity.state,
  pg_stat_activity.query_start
FROM pg_locks
JOIN pg_class ON pg_locks.relation = pg_class.oid
LEFT JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
WHERE pg_class.relname IN ('bookings', 'booking_slots')
  AND pg_stat_activity.state IS NOT NULL;

-- ========================================
-- 12. CHECK BOOKINGS TABLE FOR NULL/INVALID DATA PATTERNS
-- ========================================
SELECT 
  'Recent bookings check' as info,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN customer_name IS NULL THEN 1 END) as null_customer_names,
  COUNT(CASE WHEN booking_date IS NULL THEN 1 END) as null_booking_dates,
  COUNT(CASE WHEN total_amount IS NULL THEN 1 END) as null_total_amounts
FROM bookings
WHERE created_at > NOW() - INTERVAL '7 days';

-- ========================================
-- END OF DIAGNOSTIC QUERIES
-- ========================================
-- Please run ALL queries and share the outputs
-- Especially focus on query #1 (function definition)
