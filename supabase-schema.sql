-- ========================================
-- Cricket Booking Software - Database Schema
-- ========================================
-- Run these queries in your Supabase SQL Editor
-- 
-- This schema includes:
-- 1. Profiles table (extends auth.users)
-- 2. Grounds table (cricket facilities)
-- 3. Bookings table (ground reservations)
-- 4. Row Level Security (RLS) policies
-- 5. Functions and triggers
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ========================================
-- 1. PROFILES TABLE
-- Extends Supabase auth.users with additional user information
-- ========================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX profiles_email_idx ON profiles(email);
CREATE INDEX profiles_role_idx ON profiles(role);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 2. GROUNDS TABLE
-- Cricket facilities available for booking
-- ========================================

CREATE TABLE grounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full_size', 'practice_nets', 'indoor')),
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 22,
  hourly_rate NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active grounds
CREATE INDEX grounds_is_active_idx ON grounds(is_active);
CREATE INDEX grounds_type_idx ON grounds(type);

-- Enable Row Level Security
ALTER TABLE grounds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grounds
-- Anyone can view active grounds
CREATE POLICY "Anyone can view active grounds"
  ON grounds FOR SELECT
  USING (is_active = true);

-- Admins can manage all grounds
CREATE POLICY "Admins can manage grounds"
  ON grounds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- 3. BOOKINGS TABLE
-- Ground reservations
-- ========================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ground_id UUID NOT NULL REFERENCES grounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_amount NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure end_time is after start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  
  -- Prevent double booking (same ground, same date, overlapping times)
  CONSTRAINT no_overlap EXCLUDE USING gist (
    ground_id WITH =,
    booking_date WITH =,
    tsrange(
      (booking_date + start_time)::timestamp,
      (booking_date + end_time)::timestamp
    ) WITH &&
  ) WHERE (status != 'cancelled')
);

-- Indexes for faster queries
CREATE INDEX bookings_ground_id_idx ON bookings(ground_id);
CREATE INDEX bookings_user_id_idx ON bookings(user_id);
CREATE INDEX bookings_date_idx ON bookings(booking_date);
CREATE INDEX bookings_status_idx ON bookings(status);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookings
-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own bookings
CREATE POLICY "Users can create own bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending bookings
CREATE POLICY "Users can cancel own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status IN ('pending', 'cancelled'));

-- Admins can manage all bookings
CREATE POLICY "Admins can manage all bookings"
  ON bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- 4. FUNCTIONS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER grounds_updated_at
  BEFORE UPDATE ON grounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to calculate booking amount
CREATE OR REPLACE FUNCTION public.calculate_booking_amount(
  p_ground_id UUID,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS NUMERIC AS $$
DECLARE
  v_hourly_rate NUMERIC;
  v_hours NUMERIC;
BEGIN
  -- Get hourly rate
  SELECT hourly_rate INTO v_hourly_rate
  FROM grounds
  WHERE id = p_ground_id;
  
  -- Calculate hours
  v_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;
  
  -- Return total amount
  RETURN v_hourly_rate * v_hours;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. SEED DATA (Optional)
-- Sample data for testing
-- ========================================

-- Insert sample grounds
INSERT INTO grounds (name, type, description, capacity, hourly_rate, is_active)
VALUES 
  ('Main Cricket Ground', 'full_size', 'Full-size international standard cricket ground', 22, 150.00, true),
  ('Practice Nets - Area A', 'practice_nets', 'Professional practice nets with 6 lanes', 12, 50.00, true),
  ('Practice Nets - Area B', 'practice_nets', 'Professional practice nets with 4 lanes', 8, 40.00, true),
  ('Indoor Training Arena', 'indoor', 'Climate-controlled indoor training facility', 16, 100.00, true),
  ('Community Ground', 'full_size', 'Community cricket ground for local matches', 22, 75.00, true);

-- ========================================
-- 6. HELPFUL QUERIES
-- Common queries for your application
-- ========================================

-- Get available grounds for a specific date and time
-- (Use this logic in your booking form)
/*
SELECT g.*
FROM grounds g
WHERE g.is_active = true
  AND g.id NOT IN (
    SELECT ground_id
    FROM bookings
    WHERE booking_date = '2026-01-20'  -- Replace with desired date
      AND status != 'cancelled'
      AND (
        (start_time, end_time) OVERLAPS ('10:00', '12:00')  -- Replace with desired time
      )
  );
*/

-- Get user's upcoming bookings with ground details
/*
SELECT 
  b.*,
  g.name as ground_name,
  g.type as ground_type
FROM bookings b
JOIN grounds g ON b.ground_id = g.id
WHERE b.user_id = auth.uid()
  AND b.booking_date >= CURRENT_DATE
  AND b.status != 'cancelled'
ORDER BY b.booking_date, b.start_time;
*/

-- ========================================
-- NOTES:
-- 1. Remember to set your environment variables in .env.local
-- 2. The first user you create can be manually promoted to admin:
--    UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
-- 3. Test RLS policies in Supabase SQL Editor using different user contexts
-- 4. Use the Supabase CLI to generate TypeScript types:
--    npx supabase gen types typescript --project-id YOUR_PROJECT_ID
-- ========================================
