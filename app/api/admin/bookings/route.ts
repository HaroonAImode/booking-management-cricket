/**
 * Bookings API Route
 * GET /api/admin/bookings - List all bookings with full details
 * POST /api/admin/bookings - Create manual booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';

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

    // Validate required fields
    if (!customerName || !customerPhone || !bookingDate || !slots || slots.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate advance payment
    if (advancePayment < 0 || advancePayment > totalAmount) {
      return NextResponse.json(
        { error: 'Advance payment must be between 0 and total amount' },
        { status: 400 }
      );
    }

    // Always create a new customer for every booking, even if name/phone matches existing records
    let customerId = null;
    const { data: newCustomer, error: createCustomerError } = await supabase
      .from('customers')
      .insert([{ name: customerName, phone: customerPhone }])
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

    // Format slots for RPC function
    const formattedSlots = slots.map((slot: any) => ({
      slot_hour: slot.hour,
      slot_time: `${String(slot.hour).padStart(2, '0')}:00:00`,
      is_night_rate: slot.isNightRate,
      hourly_rate: slot.rate,
    }));

    // Call create booking function
    const { data, error } = await supabase.rpc('create_booking_with_slots', {
      p_customer_id: customerId,
      p_booking_date: bookingDate,
      p_total_hours: slots.length,
      p_total_amount: totalAmount,
      p_advance_payment: advancePayment || 0,
      p_advance_payment_method: advancePaymentMethod || 'cash',
      p_advance_payment_proof: advancePaymentProof || 'manual-booking-no-proof',
      p_slots: formattedSlots,
      p_customer_notes: notes || null,
    });

    let bookingResult = data;
    if (typeof bookingResult === 'string') bookingResult = JSON.parse(bookingResult);
    if (Array.isArray(bookingResult)) bookingResult = bookingResult[0];

    if (!bookingResult || !bookingResult.success) {
      console.error('Booking creation failed:', { result: bookingResult, error, body });
      return NextResponse.json(
        { error: (bookingResult && bookingResult.error_message) || error?.message || 'Failed to create booking' },
        { status: 400 }
      );
    }

    // Auto-approve if requested
    if (autoApprove) {
      const { error: approveError } = await supabase.rpc('approve_booking', {
        p_booking_id: bookingResult.booking_id,
        p_admin_notes: `Manual booking created by ${adminProfile.full_name}`,
      });

      if (approveError) {
        console.error('Auto-approve error:', approveError);
        // Don't fail the whole booking if auto-approve fails
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: bookingResult.booking_id,
      bookingNumber: bookingResult.booking_number,
      message: `Booking created successfully${autoApprove ? ' and auto-approved' : ''}`,
      createdBy: adminProfile.full_name,
    });
  } catch (error: any) {
    console.error('Create booking error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});