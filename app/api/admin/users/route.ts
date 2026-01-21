import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    // Use regular client to check current user auth
    const supabase = await createClient();
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    
    const { data: currentUserRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single();

    if (currentUserRole?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can view users' },
        { status: 403 }
      );
    }

    // Fetch all users
    const { data: users, error } = await adminClient
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      users: users || [],
    });

  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    // Use regular client to check current user auth
    const supabase = await createClient();
    
    // Check if current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client to bypass RLS for checking admin role
    const adminClient = createAdminClient();
    const { data: currentUserRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single();

    if (currentUserRole?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can create users' },
        { status: 403 }
      );
    }

    const { name, email, phone, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Create auth user using admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        phone,
      },
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: 'User creation failed' },
        { status: 500 }
      );
    }

    // Insert into user_roles table using admin client
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        name,
        email,
        phone: phone || null,
        role: role || 'ground_manager',
        is_active: true,
      });

    if (roleError) {
      // Rollback: delete auth user if role creation fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      console.error('Role creation error:', roleError);
      return NextResponse.json(
        { success: false, error: 'Failed to assign role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        name,
        role,
      },
    });

  } catch (error: any) {
    console.error('User creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update user status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    // Use regular client to check current user auth
    const supabase = await createClient();
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    
    const { data: currentUserRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single();

    if (currentUserRole?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can update users' },
        { status: 403 }
      );
    }

    const { userId, is_active } = await request.json();

    if (!userId || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'User ID and is_active status are required' },
        { status: 400 }
      );
    }

    // Update user status
    const { error } = await adminClient
      .from('user_roles')
      .update({ is_active })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'}`,
    });

  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
