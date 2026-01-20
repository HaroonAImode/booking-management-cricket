/**
 * Push Subscription API Route
 * Manages admin push notification subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, userId } = body;

    if (!subscription || !userId) {
      return NextResponse.json(
        { error: 'Subscription and userId are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('admin_push_subscriptions')
      .select('*')
      .eq('endpoint', subscription.endpoint)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing subscription
      const { error } = await supabase
        .from('admin_push_subscriptions')
        .update({
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating subscription:', error);
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: 'Subscription updated successfully' });
    }

    // Insert new subscription
    const { error } = await supabase.from('admin_push_subscriptions').insert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      is_active: true,
    });

    if (error) {
      console.error('Error saving subscription:', error);
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Subscription saved successfully' });
  } catch (error: any) {
    console.error('Error in subscription API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const userId = searchParams.get('userId');

    if (!endpoint || !userId) {
      return NextResponse.json(
        { error: 'Endpoint and userId are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('admin_push_subscriptions')
      .update({ is_active: false })
      .eq('endpoint', endpoint)
      .eq('user_id', userId);

    if (error) {
      console.error('Error unsubscribing:', error);
      return NextResponse.json(
        { error: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Unsubscribed successfully' });
  } catch (error: any) {
    console.error('Error in unsubscribe API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
