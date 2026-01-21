/**
 * Supabase Authentication Utilities
 * Admin authentication, session management, and role verification
 */

import { createClient } from './client';

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'super_admin' | 'staff';
  is_active: boolean;
  last_login_at: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  profile?: AdminProfile;
}

/**
 * Sign in admin user with email and password
 */
export async function signInAdmin(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const supabase = createClient();

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Authentication failed',
      };
    }

    // Check if user exists in user_roles table and is active
    const { data: userRole, error: profileError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', authData.user.id)
      .eq('is_active', true)
      .single();

    if (profileError || !userRole) {
      // User authenticated but doesn't have a role or is inactive
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Access denied. Account not found or inactive.',
      };
    }

    // Map user_roles data to AdminProfile format
    const profile: AdminProfile = {
      id: userRole.user_id,
      email: userRole.email,
      full_name: userRole.name,
      role: userRole.role as 'admin' | 'super_admin' | 'staff',
      is_active: userRole.is_active,
      last_login_at: null,
    };

    return {
      success: true,
      profile,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Sign out current admin user
 */
export async function signOutAdmin(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: 'Failed to sign out',
    };
  }
}

/**
 * Get current authenticated admin session
 */
export async function getAdminSession() {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

/**
 * Get current admin user
 */
export async function getAdminUser() {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Get current admin profile
 */
export async function getAdminProfile(): Promise<AdminProfile | null> {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    // Get user role from user_roles table
    const { data: userRole, error: profileError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (profileError || !userRole) {
      return null;
    }

    // Map to AdminProfile format
    const profile: AdminProfile = {
      id: userRole.user_id,
      email: userRole.email,
      full_name: userRole.name,
      role: userRole.role as 'admin' | 'super_admin' | 'staff',
      is_active: userRole.is_active,
      last_login_at: null,
    };

    return profile;
  } catch (error) {
    console.error('Get admin profile error:', error);
    return null;
  }
}

/**
 * Check if current user is authenticated admin
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getAdminSession();
  if (!session) return false;

  const profile = await getAdminProfile();
  return !!profile;
}

/**
 * Check if current admin has specific role
 */
export async function hasRole(requiredRole: 'admin' | 'super_admin' | 'staff'): Promise<boolean> {
  const profile = await getAdminProfile();
  if (!profile) return false;

  // Super admins have all permissions
  if (profile.role === 'super_admin') return true;

  return profile.role === requiredRole;
}

/**
 * Server-side authentication check (for middleware/API routes)
 */
export async function getServerAdminSession(cookieStore: any) {
  try {
    // Use client-side auth since we're removing server dependency
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    // Verify user role exists in user_roles table
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (!userRole) {
      return null;
    }

    // Map to profile format
    const profile: AdminProfile = {
      id: userRole.user_id,
      email: userRole.email,
      full_name: userRole.name,
      role: userRole.role as 'admin' | 'super_admin' | 'staff',
      is_active: userRole.is_active,
      last_login_at: null,
    };

    return { session, profile };
  } catch (error) {
    console.error('Server auth check error:', error);
    return null;
  }
}

/**
 * Refresh session
 */
export async function refreshSession() {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Refresh session error:', error);
    return null;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const supabase = createClient();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  
  return subscription;
}
