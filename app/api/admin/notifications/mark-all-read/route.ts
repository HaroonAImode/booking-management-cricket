/**
 * Mark All Notifications as Read API Route
 * 
 * Purpose: Mark all unread notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';

async function handler(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Mark all notifications as read
    const { data: result, error } = await supabase.rpc(
      'mark_all_notifications_read'
    );

    if (error) {
      console.error('Mark all notifications read error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: result?.count || 0,
      message: `${result?.count || 0} notification(s) marked as read`,
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAdminAuth(handler);
