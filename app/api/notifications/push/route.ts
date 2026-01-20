/**
 * Push Notification API Route
 * Sends push notifications to subscribed admin devices
 */

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@powerplaycricket.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, bookingId, customerName } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Get all admin push subscriptions from database
    const supabase = await createClient();
    const { data: subscriptions, error } = await supabase
      .from('admin_push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching push subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No active subscriptions found' },
        { status: 200 }
      );
    }

    // Send push notification to all subscribed admins
    const notificationPayload = JSON.stringify({
      title,
      body: message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `booking-${bookingId || Date.now()}`,
      url: bookingId ? `/admin/bookings?id=${bookingId}` : '/admin/bookings',
      bookingId,
      customerName,
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        console.log('Push notification sent successfully to:', sub.user_id);
        return { success: true, userId: sub.user_id };
      } catch (error: any) {
        console.error('Error sending push notification:', error);

        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('admin_push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id);
        }

        return { success: false, userId: sub.user_id, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      message: `Push notifications sent to ${successCount} of ${subscriptions.length} devices`,
      results,
    });
  } catch (error: any) {
    console.error('Error in push notification API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
