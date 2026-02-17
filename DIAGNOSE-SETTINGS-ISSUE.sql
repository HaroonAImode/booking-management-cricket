-- ========================================
-- DIAGNOSE SETTINGS PRICING ISSUE
-- ========================================
-- This script verifies which settings tables exist and what values they contain

-- 1. Check if both settings tables exist
SELECT 
  'Tables Check' as check_type,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') as has_settings_table,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') as has_system_settings_table;

-- 2. Check values in 'settings' table (old table used by booking functions)
SELECT 
  '--- OLD SETTINGS TABLE (used by booking functions) ---' as section;
  
SELECT 
  setting_key,
  setting_value,
  'This table is used by get_available_slots and calculate_booking_amount functions' as note
FROM settings 
WHERE setting_key IN ('day_rate_per_hour', 'night_rate_per_hour', 'night_start_time', 'night_end_time')
ORDER BY setting_key;

-- 3. Check values in 'system_settings' table (new table updated by admin)
SELECT 
  '--- NEW SYSTEM_SETTINGS TABLE (updated by admin settings page) ---' as section;

SELECT 
  setting_key,
  setting_value,
  'This table is updated via settings page but NOT used by booking functions' as note
FROM system_settings 
WHERE setting_key IN ('booking_rates', 'night_rate_hours')
ORDER BY setting_key;

-- 4. Check what functions are using which table
SELECT 
  '--- FUNCTIONS AND THEIR SETTINGS TABLE USAGE ---' as section;

SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%system_settings%' THEN '✅ Uses system_settings (NEW)'
    WHEN pg_get_functiondef(p.oid) LIKE '%FROM settings%' THEN '❌ Uses settings (OLD)'
    ELSE 'Unknown'
  END as table_used,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%system_settings%' THEN 'CORRECT'
    WHEN pg_get_functiondef(p.oid) LIKE '%FROM settings%' THEN '⚠️ PROBLEM - needs update'
    ELSE 'N/A'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_available_slots', 'calculate_booking_amount', 'calculate_slot_rate', 'get_booking_rates')
ORDER BY p.proname;

-- 5. Check recent bookings to see what rates were actually used
SELECT 
  '--- RECENT BOOKINGS AND THEIR RATES ---' as section;

SELECT 
  b.booking_number,
  b.booking_date,
  b.total_hours,
  b.total_amount,
  ROUND(b.total_amount / b.total_hours, 2) as avg_rate_per_hour,
  b.created_at
FROM bookings b
ORDER BY b.created_at DESC
LIMIT 5;

-- 6. Check recent booking slots to see individual slot rates
SELECT 
  '--- RECENT BOOKING SLOTS AND THEIR HOURLY RATES ---' as section;

SELECT 
  bs.slot_date,
  bs.slot_hour,
  bs.is_night_rate,
  bs.hourly_rate,
  b.booking_number,
  b.created_at
FROM booking_slots bs
JOIN bookings b ON bs.booking_id = b.id
ORDER BY b.created_at DESC, bs.slot_hour
LIMIT 10;

-- ========================================
-- SUMMARY
-- ========================================
-- If this shows:
-- 1. Both tables exist with DIFFERENT values
-- 2. get_available_slots and calculate_booking_amount use OLD 'settings' table
-- 3. Admin updates go to 'system_settings' table only
-- 
-- THEN: We need to update the functions to use system_settings table
-- OR: Sync values between both tables
