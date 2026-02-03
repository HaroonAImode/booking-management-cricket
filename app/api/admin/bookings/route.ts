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
      .from('booking_slots')
      .select('*')
      .in('booking_id', bookingIds);

    if (slotsError) {
      console.error('Error fetching slots:', slotsError);
    }

    // Fetch extra charges from extra_charges table
    const { data: allExtraCharges, error: extraChargesError } = await supabase
      .from('extra_charges')
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
        customer: booking.customer || { name: '', phone: '' },
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
    
    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
      console.log('=== FULL REQUEST BODY ===');
      console.log(JSON.stringify(body, null, 2));
      console.log('=== END REQUEST BODY ===');
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const {
      customerName,
      customerPhone,
      bookingDate,
      slots,
      totalHours,
      totalAmount,
      advancePayment = 0,
      advancePaymentMethod,
      advancePaymentProof,
      adminNotes,
      autoApprove = true
    } = body;

    console.log('=== PARSED FIELDS ===');
    console.log({
      customerName,
      customerPhone,
      bookingDate,
      slotsCount: slots?.length,
      totalHours,
      totalAmount,
      advancePayment,
      advancePaymentMethod,
      hasAdminNotes: !!adminNotes,
      autoApprove
    });
    console.log('=== END PARSED FIELDS ===');

    // Log each slot for debugging
    if (slots && Array.isArray(slots)) {
      console.log('=== SLOTS DATA RECEIVED ===');
      slots.forEach((slot, index) => {
        console.log(`Slot ${index}:`, {
          slotDate: slot.slotDate,
          slotTime: slot.slotTime,
          slotHour: slot.slotHour,
          hourlyRate: slot.hourlyRate,
          rate: slot.rate,
          isNightRate: slot.isNightRate,
          is_night_rate: slot.is_night_rate,
          hour: slot.hour,
          fullSlot: JSON.stringify(slot)
        });
      });
      console.log('=== END SLOTS DEBUG ===');
    }

    // Validate required fields
    if (!customerName || !customerPhone || !bookingDate) {
      return NextResponse.json(
        { success: false, error: 'Customer name, phone, and booking date are required' },
        { status: 400 }
      );
    }

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one time slot is required' },
        { status: 400 }
      );
    }

    // Validate slots with better error messages AND fix format issues
    const validatedSlots: any[] = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      console.log(`Validating slot ${i}:`, JSON.stringify(slot));
      
      // Handle different slot formats
      let slotDate, slotTime, slotHour, hourlyRate, isNightRate;
      
      // Format 1: New format with slotDate, slotTime, slotHour
      if (slot.slotDate && slot.slotTime && slot.slotHour !== undefined) {
        slotDate = slot.slotDate;
        slotTime = slot.slotTime;
        slotHour = slot.slotHour;
        hourlyRate = slot.hourlyRate !== undefined ? slot.hourlyRate : (slot.rate !== undefined ? slot.rate : 0);
        isNightRate = slot.isNightRate !== undefined ? slot.isNightRate : 
                     (slot.is_night_rate !== undefined ? slot.is_night_rate : false);
      }
      // Format 2: Old format with just hour, isNightRate, rate
      else if (slot.hour !== undefined) {
        console.log('Detected old slot format, converting...');
        slotDate = bookingDate; // Use the main booking date
        slotHour = slot.hour;
        slotTime = `${String(slotHour).padStart(2, '0')}:00:00`;
        hourlyRate = slot.rate !== undefined ? slot.rate : (slot.hourlyRate !== undefined ? slot.hourlyRate : 0);
        isNightRate = slot.isNightRate !== undefined ? slot.isNightRate : 
                     (slot.is_night_rate !== undefined ? slot.is_night_rate : false);
      }
      // Invalid format
      else {
        console.error('Slot validation failed - invalid format:', slot);
        return NextResponse.json(
          { 
            success: false, 
            error: `Slot ${i} has invalid format. Expected: slotDate, slotTime, slotHour OR hour. Received: ${JSON.stringify(slot)}` 
          },
          { status: 400 }
        );
      }
      
      // Final validation
      if (!slotDate || !slotTime || slotHour === undefined) {
        console.error('Slot validation failed:', {
          hasDate: !!slotDate,
          hasTime: !!slotTime,
          hasHour: slotHour !== undefined,
          slot: slot
        });
        return NextResponse.json(
          { success: false, error: `Slot ${i} must have date, time, and hour. Received: ${JSON.stringify(slot)}` },
          { status: 400 }
        );
      }
      
      // Set defaults if not provided
      if (hourlyRate === undefined) {
        hourlyRate = 0;
      }
      if (isNightRate === undefined) {
        isNightRate = false;
      }
      
      validatedSlots.push({
        slotDate,
        slotTime,
        slotHour,
        hourlyRate,
        isNightRate,
        is_night_rate: isNightRate // Add both for compatibility
      });
    }

    console.log('=== VALIDATED SLOTS ===');
    console.log(JSON.stringify(validatedSlots, null, 2));
    console.log('=== END VALIDATED SLOTS ===');

    // Use validated slots
    const finalSlots = validatedSlots;

    // Validate totalHours - calculate from slots if not provided
    let calculatedTotalHours = totalHours;
    if (!calculatedTotalHours || calculatedTotalHours <= 0) {
      calculatedTotalHours = finalSlots.length;
      console.log('Calculated total hours from slots:', calculatedTotalHours);
    }

    if (calculatedTotalHours <= 0) {
      return NextResponse.json(
        { success: false, error: 'Total hours must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate totalAmount - calculate from slots if not provided
    let calculatedTotalAmount = totalAmount;
    if (!calculatedTotalAmount || calculatedTotalAmount <= 0) {
      calculatedTotalAmount = finalSlots.reduce((sum: number, slot: any) => {
        return sum + (slot.hourlyRate || 0);
      }, 0);
      console.log('Calculated total amount from slots:', calculatedTotalAmount);
    }

    if (calculatedTotalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Total amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate advance payment
    const finalAdvancePayment = advancePayment || 0;
    if (finalAdvancePayment > calculatedTotalAmount) {
      return NextResponse.json(
        { success: false, error: 'Advance payment cannot exceed total amount' },
        { status: 400 }
      );
    }

    // Check if slots are available
    for (const slot of finalSlots) {
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
        
        // Update customer name if provided
        await supabase
          .from('customers')
          .update({
            name: customerName,
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (customerError || !newCustomer) {
          console.error('Customer creation error:', customerError);
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

      // Step 3: Create booking (without created_by column)
      const remainingPayment = calculatedTotalAmount - finalAdvancePayment;
      
      const bookingData: any = {
        booking_number: bookingNumber,
        booking_date: bookingDate,
        total_hours: calculatedTotalHours,
        total_amount: calculatedTotalAmount,
        advance_payment: finalAdvancePayment,
        remaining_payment: remainingPayment,
        advance_payment_method: advancePaymentMethod || null,
        advance_payment_proof: advancePaymentProof || null,
        status: autoApprove ? 'approved' : 'pending',
        customer_id: customerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Only add admin_notes if provided
      if (adminNotes) {
        bookingData.admin_notes = adminNotes;
      }

      console.log('Creating booking with data:', bookingData);

      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select('id')
        .single();

      if (bookingError || !newBooking) {
        console.error('Booking creation error:', bookingError);
        throw new Error(bookingError?.message || 'Failed to create booking');
      }
      
      bookingId = newBooking.id;
      console.log('Booking created with ID:', bookingId);

      // Step 4: Create booking slots with proper field mapping
      const slotPromises = finalSlots.map((slot: any) => {
        // Use isNightRate if available, otherwise is_night_rate, otherwise false
        const isNightRate = slot.isNightRate !== undefined ? slot.isNightRate : 
                           (slot.is_night_rate !== undefined ? slot.is_night_rate : false);
        
        // Use hourlyRate if available, otherwise rate, otherwise 0
        const hourlyRate = slot.hourlyRate !== undefined ? slot.hourlyRate :
                          (slot.rate !== undefined ? slot.rate : 0);
        
        console.log('Creating slot with:', {
          booking_id: bookingId,
          slot_date: slot.slotDate,
          slot_time: slot.slotTime,
          slot_hour: slot.slotHour,
          is_night_rate: isNightRate,
          hourly_rate: hourlyRate
        });
        
        return supabase.from('booking_slots').insert({
          booking_id: bookingId,
          slot_date: slot.slotDate,
          slot_time: slot.slotTime,
          slot_hour: slot.slotHour,
          is_night_rate: isNightRate,
          hourly_rate: hourlyRate,
          status: 'booked',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });

      const slotResults = await Promise.all(slotPromises);
      console.log('Slots created:', slotResults.length);

      // Step 5: Create notification for admin (only if notifications table exists)
      try {
        const { error: notificationError } = await supabase.from('notifications').insert({
          customer_id: customerId,
          notification_type: 'booking_created',
          title: 'New Booking Created',
          message: `Admin created booking ${bookingNumber} for ${customerName}`,
          booking_id: bookingId,
          priority: 'normal',
          created_at: new Date().toISOString()
        });

        if (notificationError) {
          console.warn('Notification creation failed (table might not exist):', notificationError);
        } else {
          console.log('Notification created');
        }
      } catch (notificationErr) {
        console.warn('Notification creation skipped:', notificationErr);
      }

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

      console.log('Booking creation successful:', bookingNumber);

      return NextResponse.json({
        success: true,
        message: 'Booking created successfully',
        booking: createdBooking,
        bookingNumber,
      }, { status: 201 });
      
    } catch (error: any) {
      console.error('Transaction error:', error);
      // Rollback: If booking was partially created, try to delete it
      if (bookingId) {
        console.log('Attempting rollback for booking ID:', bookingId);
        await supabase.from('booking_slots').delete().eq('booking_id', bookingId);
        await supabase.from('bookings').delete().eq('id', bookingId);
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error('Create booking error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create booking',
        details: error.details || null
      },
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
    
    console.log('DELETE request for booking ID:', bookingId);
    
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
      .select('booking_number, customer_id, status')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.error('Booking not found:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    console.log('Found booking to delete:', booking.booking_number);

    // Prevent deletion of completed bookings (optional safety check)
    if (booking.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete completed bookings' },
        { status: 400 }
      );
    }

    // Delete extra charges first (from extra_charges table)
    const { error: extraChargesError } = await supabase
      .from('extra_charges')
      .delete()
      .eq('booking_id', bookingId);

    if (extraChargesError) {
      console.error('Error deleting extra charges:', extraChargesError);
    }

    // Delete slots (from booking_slots table)
    const { error: slotsError } = await supabase
      .from('booking_slots')
      .delete()
      .eq('booking_id', bookingId);

    if (slotsError) {
      console.error('Error deleting slots:', slotsError);
    }

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

    console.log('Booking deleted successfully:', booking.booking_number);

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
      console.log('Customer also deleted (no other bookings)');
    }

    return NextResponse.json({
      success: true,
      message: `Booking #${booking.booking_number} deleted successfully`,
      bookingNumber: booking.booking_number,
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Export GET, POST, and DELETE methods
export const GET = withAdminAuth(GETHandler);
export const POST = withAdminAuth(POSTHandler);
export const DELETE = withAdminAuth(DELETEHandler);