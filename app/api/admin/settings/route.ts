/**
 * System Settings API Route
 * 
 * Purpose: Manage system settings (rates, hours, etc.)
 * Features:
 * - Get all settings
 * - Update booking rates
 * - Update night rate hours
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';

async function getHandler(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all settings as key-value pairs
    const { data: settingsData, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value');

    if (error) {
      console.error('Get settings error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Transform key-value pairs into object structure expected by frontend
    const settings: any = {};
    settingsData?.forEach((item: any) => {
      settings[item.setting_key] = item.setting_value;
    });

    // Extract values from nested JSON structure
    const bookingRates = settings.booking_rates || {};
    const nightHours = settings.night_rate_hours || {};

    // Map to expected structure
    const transformedSettings = {
      day_rate: bookingRates.day_rate || 1500,
      night_rate: bookingRates.night_rate || 2000,
      night_rate_start_hour: nightHours.start_hour || 17,
      night_rate_end_hour: nightHours.end_hour || 7,
    };

    return NextResponse.json({
      success: true,
      settings: transformedSettings,
    });
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function patchHandler(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { settingType, dayRate, nightRate, nightStartHour, nightEndHour } = body;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    let result;

    if (settingType === 'rates') {
      // Validate input
      if (!dayRate || !nightRate) {
        return NextResponse.json(
          { success: false, error: 'Day rate and night rate are required' },
          { status: 400 }
        );
      }

      if (dayRate <= 0 || nightRate <= 0) {
        return NextResponse.json(
          { success: false, error: 'Rates must be greater than zero' },
          { status: 400 }
        );
      }

      // Update rates
      const { data, error } = await supabase.rpc('update_booking_rates', {
        p_day_rate: dayRate,
        p_night_rate: nightRate,
        p_updated_by: userId,
      });

      if (error) {
        console.error('Update rates error:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      result = data;
    } else if (settingType === 'night_hours') {
      // Validate input
      if (nightStartHour === undefined || nightEndHour === undefined) {
        return NextResponse.json(
          { success: false, error: 'Night start hour and end hour are required' },
          { status: 400 }
        );
      }

      if (nightStartHour < 0 || nightStartHour > 23 || nightEndHour < 0 || nightEndHour > 23) {
        return NextResponse.json(
          { success: false, error: 'Hours must be between 0 and 23' },
          { status: 400 }
        );
      }

      // Update night hours
      const { data, error } = await supabase.rpc('update_night_rate_hours', {
        p_start_hour: nightStartHour,
        p_end_hour: nightEndHour,
        p_updated_by: userId,
      });

      if (error) {
        console.error('Update night hours error:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      result = data;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid setting type' },
        { status: 400 }
      );
    }

    // Check if the function returned an error
    if (result && !result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getHandler);
export const PATCH = withAdminAuth(patchHandler);
