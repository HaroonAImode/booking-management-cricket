/**
 * Mark Notification as Read API Route
 * 
 * Purpose: Mark a single notification as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';

async function handler(
  request: NextRequest,
  { params, adminProfile }: { params: Promise<{ id: string }>, adminProfile: any }
) {
  const resolvedParams = await params;
  
  if (!resolvedParams?.id) {
    return NextResponse.json(
      { success: false, error: 'Notification ID is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const notificationId = resolvedParams.id;

    // Mark notification as read
    const { data: result, error } = await supabase.rpc(
      'mark_notification_read',
      {
        p_notification_id: notificationId,
      }
    );

    if (error) {
      console.error('Mark notification read error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
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
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAdminAuth(handler);
