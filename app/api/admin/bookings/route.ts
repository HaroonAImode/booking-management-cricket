/**
 * Admin Bookings API Route
 * 
 * GET: Fetch bookings with filters for admin dashboard
 * DELETE: Delete booking by ID (from query param)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';

// GET handler for fetching bookings
async function GETHandler(
  request: NextRequest,
  { adminProfile }: { adminProfile: any }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const status = searchParams.get('status') || 'all';
    const paymentStatus = searchParams.get('paymentStatus') || 'all';
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const remainingOnly = searchParams.get('remainingOnly') === 'true';

    // Build query
    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        slots(*),
        extra_charges(*)
      `)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply payment status filter (admin only)
    if (adminProfile.role === 'admin' && paymentStatus !== 'all') {
      if (paymentStatus === 'paid') {
        query = query.or('remaining_payment.eq.0,remaining_payment.is.null');
      } else if (paymentStatus === 'pending') {
        query = query.gt('remaining_payment', 0);
      }
    }

    // Apply search filter
    if (search) {
      query = query.or(`booking_number.ilike.%${search}%,customers(name).ilike.%${search}%,customers(phone).ilike.%${search}%`);
    }

    // Apply date range filter
    if (dateFrom) {
      query = query.gte('booking_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('booking_date', dateTo);
    }

    // For ground managers: only show approved bookings with remaining payment
    if (adminProfile.role === 'ground_manager' || remainingOnly) {
      query = query.eq('status', 'approved').gt('remaining_payment', 0);
    }

    // Execute query
    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const summary = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      approved: bookings.filter(b => b.status === 'approved').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
      totalExtraCharges: bookings.reduce((sum, b) => {
        const extraCharges = Array.isArray(b.extra_charges) ? b.extra_charges : [];
        return sum + extraCharges.reduce((sum2, ec) => sum2 + (ec.amount || 0), 0);
      }, 0),
      totalDiscount: bookings.reduce((sum, b) => sum + (b.discount_amount || 0), 0),
    };

    // Format bookings for response
    const formattedBookings = bookings.map(booking => {
      // Calculate total extra charges
      const extraCharges = Array.isArray(booking.extra_charges) ? booking.extra_charges : [];
      const totalExtraCharges = extraCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);

      return {
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
    });

    return NextResponse.json({
      success: true,
      bookings: formattedBookings,
      summary,
    });
  } catch (error: any) {
    console.error('Error in bookings API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE handler for deleting bookings by ID
async function DELETEHandler(
  request: NextRequest,
  { adminProfile }: { adminProfile: any }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('id');
    
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Only admins can delete bookings
    if (adminProfile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can delete bookings' },
        { status: 403 }
      );
    }

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

    // Delete extra charges first
    await supabase
      .from('extra_charges')
      .delete()
      .eq('booking_id', bookingId);

    // Delete slots
    await supabase
      .from('slots')
      .delete()
      .eq('booking_id', bookingId);

    // Delete booking
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (deleteError) {
      console.error('Delete booking error:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
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
      message: `Booking #${booking.booking_number} deleted successfully`,
      bookingNumber: booking.booking_number,
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export both GET and DELETE methods
export const GET = withAdminAuth(GETHandler);
export const DELETE = withAdminAuth(DELETEHandler);