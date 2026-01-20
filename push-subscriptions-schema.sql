-- Push Notification Subscriptions Table
-- Stores admin device push notification subscriptions

CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(endpoint, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_push_subscriptions_user_id ON admin_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_push_subscriptions_active ON admin_push_subscriptions(is_active);

-- RLS Policies
ALTER TABLE admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view their own subscriptions
CREATE POLICY "Admins can view own subscriptions"
  ON admin_push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can insert their own subscriptions
CREATE POLICY "Admins can insert own subscriptions"
  ON admin_push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can update their own subscriptions
CREATE POLICY "Admins can update own subscriptions"
  ON admin_push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can delete their own subscriptions
CREATE POLICY "Admins can delete own subscriptions"
  ON admin_push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE admin_push_subscriptions IS 'Stores push notification subscriptions for admin users';
