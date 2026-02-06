-- ========================================
-- FIX: Refresh PostgreSQL Schema Cache
-- ========================================
-- The DROP FUNCTION in CRITICAL-FIX caused cache invalidation

-- Step 1: Check current permissions
SELECT 
  routine_name,
  routine_type,
  specific_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_booking_with_slots';

-- Step 2: Grant proper permissions (this refreshes cache)
GRANT EXECUTE ON FUNCTION public.create_booking_with_slots(
  text, date, integer, numeric, numeric, text, text, jsonb, text, text
) TO anon;

GRANT EXECUTE ON FUNCTION public.create_booking_with_slots(
  text, date, integer, numeric, numeric, text, text, jsonb, text, text
) TO authenticated;

-- Step 3: Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verification: List all booking-related functions
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%booking%'
ORDER BY p.proname;
