/**
 * Bookings API Route
 * GET /api/admin/bookings - List all bookings with full details
 * POST /api/admin/bookings - Create manual booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export const GET = withAdminAuth(async (request, { adminProfile }) => {
  try {
    const supabase = await createClient();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const remainingOnly = searchParams.get('remainingOnly') === 'true';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query with all relations
    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        slots:booking_slots(*)
      `, { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    // Ground managers only see approved bookings with remaining payment > 0
    if (remainingOnly) {
      query = query.gt('remaining_payment', 0).eq('status', 'approved');
    } else {
      // Filter by booking status (only for admins)
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Filter by payment status (only for admins)
      if (paymentStatus === 'paid') {
        query = query.eq('remaining_payment', 0);
      } else if (paymentStatus === 'pending') {
        query = query.gt('remaining_payment', 0);
      }
    }

    // Search by booking number, customer name, or phone
    if (search) {
      query = query.or(`booking_number.ilike.%${search}%,customer.name.ilike.%${search}%,customer.phone.ilike.%${search}%`);
    }

    // Filter by date range
    if (dateFrom) {
      query = query.gte('booking_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('booking_date', dateTo);
    }

    const { data: bookings, error, count } = await query;

    if (error) {
      console.error('Fetch bookings error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const summary = {
      total: count || 0,
      pending: bookings?.filter(b => b.status === 'pending').length || 0,
      approved: bookings?.filter(b => b.status === 'approved').length || 0,
      completed: bookings?.filter(b => b.status === 'completed').length || 0,
      cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
      fullyPaid: bookings?.filter(b => b.remaining_payment === 0).length || 0,
      partiallyPaid: bookings?.filter(b => b.remaining_payment > 0).length || 0,
    };

    return NextResponse.json({
      success: true,
      bookings,
      summary,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0),
      },
      adminRole: adminProfile.role,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Create manual booking (Admin only)
export const POST = withAdminAuth(async (request, { adminProfile }) => {
  try {
    // Only admins can create manual bookings
    if (adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can create manual bookings' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();

    const {
      customerName,
      customerPhone,
      bookingDate,
      slots,
      totalAmount,
      advancePayment,
      advancePaymentMethod,
      advancePaymentProof,
      notes,
      autoApprove,
    } = body;

    // 1. VALIDATE INPUT
    if (!customerName || !customerPhone || !bookingDate || !slots || slots.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: Customer name, phone, booking date, and at least one slot are required' },
        { status: 400 }
      );
    }
    if (advancePayment < 0 || advancePayment > totalAmount) {
      return NextResponse.json(
        { error: 'Advance payment must be between 0 and total amount' },
        { status: 400 }
      );
    }

    // 2. CREATE OR FIND CUSTOMER
    let customerId;
    // Check if a customer with this phone already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', customerPhone)
      .maybeSingle(); // Use maybeSingle to handle no rows found

    if (existingCustomer) {
      // Use existing customer
      customerId = existingCustomer.id;
      // Update customer name if it's different
      await supabase
        .from('customers')
        .update({ name: customerName })
        .eq('id', customerId);
    } else {
      // Create a new customer
      const { data: newCustomer, error: createCustomerError } = await supabase
        .from('customers')
        .insert([{ 
          name: customerName, 
          phone: customerPhone 
        }])
        .select('id')
        .single();
      
      if (createCustomerError || !newCustomer) {
        console.error('Create customer error:', createCustomerError);
        return NextResponse.json(
          { error: 'Failed to create new customer' },
          { status: 500 }
        );
      }
      customerId = newCustomer.id;
    }

    // 3. GENERATE BOOKING DETAILS
    const bookingId = uuidv4();
    const bookingNumber = `PPCA${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const status = autoApprove ? 'approved' : 'pending';
    const remainingPayment = totalAmount - advancePayment;
    const pendingExpiresAt = autoApprove ? null : new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // 4. CREATE THE BOOKING
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        booking_number: bookingNumber,
        customer_id: customerId,
        booking_date: bookingDate,
        total_hours: slots.length,
        total_amount: totalAmount,
        advance_payment: advancePayment,
        advance_payment_method: advancePaymentMethod,
        advance_payment_proof: advancePaymentProof || null,
        remaining_payment_amount: remainingPayment,
        notes: notes || null,
        status: status,
        pending_expires_at: pendingExpiresAt,
        is_manual_booking: true,
        created_by_admin: true,
      })
      .select('id, booking_number')
      .single();

    if (bookingError) {
      console.error('Create booking error:', bookingError);
      return NextResponse.json(
        { error: `Failed to create booking: ${bookingError.message}` },
        { status: 500 }
      );
    }

    // 5. CREATE BOOKING SLOTS
    const slotRecords = slots.map((slot: any) => ({
      booking_id: bookingId,
      slot_hour: slot.hour,
      is_night_rate: slot.isNightRate,
      hourly_rate: slot.rate,
    }));

    const { error: slotsError } = await supabase
      .from('booking_slots')
      .insert(slotRecords);

    if (slotsError) {
      console.error('Create slots error:', slotsError);
      // Attempt to delete the booking to maintain data integrity
      await supabase.from('bookings').delete().eq('id', bookingId);
      return NextResponse.json(
        { error: `Failed to create booking slots: ${slotsError.message}` },
        { status: 500 }
      );
    }

    // 6. SUCCESS RESPONSE
    return NextResponse.json({
      success: true,
      bookingId: bookingId,
      bookingNumber: booking.booking_number,
      message: `Booking ${booking.booking_number} created successfully${autoApprove ? ' and auto-approved' : ''}.`,
      createdBy: adminProfile.full_name,
    });

  } catch (error: any) {
    console.error('Create booking API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});