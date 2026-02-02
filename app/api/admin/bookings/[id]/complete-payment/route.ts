/**
 * Complete Payment API Route
 * 
 * Purpose: Handle remaining payment verification with extra charges and discount
 * Features:
 * - Upload remaining payment proof
 * - Verify payment and mark booking as completed
 * - Handle extra charges (mineral water, tape, ball, other)
 * - Handle discount functionality
 * - Update booking totals with extra charges and discount
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
    const discountAmount = parseFloat(formData.get('discountAmount') as string || '0');
    const paymentProof = formData.get('paymentProof') as File | null;
    const adminNotes = formData.get('adminNotes') as string | null;
    const extraChargesJson = formData.get('extraCharges') as string | null;

    // Parse extra charges if provided
    let extraCharges: Array<{ category: string; amount: number }> = [];
    if (extraChargesJson) {
      try {
        extraCharges = JSON.parse(extraChargesJson);
      } catch (error) {
        console.error('Error parsing extra charges:', error);
        return NextResponse.json(
          { success: false, error: 'Invalid extra charges format' },
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

    // Validate discount amount
    if (discountAmount < 0) {
      return NextResponse.json(
        { success: false, error: 'Discount amount cannot be negative' },
        { status: 400 }
      );
    }

    // Validate extra charges
    if (extraCharges.length > 0) {
      for (const charge of extraCharges) {
        if (!charge.category || !charge.amount || charge.amount <= 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid extra charge data' },
            { status: 400 }
          );
        }
        
        // Validate category
        const validCategories = ['mineral water', 'tape', 'ball', 'other'];
        if (!validCategories.includes(charge.category)) {
          return NextResponse.json(
            { success: false, error: `Invalid category: ${charge.category}` },
            { status: 400 }
          );
        }
      }
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
      .select('booking_number, booking_date, remaining_payment, status, total_amount')
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

    // Calculate total with extra charges
    const totalExtraCharges = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
    const totalPayable = booking.remaining_payment + totalExtraCharges;

    // Validate payment amount doesn't exceed total payable
    if (paymentAmount > totalPayable) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Payment amount (Rs ${paymentAmount}) cannot exceed total payable amount (Rs ${totalPayable})` 
        },
        { status: 400 }
      );
    }

    // Validate payment amount is at least original remaining amount
    if (paymentAmount < booking.remaining_payment) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Payment must be at least Rs ${booking.remaining_payment} (original remaining amount)` 
        },
        { status: 400 }
      );
    }

    // Validate discount doesn't exceed extra charges
    if (discountAmount > totalExtraCharges) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Discount (Rs ${discountAmount}) cannot exceed extra charges amount (Rs ${totalExtraCharges})` 
        },
        { status: 400 }
      );
    }

    // Calculate expected payment with discount
    const expectedPayment = totalPayable - discountAmount;
    
    // Validate actual payment matches expected payment (with small tolerance for rounding)
    if (Math.abs(paymentAmount - expectedPayment) > 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Payment amount mismatch. Expected: Rs ${expectedPayment}, Provided: Rs ${paymentAmount}` 
        },
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

    // Convert extra charges to JSONB format for database
    const extraChargesJsonb = extraCharges.length > 0 
      ? JSON.stringify(extraCharges) 
      : null;

    // Call the updated SQL function with ALL parameters including discount
    const { data: result, error: verifyError } = await supabase.rpc(
      'verify_remaining_payment_with_extra_charges',
      {
        p_admin_notes: adminNotes,
        p_booking_id: bookingId,
        p_extra_charges: extraChargesJsonb,
        p_payment_amount: paymentAmount,
        p_payment_method: paymentMethod,
        p_payment_proof_path: uploadedProofPath,
        p_created_by: adminProfile.id,
        p_discount_amount: discountAmount
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

    // Fetch updated booking to get discount amount
    const { data: updatedBooking } = await supabase
      .from('bookings')
      .select('discount_amount, total_amount, remaining_payment_amount')
      .eq('id', bookingId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Payment verified and booking completed successfully',
      bookingNumber: result.booking_number,
      remainingAmount: booking.remaining_payment,
      totalExtraCharges: result.total_extra_charges || totalExtraCharges,
      actual_discount: result.actual_discount || discountAmount,
      discountApplied: updatedBooking?.discount_amount || discountAmount,
      finalPayment: paymentAmount,
      newTotalAmount: updatedBooking?.total_amount || booking.total_amount,
      remainingPaymentAmount: updatedBooking?.remaining_payment_amount || 0,
    });
  } catch (error: any) {
    console.error('Complete payment error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export const PATCH = withAdminAuth(handler);