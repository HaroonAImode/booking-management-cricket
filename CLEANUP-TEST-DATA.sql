-- ========================================
-- CLEANUP TEST DATA
-- ========================================

-- Delete test booking from workflow test
DELETE FROM booking_slots 
WHERE booking_id IN (
  SELECT b.id FROM bookings b
  JOIN customers c ON b.customer_id = c.id
  WHERE b.booking_date = '2026-02-15' AND c.phone = '0300-9999999'
);

DELETE FROM bookings 
WHERE id IN (
  SELECT b.id FROM bookings b
  JOIN customers c ON b.customer_id = c.id
  WHERE b.booking_date = '2026-02-15' AND c.phone = '0300-9999999'
);

DELETE FROM customers WHERE phone = '0300-9999999';

SELECT 'Test data cleaned up - ready to run workflow test again' as status;
