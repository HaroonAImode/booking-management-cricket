-- ========================================
-- FORCE PostgREST SCHEMA CACHE RELOAD
-- ========================================
-- Issue: Function works in SQL but returns 404 from REST API
-- Cause: PostgREST schema cache not refreshed
-- Solution: Multiple reload notifications + wait time

-- Send multiple reload signals
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst;
NOTIFY pgrst, 'reload schema';

-- Wait a moment
SELECT pg_sleep(1);

-- Send again
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- Verify function exists with correct signature
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS parameters,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'create_booking_with_slots';

-- Should show:
-- function_name: create_booking_with_slots
-- parameters: p_customer_name text, p_booking_date date, p_total_hours integer, p_total_amount numeric, p_advance_payment numeric, p_advance_payment_method text, p_advance_payment_proof text, p_slots jsonb, p_customer_phone text DEFAULT NULL::text, p_customer_notes text DEFAULT NULL::text
-- return_type: TABLE(success boolean, booking_id uuid, booking_number text, error_message text)

-- Check permissions are granted
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' 
  AND routine_name = 'create_booking_with_slots'
  AND grantee IN ('anon', 'authenticated', 'public');

-- Should show:
-- anon          EXECUTE
-- authenticated EXECUTE  
-- public        EXECUTE

-- Final reload burst
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';

SELECT 'Schema reload notifications sent successfully!' AS status;
