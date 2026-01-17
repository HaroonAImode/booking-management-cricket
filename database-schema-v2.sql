-- ========================================
-- CRICKET GROUND BOOKING SYSTEM - COMPLETE DATABASE SCHEMA
-- ========================================
-- Version: 2.0
-- Description: Management system for cricket ground bookings with slot management
-- 
-- Key Features:
-- - Customer booking system (no login required for public)
-- - Time slot management (hourly bookings)
-- - Payment tracking (advance + remaining)
-- - Admin approval workflow
-- - Notification system
-- - Dynamic pricing (day/night rates)
-- - Complete audit trail
-- ========================================

-- ========================================
-- STEP 1: CLEAN UP OLD SCHEMA (if exists)
-- ========================================

-- Drop old tables from previous schema (in correct order to handle foreign keys)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS booking_slots CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS grounds CASCADE; -- Old table from v1
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Drop old triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_booking_number() CASCADE;
DROP FUNCTION IF EXISTS update_customer_stats() CASCADE;
DROP FUNCTION IF EXISTS create_booking_notification() CASCADE;
DROP FUNCTION IF EXISTS update_slot_status() CASCADE;
DROP FUNCTION IF EXISTS check_fully_paid() CASCADE;
DROP FUNCTION IF EXISTS get_available_slots(DATE) CASCADE;
DROP FUNCTION IF EXISTS calculate_booking_amount(UUID, TIME, TIME) CASCADE;
DROP FUNCTION IF EXISTS calculate_booking_amount(DATE, INTEGER[]) CASCADE;

-- ========================================
-- STEP 2: ENABLE REQUIRED EXTENSIONS
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ========================================
-- 1. CUSTOMERS TABLE
-- Store customer information for bookings
-- ========================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL, -- Primary contact (required)
  alternate_phone TEXT, -- Optional secondary contact
  address TEXT,
  notes TEXT, -- Any special notes about customer
  total_bookings INTEGER DEFAULT 0, -- Track total lifetime bookings
  total_spent NUMERIC(10, 2) DEFAULT 0, -- Track total lifetime spending
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX customers_phone_idx ON customers(phone);
CREATE INDEX customers_email_idx ON customers(email);
CREATE INDEX customers_name_idx ON customers(name);

COMMENT ON TABLE customers IS 'Customer information for ground bookings';
COMMENT ON COLUMN customers.phone IS 'Primary contact number (required)';
COMMENT ON COLUMN customers.total_bookings IS 'Lifetime count of bookings';
COMMENT ON COLUMN customers.total_spent IS 'Lifetime total amount paid';

-- ========================================
-- 2. SETTINGS TABLE
-- System-wide configuration (hourly rates, timings)
-- ========================================

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
  ('day_rate_per_hour', '1500', 'Hourly rate for daytime bookings (PKR)'),
  ('night_rate_per_hour', '2000', 'Hourly rate for nighttime bookings (PKR)'),
  ('night_start_time', '17:00', 'Night time starts (5 PM / Maghrib)'),
  ('night_end_time', '07:00', 'Night time ends (7 AM / Fajr)'),
  ('advance_payment_required', '500', 'Minimum advance payment required (PKR)'),
  ('booking_buffer_minutes', '0', 'Buffer time between bookings (minutes)'),
  ('ground_name', 'Cricket Ground', 'Name of the cricket ground'),
  ('ground_capacity', '22', 'Maximum players capacity');

CREATE INDEX settings_key_idx ON settings(setting_key);

COMMENT ON TABLE settings IS 'System configuration and pricing settings';
COMMENT ON COLUMN settings.setting_key IS 'Unique identifier for setting';
COMMENT ON COLUMN settings.setting_value IS 'Value stored as text (convert as needed)';

-- ========================================
-- 3. BOOKINGS TABLE
-- Main booking records
-- ========================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number TEXT UNIQUE NOT NULL, -- Human-readable booking reference (e.g., BK-20260116-001)
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Booking details
  booking_date DATE NOT NULL, -- Date of the actual booking/play
  total_hours INTEGER NOT NULL, -- Total hours booked
  total_amount NUMERIC(10, 2) NOT NULL, -- Total calculated amount
  
  -- Payment details
  advance_payment NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Advance paid
  advance_payment_method TEXT, -- online, bank, cash, etc.
  advance_payment_proof TEXT, -- URL/path to payment screenshot
  advance_payment_date TIMESTAMPTZ,
  
  remaining_payment NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Remaining amount
  remaining_payment_method TEXT, -- online, bank, cash, etc.
  remaining_payment_proof TEXT, -- URL/path to payment screenshot
  remaining_payment_date TIMESTAMPTZ,
  
  is_fully_paid BOOLEAN NOT NULL DEFAULT false, -- Payment complete flag
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
  
  -- Admin actions
  approved_by UUID REFERENCES auth.users(id), -- Admin who approved
  approved_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  
  -- Additional info
  customer_notes TEXT, -- Notes from customer during booking
  admin_notes TEXT, -- Internal notes by admin
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_advance CHECK (advance_payment >= 0),
  CONSTRAINT valid_remaining CHECK (remaining_payment >= 0),
  CONSTRAINT valid_total CHECK (total_amount = advance_payment + remaining_payment)
);

-- Indexes for performance
CREATE INDEX bookings_customer_idx ON bookings(customer_id);
CREATE INDEX bookings_date_idx ON bookings(booking_date);
CREATE INDEX bookings_status_idx ON bookings(status);
CREATE INDEX bookings_booking_number_idx ON bookings(booking_number);
CREATE INDEX bookings_created_at_idx ON bookings(created_at);
CREATE INDEX bookings_fully_paid_idx ON bookings(is_fully_paid);

COMMENT ON TABLE bookings IS 'Main booking records with payment tracking';
COMMENT ON COLUMN bookings.booking_number IS 'Human-readable booking reference number';
COMMENT ON COLUMN bookings.status IS 'pending=awaiting approval, approved=confirmed, completed=finished, cancelled=rejected';
COMMENT ON COLUMN bookings.is_fully_paid IS 'True when advance + remaining = total_amount paid';

-- ========================================
-- 4. BOOKING_SLOTS TABLE
-- Individual time slots for each booking
-- ========================================

CREATE TABLE booking_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Slot details
  slot_date DATE NOT NULL, -- Date of this slot
  slot_time TIME NOT NULL, -- Start time (e.g., 14:00 for 2 PM)
  slot_hour INTEGER NOT NULL, -- Hour number for easy filtering (14 for 2 PM)
  
  -- Pricing for this specific slot
  is_night_rate BOOLEAN NOT NULL DEFAULT false, -- True if night pricing applies
  hourly_rate NUMERIC(10, 2) NOT NULL, -- Rate applied for this hour
  
  -- Status
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'pending', 'booked', 'completed', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent double booking: same date + time cannot be booked twice
  CONSTRAINT unique_slot_datetime UNIQUE (slot_date, slot_time)
);

-- Indexes
CREATE INDEX slots_booking_idx ON booking_slots(booking_id);
CREATE INDEX slots_date_idx ON booking_slots(slot_date);
CREATE INDEX slots_time_idx ON booking_slots(slot_time);
CREATE INDEX slots_status_idx ON booking_slots(status);
CREATE INDEX slots_date_time_idx ON booking_slots(slot_date, slot_time);

COMMENT ON TABLE booking_slots IS 'Individual hourly slots for bookings';
COMMENT ON COLUMN booking_slots.slot_time IS 'Start time of 1-hour slot (e.g., 14:00 = 2-3 PM)';
COMMENT ON COLUMN booking_slots.status IS 'available=free, pending=awaiting approval, booked=confirmed, completed=finished, cancelled=released';
COMMENT ON CONSTRAINT unique_slot_datetime ON booking_slots IS 'Prevents double booking of same time slot';

-- ========================================
-- 5. PAYMENTS TABLE
-- Detailed payment history and audit trail
-- ========================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Payment details
  payment_type TEXT NOT NULL CHECK (payment_type IN ('advance', 'remaining', 'refund')),
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL, -- online, bank, cash, jazzcash, easypaisa, etc.
  payment_proof TEXT, -- URL/path to screenshot
  
  -- Payment tracking
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by UUID REFERENCES auth.users(id), -- Admin who recorded payment
  
  -- Additional info
  transaction_id TEXT, -- Bank/online transaction reference
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Indexes
CREATE INDEX payments_booking_idx ON payments(booking_id);
CREATE INDEX payments_type_idx ON payments(payment_type);
CREATE INDEX payments_date_idx ON payments(payment_date);

COMMENT ON TABLE payments IS 'Detailed payment transaction history';
COMMENT ON COLUMN payments.payment_type IS 'advance=initial payment, remaining=final payment, refund=cancellation refund';

-- ========================================
-- 6. NOTIFICATIONS TABLE
-- System notifications for admin
-- ========================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Notification details
  notification_type TEXT NOT NULL 
    CHECK (notification_type IN ('new_booking', 'payment_received', 'booking_cancelled', 'slot_conflict', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES auth.users(id),
  
  -- Priority
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX notifications_type_idx ON notifications(notification_type);
CREATE INDEX notifications_read_idx ON notifications(is_read);
CREATE INDEX notifications_created_idx ON notifications(created_at DESC);
CREATE INDEX notifications_booking_idx ON notifications(booking_id);
CREATE INDEX notifications_priority_idx ON notifications(priority);

COMMENT ON TABLE notifications IS 'Admin notification system';
COMMENT ON COLUMN notifications.notification_type IS 'Category of notification';
COMMENT ON COLUMN notifications.priority IS 'Importance level for display';

-- ========================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS: CUSTOMERS
-- Public can insert (for booking), Admins can do everything
-- ========================================

-- Public can insert customers (when making bookings)
CREATE POLICY "Public can insert customers"
  ON customers FOR INSERT
  TO public
  WITH CHECK (true);

-- Public can view their own customer record (optional - if you want to show booking history)
CREATE POLICY "Public can view customers"
  ON customers FOR SELECT
  TO public
  USING (true);

-- Admins can do everything with customers
CREATE POLICY "Admins full access to customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ========================================
-- RLS: BOOKINGS
-- Public can insert, Admins can do everything
-- ========================================

-- Public can insert bookings
CREATE POLICY "Public can insert bookings"
  ON bookings FOR INSERT
  TO public
  WITH CHECK (true);

-- Public can view bookings (needed to show confirmation)
CREATE POLICY "Public can view bookings"
  ON bookings FOR SELECT
  TO public
  USING (true);

-- Admins can manage all bookings
CREATE POLICY "Admins full access to bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ========================================
-- RLS: BOOKING_SLOTS
-- Public can view (to check availability), Admins can manage
-- ========================================

-- Public can view slots to check availability
CREATE POLICY "Public can view booking slots"
  ON booking_slots FOR SELECT
  TO public
  USING (true);

-- Public can insert slots (when creating booking)
CREATE POLICY "Public can insert booking slots"
  ON booking_slots FOR INSERT
  TO public
  WITH CHECK (true);

-- Admins full access
CREATE POLICY "Admins full access to slots"
  ON booking_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ========================================
-- RLS: PAYMENTS
-- Public cannot access, Admins only
-- ========================================

CREATE POLICY "Admins full access to payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ========================================
-- RLS: NOTIFICATIONS
-- Admins only
-- ========================================

CREATE POLICY "Admins full access to notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ========================================
-- RLS: SETTINGS
-- Public can view (for pricing), Admins can update
-- ========================================

-- Public can view settings (to show pricing)
CREATE POLICY "Public can view settings"
  ON settings FOR SELECT
  TO public
  USING (true);

-- Admins can manage settings
CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ========================================
-- 8. TRIGGERS & FUNCTIONS
-- ========================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all tables
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER booking_slots_updated_at
  BEFORE UPDATE ON booking_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: Generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part TEXT;
  sequence_num INTEGER;
  new_booking_number TEXT;
BEGIN
  -- Format: BK-YYYYMMDD-XXX
  date_part := TO_CHAR(NEW.created_at, 'YYYYMMDD');
  
  -- Get count of bookings for today
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM bookings
  WHERE TO_CHAR(created_at, 'YYYYMMDD') = date_part;
  
  -- Generate booking number
  new_booking_number := 'BK-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  NEW.booking_number := new_booking_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_booking_number_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.booking_number IS NULL)
  EXECUTE FUNCTION generate_booking_number();

-- Function: Update customer statistics
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE customers
    SET 
      total_bookings = (
        SELECT COUNT(*) 
        FROM bookings 
        WHERE customer_id = NEW.customer_id 
        AND status IN ('approved', 'completed')
      ),
      total_spent = (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM bookings
        WHERE customer_id = NEW.customer_id
        AND status IN ('approved', 'completed')
        AND is_fully_paid = true
      )
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Function: Create notification on new booking
CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (
      notification_type,
      title,
      message,
      booking_id,
      customer_id,
      priority
    ) VALUES (
      'new_booking',
      'New Booking Request',
      'New booking request #' || NEW.booking_number || ' received from customer.',
      NEW.id,
      NEW.customer_id,
      'high'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_booking_notification_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_booking_notification();

-- Function: Update slot status when booking status changes
CREATE OR REPLACE FUNCTION update_slot_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE booking_slots
    SET status = 'booked'
    WHERE booking_id = NEW.id;
  ELSIF NEW.status = 'cancelled' THEN
    UPDATE booking_slots
    SET status = 'cancelled'
    WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_slot_status_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_slot_status();

-- Function: Check if fully paid
CREATE OR REPLACE FUNCTION check_fully_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.advance_payment + NEW.remaining_payment >= NEW.total_amount THEN
    NEW.is_fully_paid := true;
  ELSE
    NEW.is_fully_paid := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_fully_paid_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_fully_paid();

-- ========================================
-- 9. HELPER FUNCTIONS FOR APPLICATION
-- ========================================

-- Function: Get available slots for a specific date
CREATE OR REPLACE FUNCTION get_available_slots(p_date DATE)
RETURNS TABLE (
  slot_hour INTEGER,
  slot_time TIME,
  is_available BOOLEAN,
  current_status TEXT,
  hourly_rate NUMERIC
) AS $$
DECLARE
  day_rate NUMERIC;
  night_rate NUMERIC;
  night_start TIME;
  night_end TIME;
  current_hour INTEGER;
  slot_time_val TIME;
  slot_exists BOOLEAN;
  slot_status TEXT;
BEGIN
  -- Get current rates from settings
  SELECT setting_value::NUMERIC INTO day_rate
  FROM settings WHERE setting_key = 'day_rate_per_hour';
  
  SELECT setting_value::NUMERIC INTO night_rate
  FROM settings WHERE setting_key = 'night_rate_per_hour';
  
  SELECT setting_value::TIME INTO night_start
  FROM settings WHERE setting_key = 'night_start_time';
  
  SELECT setting_value::TIME INTO night_end
  FROM settings WHERE setting_key = 'night_end_time';
  
  -- Generate all 24 hours
  FOR current_hour IN 0..23 LOOP
    slot_time_val := (current_hour || ':00:00')::TIME;
    
    -- Check if slot exists in booking_slots (with table alias)
    SELECT EXISTS(
      SELECT 1 FROM booking_slots bs
      WHERE bs.slot_date = p_date
      AND bs.slot_hour = current_hour
      AND bs.status IN ('pending', 'booked')
    ) INTO slot_exists;
    
    -- Get slot status if exists (with table alias)
    IF slot_exists THEN
      SELECT bs.status INTO slot_status
      FROM booking_slots bs
      WHERE bs.slot_date = p_date
      AND bs.slot_hour = current_hour
      AND bs.status IN ('pending', 'booked')
      LIMIT 1;
    ELSE
      slot_status := 'available';
    END IF;
    
    -- Determine rate (night vs day) - use explicit column names
    RETURN QUERY SELECT
      current_hour AS slot_hour,
      slot_time_val AS slot_time,
      NOT slot_exists AS is_available,
      slot_status AS current_status,
      CASE
        WHEN (slot_time_val >= night_start OR slot_time_val < night_end) THEN night_rate
        ELSE day_rate
      END AS hourly_rate;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate booking amount
CREATE OR REPLACE FUNCTION calculate_booking_amount(
  p_slot_date DATE,
  p_slot_hours INTEGER[]
)
RETURNS NUMERIC AS $$
DECLARE
  total NUMERIC := 0;
  day_rate NUMERIC;
  night_rate NUMERIC;
  night_start TIME;
  night_end TIME;
  hour_val INTEGER;
  hour_time TIME;
BEGIN
  -- Get rates from settings
  SELECT setting_value::NUMERIC INTO day_rate
  FROM settings WHERE setting_key = 'day_rate_per_hour';
  
  SELECT setting_value::NUMERIC INTO night_rate
  FROM settings WHERE setting_key = 'night_rate_per_hour';
  
  SELECT setting_value::TIME INTO night_start
  FROM settings WHERE setting_key = 'night_start_time';
  
  SELECT setting_value::TIME INTO night_end
  FROM settings WHERE setting_key = 'night_end_time';
  
  -- Calculate total for each hour
  FOREACH hour_val IN ARRAY p_slot_hours
  LOOP
    hour_time := (hour_val || ':00:00')::TIME;
    
    IF (hour_time >= night_start OR hour_time < night_end) THEN
      total := total + night_rate;
    ELSE
      total := total + day_rate;
    END IF;
  END LOOP;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 10. INDEXES FOR ANALYTICS/REPORTING
-- ========================================

-- Index for date-based queries (dashboard statistics)
CREATE INDEX bookings_date_status_idx ON bookings(booking_date, status);

-- Index for amount aggregations
CREATE INDEX bookings_amount_idx ON bookings(total_amount) WHERE status IN ('approved', 'completed');
CREATE INDEX bookings_paid_amount_idx ON bookings(advance_payment, remaining_payment) WHERE is_fully_paid = true;

-- ========================================
-- SETUP COMPLETE
-- ========================================

-- Verify tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show all RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
