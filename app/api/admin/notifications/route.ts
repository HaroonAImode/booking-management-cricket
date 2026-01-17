/**
 * Admin Notifications API Route
 * 
 * Purpose: Handle admin notification operations
 * Features:
 * - Get notifications list with filtering
 * - Pagination support
 * - Filter by read status
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';

async function handler(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const isRead = searchParams.get('isRead');

    // Parse isRead parameter
    let isReadFilter = null;
    if (isRead === 'true') isReadFilter = true;
    if (isRead === 'false') isReadFilter = false;

    // Get notifications
    const { data: notifications, error } = await supabase.rpc(
      'get_admin_notifications',
      {
        p_limit: limit,
        p_offset: offset,
        p_is_read: isReadFilter,
      }
    );

    if (error) {
      console.error('Get notifications error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Get unread count
    const { data: unreadCount, error: countError } = await supabase.rpc(
      'get_unread_notifications_count'
    );

    if (countError) {
      console.error('Get unread count error:', countError);
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);
