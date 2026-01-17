-- ========================================
-- TIME FORMAT UPDATE - 24-HOUR TO 12-HOUR
-- ========================================
-- This file documents time format changes across the application.
-- Most changes are frontend-only (JavaScript/TypeScript formatting).
-- No database schema changes are required.
--
-- CONTEXT:
-- - Database stores times in TIME format (24-hour: 14:00:00)
-- - Frontend now displays in 12-hour format (2:00 PM)
-- - This is handled by JavaScript formatting functions
-- ========================================

-- ========================================
-- NO DATABASE CHANGES NEEDED
-- ========================================
-- The database continues to store times in TIME format (24-hour).
-- This is the correct approach because:
--   1. TIME is an ISO standard format
--   2. Easier for calculations and comparisons
--   3. No ambiguity (no AM/PM confusion)
--   4. International compatibility
--
-- All formatting to 12-hour AM/PM is done in the frontend:
--   - lib/supabase/bookings.ts: formatTimeDisplay()
--   - Components use this utility consistently
-- ========================================

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check current time format in booking_slots table
SELECT 
  slot_date,
  slot_time,
  slot_hour,
  TO_CHAR(slot_time, 'HH12:MI AM') as formatted_12hour,
  status
FROM booking_slots
ORDER BY slot_date DESC, slot_hour ASC
LIMIT 10;

-- Check time settings
SELECT 
  setting_key,
  setting_value,
  TO_CHAR(setting_value::TIME, 'HH12:MI AM') as formatted_value
FROM settings
WHERE setting_key IN ('night_start_time', 'night_end_time');

-- ========================================
-- OPTIONAL: Database-Level 12-Hour Formatting
-- ========================================
-- If you need to format times at the database level (e.g., for reports),
-- you can use PostgreSQL's TO_CHAR function:

-- Example: Format slot times as 12-hour in query results
SELECT 
  booking_id,
  slot_date,
  TO_CHAR(slot_time, 'HH12:MI AM') as slot_time_12hour,
  slot_hour,
  status
FROM booking_slots
WHERE slot_date >= CURRENT_DATE
ORDER BY slot_date, slot_hour;

-- Example: Create a view with 12-hour formatted times
CREATE OR REPLACE VIEW booking_slots_formatted AS
SELECT 
  id,
  booking_id,
  slot_date,
  slot_time,
  TO_CHAR(slot_time, 'HH12:MI AM') as slot_time_formatted,
  slot_hour,
  is_night_rate,
  hourly_rate,
  status,
  created_at
FROM booking_slots;

COMMENT ON VIEW booking_slots_formatted IS 'Booking slots with 12-hour formatted time for reports';

-- ========================================
-- FRONTEND FORMATTING FUNCTIONS
-- ========================================
-- Located in: lib/supabase/bookings.ts
--
-- formatTimeDisplay(hour: number): string
--   - Converts 24-hour (0-23) to 12-hour format
--   - Examples: 0 → "12:00 AM", 14 → "2:00 PM"
--
-- formatTimeRange(startHour: number, endHour?: number): string
--   - Formats time range (e.g., "2:00 PM - 3:00 PM")
--
-- formatSlotTime(slotHour: number): string
--   - Formats slot with start-end range
--
-- convert24To12Hour(time24: string): string
--   - Converts "14:00:00" → "2:00 PM"
--
-- formatDateTime12Hour(date: string | Date): string
--   - Formats Date object to 12-hour time with minutes
-- ========================================

-- ========================================
-- AFFECTED COMPONENTS (Frontend)
-- ========================================
-- These components now display times in 12-hour format:
--
-- 1. SlotSelector.tsx - Time slot buttons
-- 2. BookingForm.tsx - Selected slots display
-- 3. BookingReview.tsx - Booking confirmation slots
-- 4. BookingDetailsModal.tsx - Admin booking details
-- 5. CalendarFirstBooking.tsx - Calendar slot selector
-- 6. app/admin/bookings/page.tsx - Bookings table
-- 7. app/admin/dashboard/page.tsx - Dashboard stats
-- 8. app/admin/calendar/page.tsx - Calendar view
-- 9. app/admin/settings/page.tsx - Time settings (already 12-hour)
--
-- All use formatTimeDisplay() for consistent formatting.
-- ========================================

-- ========================================
-- TESTING QUERIES
-- ========================================

-- Test: Get bookings with formatted slot times
SELECT 
  b.booking_number,
  b.booking_date,
  c.name as customer_name,
  ARRAY_AGG(
    TO_CHAR(bs.slot_time, 'HH12:MI AM') 
    ORDER BY bs.slot_hour
  ) as slot_times,
  b.total_amount,
  b.status
FROM bookings b
JOIN customers c ON b.customer_id = c.id
LEFT JOIN booking_slots bs ON b.id = bs.booking_id
WHERE b.booking_date >= CURRENT_DATE
GROUP BY b.id, b.booking_number, b.booking_date, c.name, b.total_amount, b.status
ORDER BY b.booking_date, b.booking_number
LIMIT 10;

-- Test: Check all slot times for a specific date
SELECT 
  slot_hour,
  TO_CHAR(slot_time, 'HH12:MI AM') as formatted_time,
  status,
  COUNT(*) as count
FROM booking_slots
WHERE slot_date = CURRENT_DATE
GROUP BY slot_hour, slot_time, status
ORDER BY slot_hour;

-- ========================================
-- SUMMARY
-- ========================================
-- ✅ Database: Continues to store TIME in 24-hour format
-- ✅ Frontend: All displays now use 12-hour AM/PM format
-- ✅ Utilities: Centralized formatting functions in lib/supabase/bookings.ts
-- ✅ Components: All updated to use formatTimeDisplay()
-- ✅ Consistency: No mixed formats across the application
-- ✅ Edge Cases: Correctly handles 12 AM (midnight) and 12 PM (noon)
--
-- No database migration required. All changes are code-level only.
-- ========================================
