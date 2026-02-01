/**
 * Dashboard API Route
 * GET /api/admin/dashboard - Get comprehensive dashboard statistics
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';

export const GET = withAdminAuth(async (request, { adminProfile }) => {
  try {
    const supabase = await createClient();

    // Call the comprehensive dashboard data function
    const { data: dashboardData, error } = await supabase.rpc('get_dashboard_data');

    if (error) {
      console.error('Dashboard data fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch dashboard data' },
        { status: 500 }
      );
    }

    // Get recent bookings using the new stored function
    const { data: recentBookings, error: bookingsError } = await supabase
      .rpc('get_recent_bookings', { limit_count: 10 });

    if (bookingsError) {
      console.error('Recent bookings fetch error:', bookingsError);
    }

    // Combine data
    const result = {
      ...dashboardData,
      recent_bookings: recentBookings || [],
    };

    return NextResponse.json({
      success: true,
      data: result,
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