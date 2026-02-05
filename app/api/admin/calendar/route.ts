/**
 * Calendar API Routes
 * GET /api/admin/calendar - Get calendar events
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';

// Helper function to format slot ranges
function formatSlotRanges(slots: number[]): string {
  if (!slots || slots.length === 0) return 'No slots';
  
  const sortedSlots = [...slots].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sortedSlots[0];
  let end = sortedSlots[0];
  
  for (let i = 1; i < sortedSlots.length; i++) {
    if (sortedSlots[i] === end + 1) {
      end = sortedSlots[i];
    } else {
      ranges.push(start === end ? formatTime(start) : `${formatTime(start)} - ${formatTime(end + 1)}`);
      start = sortedSlots[i];
      end = sortedSlots[i];
    }
  }
  
  ranges.push(start === end ? formatTime(start) : `${formatTime(start)} - ${formatTime(end + 1)}`);
  return ranges.join(', ');
}

function formatTime(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
}

// GET /api/admin/calendar - Fetch calendar bookings
export const GET = withAdminAuth(async (request, { adminProfile }) => {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('start') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('end') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const status = searchParams.get('status') || null;

    console.log('📅 Fetching calendar bookings:', { startDate, endDate, status });

    // Use direct query with JOIN to get customer details
    const { data: bookings, error } = await supabase
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
        customer_notes,
        admin_notes,
        customers!customer_id (
          name,
          phone
        ),
        booking_slots(slot_hour)
      `)
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .order('booking_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Calendar bookings fetch error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch calendar data', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Raw bookings fetched:', bookings?.length || 0);

    // Transform bookings to calendar events
    const events = (bookings || []).map((booking: any) => {
      // Extract slot hours from booking_slots
      const slotHours = (booking.booking_slots || []).map((slot: any) => slot.slot_hour).sort((a: number, b: number) => a - b);
      
      // Get customer details from joined table
      const customerName = booking.customers?.name || 'Unknown Customer';
      const customerPhone = booking.customers?.phone || '';
      
      // Get first and last slot
      const firstSlot = slotHours.length > 0 ? slotHours[0] : 8;
      const lastSlot = slotHours.length > 0 ? slotHours[slotHours.length - 1] : 9;
      
      // Format slot ranges
      const slotRanges = formatSlotRanges(slotHours);
      
      // Check if it's a night rate booking (after 7 PM or before 7 AM)
      const hasNightRate = slotHours.some((slot: number) => slot >= 19 || slot < 7);
      
      // Calculate start and end times
      const startHour = String(firstSlot).padStart(2, '0');
      const endHour = String(lastSlot + 1).padStart(2, '0');
      
      return {
        id: booking.id,
        bookingId: booking.id,
        title: `${customerName} - ${slotRanges}`,
        start: `${booking.booking_date}T${startHour}:00:00`,
        end: `${booking.booking_date}T${endHour}:00:00`,
        backgroundColor: getStatusColor(booking.status),
        borderColor: getStatusColor(booking.status),
        textColor: '#ffffff',
        extendedProps: {
          bookingId: booking.id,
          bookingNumber: booking.booking_number,
          customerName: customerName,
          customerPhone: customerPhone,
          status: booking.status,
          totalHours: booking.total_hours,
          totalAmount: booking.total_amount,
          advancePayment: booking.advance_payment,
          remainingPayment: booking.remaining_payment,
          createdAt: booking.created_at,
          customerNotes: booking.customer_notes,
          adminNotes: booking.admin_notes,
          slotRanges: slotRanges,
          slotHours: slotHours,
          nightRate: hasNightRate,
          isNightRate: hasNightRate,
        },
      };
    });

    console.log('📅 Events processed:', events.length);

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
      filters: { startDate, endDate, status },
    });
  } catch (error: any) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
});

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#fd7e14'; // Orange
    case 'confirmed':
      return '#40c057'; // Green
    case 'completed':
      return '#228be6'; // Blue
    case 'cancelled':
      return '#fa5252'; // Red
    default:
      return '#868e96'; // Gray
  }
}