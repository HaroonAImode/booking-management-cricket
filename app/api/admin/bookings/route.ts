/**
 * Admin Bookings API Route
 * 
 * GET: Fetch bookings with filters for admin dashboard
 * POST: Create a new booking (admin manual booking)
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

    // Build query - FIRST fetch bookings with customers
    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*)
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
      query = query.or(`
        booking_number.ilike.%${search}%,
        customers(name).ilike.%${search}%,
        customers(phone).ilike.%${search}%
      `);
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

    // Execute booking query
    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { success: false, error: bookingsError.message },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        bookings: [],
        summary: {
          total: 0,
          pending: 0,
          approved: 0,
          completed: 0,
          cancelled: 0,
          totalRevenue: 0,
          totalExtraCharges: 0,
          totalDiscount: 0,
        }
      });
    }

    // Get booking IDs for fetching related data
    const bookingIds = bookings.map(b => b.id);

    // Fetch slots from booking_slots table
    const { data: allSlots, error: slotsError } = await supabase
      .from('booking_slots')  // CHANGED: using correct table name
      .select('*')
      .in('booking_id', bookingIds);

    if (slotsError) {
      console.error('Error fetching slots:', slotsError);
    }

    // Fetch extra charges from extra_charges table
    const { data: allExtraCharges, error: extraChargesError } = await supabase
      .from('extra_charges')  // CHANGED: using correct table name
      .select('*')
      .in('booking_id', bookingIds);

    if (extraChargesError) {
      console.error('Error fetching extra charges:', extraChargesError);
    }

    // Organize slots and extra charges by booking ID
    const slotsByBookingId: Record<string, any[]> = {};
    if (allSlots) {
      allSlots.forEach(slot => {
        if (!slotsByBookingId[slot.booking_id]) {
          slotsByBookingId[slot.booking_id] = [];
        }
        slotsByBookingId[slot.booking_id].push(slot);
      });
    }

    const extraChargesByBookingId: Record<string, any[]> = {};
    if (allExtraCharges) {
      allExtraCharges.forEach(charge => {
        if (!extraChargesByBookingId[charge.booking_id]) {
          extraChargesByBookingId[charge.booking_id] = [];
        }
        extraChargesByBookingId[charge.booking_id].push(charge);
      });
    }

    // Format bookings with related data
    const formattedBookings = bookings.map(booking => {
      const bookingSlots = slotsByBookingId[booking.id] || [];
      const bookingExtraCharges = extraChargesByBookingId[booking.id] || [];
      const totalExtraCharges = bookingExtraCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);

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
        slots: bookingSlots,
        extra_charges: bookingExtraCharges,
        total_extra_charges: totalExtraCharges,
      };
    });

    // Calculate summary statistics
    const summary = {
      total: formattedBookings.length,
      pending: formattedBookings.filter(b => b.status === 'pending').length,
      approved: formattedBookings.filter(b => b.status === 'approved').length,
      completed: formattedBookings.filter(b => b.status === 'completed').length,
      cancelled: formattedBookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: formattedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
      totalExtraCharges: formattedBookings.reduce((sum, b) => {
        const extraCharges = Array.isArray(b.extra_charges) ? b.extra_charges : [];
        return sum + extraCharges.reduce((sum2, ec) => sum2 + (ec.amount || 0), 0);
      }, 0),
      totalDiscount: formattedBookings.reduce((sum, b) => sum + (b.discount_amount || 0), 0),
    };

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

// POST handler for creating a new booking (admin manual booking)
async function POSTHandler(
  request: NextRequest,
  { adminProfile }: { adminProfile: any }
) {
  try {
    const supabase = await createClient();
    
    // Parse request body
    const body = await request.json();
    
    const {
      customerName,
      customerPhone,
      customerEmail,
      bookingDate,
      slots,
      totalHours,
      totalAmount,
      advancePayment,
      advancePaymentMethod,
      advancePaymentProof,
      adminNotes
    } = body;

    // Validate required fields
    if (!customerName || !customerPhone || !bookingDate || !slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer name, phone, booking date, and at least one slot are required' },
        { status: 400 }
      );
    }

    if (!totalHours || totalHours <= 0) {
      return NextResponse.json(
        { success: false, error: 'Total hours must be greater than 0' },
        { status: 400 }
      );
    }

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Total amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate advance payment
    if (advancePayment && advancePayment > totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Advance payment cannot exceed total amount' },
        { status: 400 }
      );
    }

    // Validate slots
    for (const slot of slots) {
      if (!slot.slotDate || !slot.slotTime || !slot.slotHour || slot.hourlyRate === undefined) {
        return NextResponse.json(
          { success: false, error: 'Each slot must have date, time, hour, and hourly rate' },
          { status: 400 }
        );
      }
    }

    // Check if slots are available
    for (const slot of slots) {
      const { data: existingSlot, error: slotCheckError } = await supabase
        .from('booking_slots')
        .select('id')
        .eq('slot_date', slot.slotDate)
        .eq('slot_time', slot.slotTime)
        .eq('slot_hour', slot.slotHour)
        .eq('status', 'booked')
        .single();

      if (existingSlot && !slotCheckError) {
        return NextResponse.json(
          { success: false, error: `Slot ${slot.slotTime} on ${slot.slotDate} is already booked` },
          { status: 400 }
        );
      }
    }

    // Start transaction
    let bookingId: string | null = null;
    
    try {
      // Step 1: Create or find customer
      let customerId: string;
      
      // Check if customer already exists by phone
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerPhone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        
        // Update customer details if provided
        await supabase
          .from('customers')
          .update({
            name: customerName,
            email: customerEmail || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', customerId);
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customerName,
            phone: customerPhone,
            email: customerEmail || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (customerError || !newCustomer) {
          throw new Error(customerError?.message || 'Failed to create customer');
        }
        
        customerId = newCustomer.id;
      }

      // Step 2: Generate booking number
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const { data: todayBookings } = await supabase
        .from('bookings')
        .select('id')
        .gte('created_at', `${today.toISOString().split('T')[0]}T00:00:00`)
        .lt('created_at', `${today.toISOString().split('T')[0]}T23:59:59`);

      const sequenceNumber = (todayBookings?.length || 0) + 1;
      const bookingNumber = `BK-${dateStr}-${sequenceNumber.toString().padStart(3, '0')}`;

      // Step 3: Create booking
      const remainingPayment = totalAmount - (advancePayment || 0);
      
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_number: bookingNumber,
          booking_date: bookingDate,
          total_hours: totalHours,
          total_amount: totalAmount,
          advance_payment: advancePayment || 0,
          remaining_payment: remainingPayment,
          advance_payment_method: advancePaymentMethod || null,
          advance_payment_proof: advancePaymentProof || null,
          status: 'approved', // Admin bookings are auto-approved
          customer_id: customerId,
          created_by: adminProfile.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .select('id')
        .single();

      if (bookingError || !newBooking) {
        throw new Error(bookingError?.message || 'Failed to create booking');
      }
      
      bookingId = newBooking.id;

      // Step 4: Create booking slots
      const slotPromises = slots.map((slot: any) => 
        supabase.from('booking_slots').insert({
          booking_id: bookingId,
          slot_date: slot.slotDate,
          slot_time: slot.slotTime,
          slot_hour: slot.slotHour,
          is_night_rate: slot.isNightRate || false,
          hourly_rate: slot.hourlyRate || 0,
          status: 'booked',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      );

      await Promise.all(slotPromises);

      // Step 5: Create notification for admin
      await supabase.from('notifications').insert({
        customer_id: customerId,
        notification_type: 'booking_created',
        title: 'New Booking Created',
        message: `Admin created booking ${bookingNumber} for ${customerName}`,
        booking_id: bookingId,
        priority: 'normal',
        created_at: new Date().toISOString()
      });

      // Step 6: Fetch created booking with details
      const { data: createdBooking } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(*),
          slots:booking_slots(*)
        `)
        .eq('id', bookingId)
        .single();

      return NextResponse.json({
        success: true,
        message: 'Booking created successfully',
        booking: createdBooking,
        bookingNumber,
      });
      
    } catch (error: any) {
      // Rollback: If booking was partially created, try to delete it
      if (bookingId) {
        await supabase.from('booking_slots').delete().eq('booking_id', bookingId);
        await supabase.from('bookings').delete().eq('id', bookingId);
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error('Create booking error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create booking' },
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

    // Delete extra charges first (from extra_charges table)
    await supabase
      .from('extra_charges')  // CHANGED: using correct table name
      .delete()
      .eq('booking_id', bookingId);

    // Delete slots (from booking_slots table)
    await supabase
      .from('booking_slots')  // CHANGED: using correct table name
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

// Export GET, POST, and DELETE methods
export const GET = withAdminAuth(GETHandler);
export const POST = withAdminAuth(POSTHandler);
export const DELETE = withAdminAuth(DELETEHandler);