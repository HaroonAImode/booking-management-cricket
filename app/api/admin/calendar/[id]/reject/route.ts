/**
 * Reject Booking API
 * PATCH /api/admin/calendar/[id]/reject
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const PATCH = withAdminAuth(
  async (request, { adminProfile, params }) => {
    try {
      const supabase = await createClient();
      const resolvedParams = await params;
      const bookingId = resolvedParams?.id;
      const body = await request.json();
      const { reason } = body;

      if (!bookingId) {
        return NextResponse.json(
          { error: 'Booking ID is required' },
          { status: 400 }
        );
      }

      if (!reason) {
        return NextResponse.json(
          { error: 'Cancellation reason is required' },
          { status: 400 }
        );
      }

      // Reject booking
      const { data, error } = await supabase.rpc('reject_booking', {
        p_booking_id: bookingId,
        p_reason: reason,
      });

      if (error) {
        console.error('Reject booking error:', error);
        return NextResponse.json(
          { error: 'Failed to reject booking' },
          { status: 500 }
        );
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        bookingNumber: result.booking_number,
        rejectedBy: adminProfile.full_name,
      });
    } catch (error) {
      console.error('Reject booking API error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
