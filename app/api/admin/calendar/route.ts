/**
 * Calendar API Routes
 * GET /api/admin/calendar - Get calendar events
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';
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

    // Transform bookings to calendar events with proper start and end times
    const events = (bookings || []).map((booking: any) => {
      // Get slot hours array
      const slotHours = booking.slot_hours || [];
      
      // Sort slots and get first and last
      const sortedSlots = [...slotHours].sort((a: number, b: number) => a - b);
      const firstSlot = sortedSlots[0] || 8; // Default to 8 AM if no slots
      const lastSlot = sortedSlots[sortedSlots.length - 1] || 9; // Default to 9 AM if no slots
      
      // Format slot ranges for display
      const slotRanges = formatSlotRanges(sortedSlots);
      
      // Check if it's a night rate booking
      const hasNightRate = sortedSlots.some((slot: number) => slot >= 19 || slot < 6);
      
      // Calculate start and end times
      const startHour = String(firstSlot).padStart(2, '0');
      const endHour = String(lastSlot + 1).padStart(2, '0'); // Add 1 hour for end time
      
      return {
        id: booking.booking_id,
        bookingId: booking.booking_id,
        title: `${booking.customer_name} - ${slotRanges}`,
        start: `${booking.booking_date}T${startHour}:00:00`,
        end: `${booking.booking_date}T${endHour}:00:00`,
        backgroundColor: getStatusColor(booking.status),
        borderColor: getStatusColor(booking.status),
        textColor: '#ffffff',
        extendedProps: {
          bookingId: booking.booking_id,
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
          slotRanges: slotRanges,
          nightRate: hasNightRate,
          isNightRate: hasNightRate,
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