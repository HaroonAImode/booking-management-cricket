-- Fix Night Rate Hours: Update end hour from 6 to 7
-- This ensures 12 AM to 6:59 AM are all charged night rate (PKR 2000/hr)
-- Night Rate: 5 PM (17:00) to 7 AM (07:00)

UPDATE system_settings
SET setting_value = '{"start_hour": 17, "end_hour": 7}'::JSONB,
    description = 'Night rate time range (17:00 to 07:00 - 5 PM to 7 AM)',
    updated_at = NOW()
WHERE setting_key = 'night_rate_hours';

-- Verify the update
SELECT setting_key, setting_value, description
FROM system_settings
WHERE setting_key = 'night_rate_hours';
