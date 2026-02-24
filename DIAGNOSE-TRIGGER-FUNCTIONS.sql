-- ========================================
-- DIAGNOSE TRIGGER FUNCTIONS CAUSING CRASH
-- ========================================

-- 1. GET prevent_slot_overlap FUNCTION DEFINITION
SELECT 
  'prevent_slot_overlap function' as info,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'prevent_slot_overlap';

-- 2. GET check_and_reserve_slots FUNCTION DEFINITION
SELECT 
  'check_and_reserve_slots function' as info,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'check_and_reserve_slots';

-- 3. GET generate_booking_number FUNCTION DEFINITION
SELECT 
  'generate_booking_number function' as info,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'generate_booking_number';

-- 4. GET check_fully_paid FUNCTION DEFINITION
SELECT 
  'check_fully_paid function' as info,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'check_fully_paid';
