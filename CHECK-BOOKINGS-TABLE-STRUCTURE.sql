-- ========================================
-- CHECK BOOKINGS TABLE STRUCTURE
-- ========================================
-- Run this first to see what columns actually exist

-- Check all columns in bookings table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY ordinal_position;
