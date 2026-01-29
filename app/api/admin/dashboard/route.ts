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

    // Get recent bookings with ALL payment details
    const { data: recentBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers!inner(name, phone),
        slots:booking_slots(slot_hour, is_night_rate),
        payments:booking_payments(
          payment_type,
          payment_method,
          amount
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (bookingsError) {
      console.error('Recent bookings fetch error:', bookingsError);
    }

    // Format recent bookings
    const formattedBookings = recentBookings?.map(booking => ({
      id: booking.id,
      booking_number: booking.booking_number,
      customer_name: booking.customer.name,
      customer_phone: booking.customer.phone,
      booking_date: booking.booking_date,
      total_hours: booking.total_hours,
      total_amount: booking.total_amount,
      advance_payment: booking.advance_payment,
      advance_payment_method: booking.advance_payment_method,
      remaining_payment: booking.remaining_payment,
      remaining_payment_method: booking.remaining_payment_method,
      remaining_payment_amount: booking.remaining_payment_amount,
      status: booking.status,
      created_at: booking.created_at,
      pending_expires_at: booking.pending_expires_at,
      slots: booking.slots || [],
      payments: booking.payments || [],
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        ...dashboardData,
        recent_bookings: formattedBookings,
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