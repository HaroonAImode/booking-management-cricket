/**
 * Dashboard API Route
 * GET /api/admin/dashboard - Get comprehensive dashboard statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const GET = withAdminAuth(async (request, { adminProfile }) => {
  try {
    const supabase = await createClient();

    // Call the comprehensive dashboard data function
    const { data, error } = await supabase.rpc('get_dashboard_data');

    if (error) {
      console.error('Dashboard data fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch dashboard data' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    const dashboardData = typeof data === 'string' ? JSON.parse(data) : data;

    // Get recent bookings separately for better formatting
    const { data: recentBookings, error: bookingsError } = await supabase.rpc(
      'get_recent_bookings',
      { limit_count: 10 }
    );

    if (bookingsError) {
      console.error('Recent bookings fetch error:', bookingsError);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...dashboardData,
        recent_bookings: recentBookings || [],
      },
      fetched_at: new Date().toISOString(),
      admin: {
        id: adminProfile.id,
        name: adminProfile.full_name,
        role: adminProfile.role,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Cache configuration (optional - revalidate every 60 seconds)
export const revalidate = 60;
