/**
 * Check Available Slots API
 * 
 * Purpose: Check which time slots are available for a given date
 * Method: GET
 * 
 * Query Parameters:
 * - date: The booking date to check (YYYY-MM-DD)
 * - excludeBookingId: (Optional) Booking ID to exclude from check (for editing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const excludeBookingId = searchParams.get('excludeBookingId');

  if (!date) {
    return NextResponse.json(
      { success: false, error: 'Date is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Get all bookings for the date (not cancelled)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('booking_date', date)
      .in('status', ['pending', 'approved', 'completed']);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    // Filter out the current booking if editing
    const bookingIds = (bookings || [])
      .map(b => b.id)
      .filter(id => id !== excludeBookingId);

    // Get slots for these bookings
    const { data: bookedSlots, error } = bookingIds.length > 0
      ? await supabase
          .from('booking_slots')
          .select('slot_hour')
          .in('booking_id', bookingIds)
      : { data: [], error: null };

    if (error) {
      console.error('Error fetching booked slots:', error);
      throw error;
    }

    // Extract booked slot hours
    const bookedHours = new Set(bookedSlots?.map((slot: any) => slot.slot_hour) || []);

    // Generate all available hours (0-23)
    const availableSlots = Array.from({ length: 24 }, (_, i) => i)
      .filter(hour => !bookedHours.has(hour));

    return NextResponse.json({
      success: true,
      availableSlots,
      bookedSlots: Array.from(bookedHours),
    });
  } catch (error: any) {
    console.error('Check slots API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check available slots' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);
