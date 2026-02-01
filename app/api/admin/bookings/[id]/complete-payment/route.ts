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
    const paymentAmount = parseFloat(formData.get('paymentAmount') as string);
    const paymentProof = formData.get('paymentProof') as File | null;
    const adminNotes = formData.get('adminNotes') as string | null;
    // Parse extra charges (JSON stringified array)
    let extraCharges: { category: string; amount: number }[] = [];
    const extraChargesRaw = formData.get('extraCharges');
    if (extraChargesRaw) {
      try {
        extraCharges = JSON.parse(extraChargesRaw as string);
      } catch (e) {
        return NextResponse.json(
          { success: false, error: 'Invalid extra charges data' },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method is required' },
        { status: 400 }
      );
    }

    // Validate payment amount
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid payment amount is required' },
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
      .select('booking_number, booking_date, remaining_payment, status, total_amount, remaining_payment_amount')
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

    // Validate payment amount doesn't exceed remaining
    if (paymentAmount > booking.remaining_payment) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Payment amount (Rs ${paymentAmount}) cannot exceed remaining amount (Rs ${booking.remaining_payment})` 
        },
        { status: 400 }
      );
    }

    // Validate extra charges
    for (const ec of extraCharges) {
      if (!ec.category || !ec.amount || ec.amount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid extra charge entry' },
          { status: 400 }
        );
      }
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

    // Insert extra charges and update booking totals if any
    let totalExtraCharges = 0;
    if (extraCharges.length > 0) {
      // Insert each extra charge
      for (const ec of extraCharges) {
        const { error: ecError } = await supabase.from('extra_charges').insert({
          booking_id: bookingId,
          category: ec.category,
          amount: ec.amount,
        });
        if (ecError) {
          return NextResponse.json(
            { success: false, error: `Failed to add extra charge: ${ecError.message}` },
            { status: 500 }
          );
        }
        totalExtraCharges += ec.amount;
      }
      // Update booking's total_amount and remaining_payment_amount
      const { error: updateError } = await supabase.from('bookings').update({
        total_amount: booking.total_amount + totalExtraCharges,
        remaining_payment_amount: booking.remaining_payment_amount + totalExtraCharges,
      }).eq('id', bookingId);
      if (updateError) {
        return NextResponse.json(
          { success: false, error: `Failed to update booking with extra charges: ${updateError.message}` },
          { status: 500 }
        );
      }
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
