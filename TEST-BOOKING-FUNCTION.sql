-- ========================================
-- TEST BOOKING FUNCTION DIRECTLY
-- ========================================
-- Test if the function works (bypassing cache)

-- Test the function with dummy data
SELECT * FROM public.create_booking_with_slots(
  'Test Customer',                  -- p_customer_name
  '2026-02-10',                     -- p_booking_date
  2,                                 -- p_total_hours
  2000.00,                          -- p_total_amount
  500.00,                           -- p_advance_payment
  'cash',                           -- p_advance_payment_method
  '',                               -- p_advance_payment_proof
  '[{"slot_hour": 18, "slot_time": "6:00 PM", "is_night_rate": false, "hourly_rate": 1000}]'::jsonb,  -- p_slots
  '03001234567',                    -- p_customer_phone
  'Test booking'                    -- p_customer_notes
);

-- If successful, then the function works perfectly!
-- The issue is just Supabase cache
