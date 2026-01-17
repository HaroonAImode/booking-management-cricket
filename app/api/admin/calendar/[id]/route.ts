/**
 * Booking Details API
 * GET /api/admin/calendar/[id] - Get full booking details
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';

export const GET = withAdminAuth(
  async (request, { adminProfile, params }) => {
    try {
      const supabase = await createClient();
      const resolvedParams = await params;
      const bookingId = resolvedParams?.id;

      if (!bookingId) {
        return NextResponse.json(
          { error: 'Booking ID is required' },
          { status: 400 }
        );
      }

      // Get booking details
      const { data, error } = await supabase.rpc('get_booking_details', {
        p_booking_id: bookingId,
      });

      if (error) {
        console.error('Booking details fetch error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch booking details' },
          { status: 500 }
        );
      }

      if (!data) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: typeof data === 'string' ? JSON.parse(data) : data,
      });
    } catch (error) {
      console.error('Booking details API error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
