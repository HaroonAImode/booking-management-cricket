-- ========================================
-- GET create_booking_with_slots FUNCTION CODE
-- ========================================

SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_booking_with_slots';
