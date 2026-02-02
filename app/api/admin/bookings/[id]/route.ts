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

    // Fetch booking with all related data
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        slots(*),
        extra_charges(*)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Calculate total extra charges
    const extraCharges = Array.isArray(booking.extra_charges) ? booking.extra_charges : [];
    const totalExtraCharges = extraCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);

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
      slots: Array.isArray(booking.slots) ? booking.slots : [],
      extra_charges: extraCharges,
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