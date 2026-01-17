/**
 * Approve Booking API
 * PATCH /api/admin/calendar/[id]/approve
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
      const { adminNotes } = body;

      if (!bookingId) {
        return NextResponse.json(
          { error: 'Booking ID is required' },
          { status: 400 }
        );
      }

      // Approve booking
      const { data, error } = await supabase.rpc('approve_booking', {
        p_booking_id: bookingId,
        p_admin_notes: adminNotes || null,
      });

      if (error) {
        console.error('Approve booking error:', error);
        return NextResponse.json(
          { error: 'Failed to approve booking' },
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
        approvedBy: adminProfile.full_name,
      });
    } catch (error) {
      console.error('Approve booking API error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
