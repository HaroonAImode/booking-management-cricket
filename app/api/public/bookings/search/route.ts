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

    // First, get customer IDs that match the search criteria
    let customerQuery = supabase
      .from('customers')
      .select('id');

    if (name) {
      customerQuery = customerQuery.ilike('name', `%${name}%`);
    }
    if (phone) {
      customerQuery = customerQuery.ilike('phone', `%${phone}%`);
    }

    const { data: customersData, error: customersError } = await customerQuery;

    if (customersError) {
      console.error('Customer search error:', customersError);
      return NextResponse.json(
        { success: false, error: 'Failed to search customers' },
        { status: 500 }
      );
    }

    // If no customers found, return empty results
    if (!customersData || customersData.length === 0) {
      return NextResponse.json({
        success: true,
        bookings: [],
      });
    }

    // Get customer IDs
    const customerIds = customersData.map(c => c.id);

    // Now query bookings for those customers
    const { data: bookingsData, error } = await supabase
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
        customer_id,
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
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false });

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
