/**
 * Public API Route: Search Bookings by Customer Name/Phone
 * Allows customers to check their booking status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');
    const phone = searchParams.get('phone');

    if (!name && !phone) {
      return NextResponse.json(
        { success: false, error: 'Name or phone number is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        booking_date,
        total_hours,
        total_amount,
        advance_payment,
        remaining_payment,
        status,
        created_at,
        customers (
          id,
          name,
          phone
        ),
        booking_slots (
          slot_hour,
          is_night_rate
        )
      `)
      .order('created_at', { ascending: false });

    // Add filters
    if (name) {
      query = query.ilike('customers.name', `%${name}%`);
    }
    if (phone) {
      query = query.ilike('customers.phone', `%${phone}%`);
    }

    const { data: bookingsData, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to search bookings' },
        { status: 500 }
      );
    }

    // Format the response
    const bookings = bookingsData.map((booking: any) => ({
      id: booking.id,
      booking_number: booking.booking_number,
      booking_date: booking.booking_date,
      total_hours: booking.total_hours,
      total_amount: booking.total_amount,
      advance_payment: booking.advance_payment,
      remaining_payment: booking.remaining_payment,
      status: booking.status,
      created_at: booking.created_at,
      customer: {
        name: booking.customers?.name || '',
        phone: booking.customers?.phone || '',
      },
      slots: booking.booking_slots || [],
    }));

    return NextResponse.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
