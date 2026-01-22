import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';

/**
 * PATCH /api/admin/users/update
 * Update user details (admin only)
 */
async function handler(request: NextRequest, { adminProfile }: { adminProfile: any }) {
  try {
    const { userId, name, email, phone } = await request.json();

    if (!userId || !name || !email) {
      return NextResponse.json(
        { success: false, error: 'User ID, name, and email are required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get the user to update
    const { data: userToUpdate } = await adminClient
      .from('user_roles')
      .select('user_id, email, role')
      .eq('id', userId)
      .single();

    if (!userToUpdate) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent editing admin users
    if (userToUpdate.role === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit admin users' },
        { status: 403 }
      );
    }

    // Update user_roles table
    const { error: updateError } = await adminClient
      .from('user_roles')
      .update({
        name,
        email,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user_roles:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update user details' },
        { status: 500 }
      );
    }

    // Update auth user email if it changed
    if (email !== userToUpdate.email) {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
        userToUpdate.user_id,
        { email }
      );

      if (authUpdateError) {
        console.error('Error updating auth email:', authUpdateError);
        // Don't fail the request, but log the error
        // The user_roles email is already updated
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAdminAuth(handler);
