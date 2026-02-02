import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';

// GET single booking by ID
export const GET = withAdminAuth(async (
  request: NextRequest,
  { params, adminProfile }: { params: Promise<{ id: string }>, adminProfile: any }
) => {
  try {
    const resolvedParams = await params;
    const bookingId = resolvedParams.id;
    
    const supabase = await createClient();

    // Fetch booking with customer
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Fetch slots separately (from booking_slots table)
    const { data: bookingSlots, error: slotsError } = await supabase
      .from('booking_slots')
      .select('*')
      .eq('booking_id', bookingId);

    if (slotsError) {
      console.error('Error fetching slots:', slotsError);
    }

    // Fetch extra charges separately (from extra_charges table)
    const { data: bookingExtraCharges, error: chargesError } = await supabase
      .from('extra_charges')
      .select('*')
      .eq('booking_id', bookingId);

    if (chargesError) {
      console.error('Error fetching extra charges:', chargesError);
    }

    const totalExtraCharges = (bookingExtraCharges || []).reduce((sum, charge) => sum + (charge.amount || 0), 0);

    const formattedBooking = {
      id: booking.id,
      booking_number: booking.booking_number,
      booking_date: booking.booking_date,
      total_hours: booking.total_hours,
      total_amount: booking.total_amount,
      advance_payment: booking.advance_payment,
      remaining_payment: booking.remaining_payment,
      advance_payment_method: booking.advance_payment_method,
      advance_payment_proof: booking.advance_payment_proof,
      remaining_payment_proof: booking.remaining_payment_proof,
      remaining_payment_method: booking.remaining_payment_method,
      remaining_payment_amount: booking.remaining_payment_amount,
      discount_amount: booking.discount_amount,
      status: booking.status,
      created_at: booking.created_at,
      customer: booking.customer || { name: '', phone: '', email: '' },
      slots: bookingSlots || [],
      extra_charges: bookingExtraCharges || [],
      total_extra_charges: totalExtraCharges,
    };

    return NextResponse.json({
      success: true,
      booking: formattedBooking,
    });
  } catch (error: any) {
    console.error('Get booking error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});