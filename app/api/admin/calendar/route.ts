/**
 * Calendar API Routes
 * GET /api/admin/calendar - Get calendar events
 * GET /api/admin/calendar/[id] - Get booking details
 * PATCH /api/admin/calendar/[id]/approve - Approve booking
 * PATCH /api/admin/calendar/[id]/reject - Reject booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { formatSlotRanges } from '@/lib/supabase/bookings';

// GET /api/admin/calendar - Fetch calendar bookings
export const GET = withAdminAuth(async (request, { adminProfile }) => {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('start') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('end') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const status = searchParams.get('status') || null;

    // Call calendar bookings function
    const { data: bookings, error } = await supabase.rpc('get_calendar_bookings', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_status: status,
    });

    if (error) {
      console.error('Calendar bookings fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar data' },
        { status: 500 }
      );
    }


    // Use new slot_hours array from SQL, no grouping needed
    const events = (bookings || []).map((booking: any) => {
      const sortedSlots = [...booking.slot_hours].sort((a, b) => a - b);
      const firstSlot = sortedSlots[0];
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      const slotRanges = formatSlotRanges(sortedSlots);
      return {
        id: booking.booking_id,
        bookingId: booking.booking_id,
        title: `${booking.customer_name} - ${slotRanges}`,
        start: `${booking.booking_date}T${String(firstSlot).padStart(2, '0')}:00:00`,
        end: `${booking.booking_date}T${String(lastSlot + 1).padStart(2, '0')}:00:00`,
        backgroundColor: getStatusColor(booking.status),
        borderColor: getStatusColor(booking.status),
        extendedProps: {
          bookingNumber: booking.booking_number,
          customerName: booking.customer_name,
          customerPhone: booking.customer_phone,
          status: booking.status,
          totalHours: booking.total_hours,
          totalAmount: booking.total_amount,
          advancePayment: booking.advance_payment,
          remainingPayment: booking.remaining_payment,
          createdAt: booking.created_at,
          pendingExpiresAt: booking.pending_expires_at,
          customerNotes: booking.customer_notes,
          adminNotes: booking.admin_notes,
        },
      };
    });

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
      filters: { startDate, endDate, status },
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#fd7e14'; // Orange
    case 'approved':
      return '#40c057'; // Green
    case 'completed':
      return '#228be6'; // Blue
    case 'cancelled':
      return '#fa5252'; // Red
    default:
      return '#868e96'; // Gray
  }
}
