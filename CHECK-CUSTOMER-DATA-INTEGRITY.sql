-- ========================================
-- CHECK CUSTOMER DATA INTEGRITY ISSUE
-- ========================================

-- Step 1: Check customers table structure and constraints
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- Step 2: Check for UNIQUE constraints on phone
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'customers'
ORDER BY tc.constraint_type, kcu.column_name;

-- Step 3: Check if multiple customers share same phone
SELECT 
  phone,
  COUNT(*) as customer_count,
  string_agg(name, ', ' ORDER BY created_at) as customer_names,
  string_agg(id::text, ', ' ORDER BY created_at) as customer_ids
FROM customers
WHERE phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY customer_count DESC;

-- Step 4: Check bookings with same phone but different customer names
SELECT 
  c.phone,
  c.name as customer_name_in_db,
  b.booking_number,
  b.booking_date,
  b.created_at
FROM bookings b
JOIN customers c ON b.customer_id = c.id
WHERE c.phone IN (
  SELECT phone 
  FROM customers 
  WHERE phone IS NOT NULL 
  GROUP BY phone 
  HAVING COUNT(*) > 1
)
ORDER BY c.phone, b.created_at;
