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

    // Query booking_slots directly by slot_date so that cross-midnight bookings
    // (whose booking_date is the START day but whose slot rows have a LATER slot_date)
    // are correctly detected as booked on the actual calendar date.
    let slotsQuery = supabase
      .from('booking_slots')
      .select('slot_hour, booking_id, bookings!inner(id, status)')
      .eq('slot_date', date)
      .in('bookings.status', ['pending', 'approved', 'completed']);

    if (excludeBookingId) {
      slotsQuery = slotsQuery.neq('booking_id', excludeBookingId);
    }

    const { data: bookedSlotRows, error } = await slotsQuery;

    if (error) {
      console.error('Error fetching booked slots:', error);
      throw error;
    }

    // Extract booked slot hours
    const bookedHours = new Set(bookedSlotRows?.map((slot: any) => slot.slot_hour) || []);

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
