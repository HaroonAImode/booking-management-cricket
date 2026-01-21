import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const supabase = await createClient();

    // Check if booking exists
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('booking_number, customer_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Delete booking slots first (foreign key constraint)
    const { error: slotsError } = await supabase
      .from('booking_slots')
      .delete()
      .eq('booking_id', bookingId);

    if (slotsError) {
      console.error('Error deleting slots:', slotsError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete booking slots' },
        { status: 500 }
      );
    }

    // Delete the booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (bookingError) {
      console.error('Error deleting booking:', bookingError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete booking' },
        { status: 500 }
      );
    }

    // Optional: Delete customer if they have no other bookings
    const { data: otherBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('customer_id', booking.customer_id);

    if (!otherBookings || otherBookings.length === 0) {
      await supabase
        .from('customers')
        .delete()
        .eq('id', booking.customer_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully',
      bookingNumber: booking.booking_number,
    });
  } catch (error: any) {
    console.error('Delete booking error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
