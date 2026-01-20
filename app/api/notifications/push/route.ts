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
    'mailto:admin@powerplay.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Push notification request received');
    
    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    
    const { title, message, bookingId, customerName } = body;

    console.log('📋 Extracted values:', { 
      title: title || 'MISSING', 
      message: message || 'MISSING', 
      bookingId: bookingId || 'MISSING', 
      customerName: customerName || 'MISSING' 
    });

    if (!title || !message) {
      console.error('❌ Missing title or message');
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Check VAPID keys
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.error('❌ VAPID keys not found in environment variables!');
      return NextResponse.json(
        { error: 'Server configuration error: VAPID keys missing' },
        { status: 500 }
      );
    }

    console.log('✅ VAPID keys found');

    // Get all admin push subscriptions from database
    const supabase = await createClient();
    const { data: subscriptions, error } = await supabase
      .from('admin_push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching push subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${subscriptions?.length || 0} active subscription(s)`);

    if (!subscriptions || subscriptions.length === 0) {
      console.warn('⚠️ No active subscriptions found');
      return NextResponse.json(
        { message: 'No active subscriptions found' },
        { status: 200 }
      );
    }

    // Send push notification to all subscribed admins
    const notificationPayload = JSON.stringify({
      title,
      body: message,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: `booking-${bookingId || Date.now()}`,
      url: bookingId ? `/admin/bookings?id=${bookingId}` : '/admin/bookings',
      bookingId,
      customerName,
    });

    // High priority options for instant delivery
    const pushOptions = {
      TTL: 3600, // 1 hour expiry
      urgency: 'high', // High priority for instant FCM delivery
      topic: bookingId ? `booking-${bookingId}` : undefined, // Replace old notifications
    };

    console.log('📤 Sending HIGH PRIORITY notifications to all subscriptions...');

    const sendPromises = subscriptions.map(async (sub, index) => {
      try {
        console.log(`📨 [HIGH PRIORITY] Sending to subscription ${index + 1}/${subscriptions.length}`);
        console.log(`   Endpoint: ${sub.endpoint.substring(0, 50)}...`);
        
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload, pushOptions);
        console.log(`✅ Successfully sent to subscription ${index + 1}`);
        return { success: true, userId: sub.user_id };
      } catch (error: any) {
        console.error(`❌ Error sending to subscription ${index + 1}:`, error.message);
        console.error('   Status:', error.statusCode);
        console.error('   Body:', error.body);

        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`   Marking subscription ${index + 1} as inactive`);
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

    console.log(`📊 Results: ${successCount}/${subscriptions.length} notifications sent successfully`);

    return NextResponse.json({
      message: `Push notifications sent to ${successCount} of ${subscriptions.length} devices`,
      results,
    });
  } catch (error: any) {
    console.error('💥 Error in push notification API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
