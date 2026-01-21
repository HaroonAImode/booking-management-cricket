import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const userId = params.id;

    // Check if current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: currentUserRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single();

    if (currentUserRole?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can delete users' },
        { status: 403 }
      );
    }

    // Get the user to delete
    const { data: userToDelete } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('id', userId)
      .single();

    if (!userToDelete) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting admin users
    if (userToDelete.role === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete admin users' },
        { status: 403 }
      );
    }

    // Delete from user_roles table
    const { error: roleDeleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', userId);

    if (roleDeleteError) {
      console.error('Role deletion error:', roleDeleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete user role' },
        { status: 500 }
      );
    }

    // Delete auth user
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      userToDelete.user_id
    );

    if (authDeleteError) {
      console.error('Auth deletion error:', authDeleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete auth user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (error: any) {
    console.error('User deletion error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
