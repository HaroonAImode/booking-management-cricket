/**
 * Complete Payment API Route
 * 
 * Purpose: Handle remaining payment verification
 * Features:
 * - Upload remaining payment proof
 * - Verify payment and mark booking as completed
 * - Update payment records
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';
import { uploadPaymentProof } from '@/lib/supabase/storage';

async function handler(
  request: NextRequest,
  { params, adminProfile }: { params: Promise<{ id: string }>, adminProfile: any }
) {
  const resolvedParams = await params;
  
  if (!resolvedParams?.id) {
    return NextResponse.json(
      { success: false, error: 'Booking ID is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const bookingId = resolvedParams.id;

    // Parse form data
    const formData = await request.formData();
    const paymentMethod = formData.get('paymentMethod') as string;
    const paymentProof = formData.get('paymentProof') as File | null;
    const adminNotes = formData.get('adminNotes') as string | null;

    // Validate required fields
    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method is required' },
        { status: 400 }
      );
    }

    // Payment proof is optional for cash payments, required for digital
    if (!paymentProof && paymentMethod !== 'cash') {
      return NextResponse.json(
        { success: false, error: 'Payment proof is required for digital payments' },
        { status: 400 }
      );
    }

    // Get booking details first to get booking number and date
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('booking_number, booking_date, remaining_payment, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Validate booking status
    if (booking.status !== 'approved') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Booking must be approved to complete payment. Current status: ${booking.status}` 
        },
        { status: 400 }
      );
    }

    // Validate remaining payment exists
    if (booking.remaining_payment <= 0) {
      return NextResponse.json(
        { success: false, error: 'No remaining payment due for this booking' },
        { status: 400 }
      );
    }

    // Upload payment proof to storage (if provided)
    let uploadedProofPath = null;
    
    if (paymentProof) {
      const uploadResult = await uploadPaymentProof(
        paymentProof,
        bookingId,
        booking.booking_date
      );

      if (uploadResult.error || !uploadResult.data) {
        return NextResponse.json(
          { 
            success: false, 
            error: uploadResult.error || 'Failed to upload payment proof' 
          },
          { status: 500 }
        );
      }
      
      uploadedProofPath = uploadResult.data;
    }

    // Call SQL function to verify payment and complete booking
    const { data: result, error: verifyError } = await supabase.rpc(
      'verify_remaining_payment',
      {
        p_booking_id: bookingId,
        p_payment_method: paymentMethod,
        p_payment_proof_path: uploadedProofPath,
        p_admin_notes: adminNotes,
      }
    );

    if (verifyError) {
      console.error('Verify payment error:', verifyError);
      return NextResponse.json(
        { success: false, error: verifyError.message },
        { status: 500 }
      );
    }

    // Check if the function returned an error
    if (result && !result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and booking completed successfully',
      bookingNumber: result.booking_number,
      remainingAmount: result.remaining_amount,
    });
  } catch (error) {
    console.error('Complete payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAdminAuth(handler);
