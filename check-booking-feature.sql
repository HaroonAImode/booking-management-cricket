-- ============================================
-- SQL Queries for Check Booking Feature
-- ============================================
-- Purpose: Enable public booking search and status checking
-- Date: 2026-01-17
-- ============================================

-- 1. Ensure booking_number exists and is unique
-- This column should already exist from previous setup
-- Verify it exists:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND column_name = 'booking_number';

-- If it doesn't exist, create it:
-- ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_number VARCHAR(50) UNIQUE;

-- 2. Create index on customer name for faster searches
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING gin(name gin_trgm_ops);

-- 3. Create index on customer phone for faster searches
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 4. Enable trigram extension for better text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 5. Create a view for easier booking searches (optional but recommended)
CREATE OR REPLACE VIEW public_booking_search AS
SELECT 
  b.id,
  b.booking_number,
  b.booking_date,
  b.total_hours,
  b.total_amount,
  b.advance_payment,
  b.remaining_payment,
  b.status,
  b.created_at,
  c.name as customer_name,
  c.phone as customer_phone,
  c.email as customer_email,
  json_agg(
    json_build_object(
      'slot_hour', bs.slot_hour,
      'is_night_rate', bs.is_night_rate
    )
  ) as slots
FROM bookings b
JOIN customers c ON b.customer_id = c.id
LEFT JOIN booking_slots bs ON b.id = bs.booking_id
GROUP BY b.id, c.id;

-- 6. Grant SELECT permission on the view for anonymous users (optional)
-- Only do this if you want completely public access without API middleware
-- GRANT SELECT ON public_booking_search TO anon;

-- 7. Verify the setup
SELECT 
  'Booking Number Index' as check_name,
  EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'bookings' 
    AND indexname LIKE '%booking_number%'
  ) as exists;

SELECT 
  'Customer Name Index' as check_name,
  EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customers' 
    AND indexname = 'idx_customers_name'
  ) as exists;

SELECT 
  'Customer Phone Index' as check_name,
  EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'customers' 
    AND indexname = 'idx_customers_phone'
  ) as exists;

-- ============================================
-- Testing Queries
-- ============================================

-- Test search by name (case-insensitive, partial match)
SELECT 
  b.booking_number,
  c.name,
  c.phone,
  b.booking_date,
  b.status
FROM bookings b
JOIN customers c ON b.customer_id = c.id
WHERE c.name ILIKE '%John%'
ORDER BY b.created_at DESC;

-- Test search by phone
SELECT 
  b.booking_number,
  c.name,
  c.phone,
  b.booking_date,
  b.status
FROM bookings b
JOIN customers c ON b.customer_id = c.id
WHERE c.phone LIKE '%3001234567%'
ORDER BY b.created_at DESC;

-- Test using the view
SELECT * FROM public_booking_search
WHERE customer_name ILIKE '%John%'
ORDER BY created_at DESC;

-- ============================================
-- Performance Notes
-- ============================================
-- The trigram indexes (gin_trgm_ops) enable fast LIKE/ILIKE searches
-- even with wildcards at the beginning (%search_term%)
-- This is much faster than regular indexes for partial text matching
-- ============================================
