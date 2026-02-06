/**
 * Cleanup Old Push Subscriptions
 * 
 * This script removes push subscriptions from the old Vercel domain
 * to prevent duplicate notifications
 * 
 * Run this in your Supabase SQL Editor
 */

-- Step 1: Check current subscriptions (for reference)
SELECT 
  id,
  user_id,
  endpoint,
  is_active,
  created_at
FROM admin_push_subscriptions
ORDER BY created_at DESC;

-- Step 2: Deactivate ALL old subscriptions (keep only the most recent one per user)
-- This will keep ONLY the newest subscription for each user and deactivate all others
WITH ranked_subscriptions AS (
  SELECT 
    id,
    user_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM admin_push_subscriptions
  WHERE is_active = true
)
UPDATE admin_push_subscriptions
SET 
  is_active = false,
  updated_at = now()
WHERE id IN (
  SELECT id 
  FROM ranked_subscriptions 
  WHERE rn > 1  -- Keep only rank 1 (most recent), deactivate all others
);

-- Step 3: Verify cleanup - should show ONLY ONE active subscription per user
SELECT 
  id,
  user_id,
  SUBSTRING(endpoint, 1, 80) as endpoint_preview,
  is_active,
  created_at
FROM admin_push_subscriptions
WHERE is_active = true
ORDER BY user_id, created_at DESC;
