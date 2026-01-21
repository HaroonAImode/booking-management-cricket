/**
 * API Route Authentication Middleware
 * Verifies admin authentication for protected API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface AuthenticatedRequest extends NextRequest {
  adminId?: string;
  adminRole?: string;
  adminProfile?: any;
}

/**
 * Verify admin authentication for API routes
 * Usage: const { authorized, response, adminProfile } = await verifyAdminAuth(request);
 */
export async function verifyAdminAuth(request: NextRequest) {
  try {
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return {
        authorized: false,
        response: NextResponse.json(
          { 
            error: 'Server configuration error - Missing Supabase credentials',
            hint: 'Check .env.local file and restart server'
          },
          { status: 500 }
        ),
        adminProfile: null,
      };
    }

    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Unauthorized - Authentication required' },
          { status: 401 }
        ),
        adminProfile: null,
      };
    }

    // Verify user role (admin or ground_manager)
    const { data: userRole, error: profileError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (profileError || !userRole) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Forbidden - Admin or Ground Manager access required' },
          { status: 403 }
        ),
        adminProfile: null,
      };
    }

    // Map user_roles to adminProfile format for compatibility
    const adminProfile = {
      id: userRole.user_id,
      email: userRole.email,
      full_name: userRole.name,
      role: userRole.role,
      is_active: userRole.is_active,
    };

    return {
      authorized: true,
      response: null,
      adminProfile,
    };
  } catch (error) {
    console.error('Admin auth verification error:', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
      adminProfile: null,
    };
  }
}

/**
 * Verify admin has specific role
 */
export async function verifyAdminRole(
  request: NextRequest,
  requiredRole: 'admin' | 'super_admin' | 'staff'
) {
  const { authorized, response, adminProfile } = await verifyAdminAuth(request);

  if (!authorized) {
    return { authorized: false, response, adminProfile: null };
  }

  // Super admins have all permissions
  if (adminProfile.role === 'super_admin') {
    return { authorized: true, response: null, adminProfile };
  }

  // Check specific role
  if (adminProfile.role !== requiredRole) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: `Forbidden - ${requiredRole} role required` },
        { status: 403 }
      ),
      adminProfile: null,
    };
  }

  return { authorized: true, response: null, adminProfile };
}

/**
 * HOC to protect API route handlers
 * Usage: export const GET = withAdminAuth(async (request, { adminProfile }) => { ... });
 */
export function withAdminAuth(
  handler: (
    request: NextRequest,
    context: { adminProfile: any; params?: any }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: { params?: any }) => {
    const { authorized, response, adminProfile } = await verifyAdminAuth(request);

    if (!authorized) {
      return response;
    }

    return handler(request, { adminProfile, params: context?.params });
  };
}

/**
 * HOC to protect API routes with role check
 * Usage: export const DELETE = withAdminRole('super_admin', async (request, { adminProfile }) => { ... });
 */
export function withAdminRole(
  requiredRole: 'admin' | 'super_admin' | 'staff',
  handler: (
    request: NextRequest,
    context: { adminProfile: any; params?: any }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: { params?: any }) => {
    const { authorized, response, adminProfile } = await verifyAdminRole(
      request,
      requiredRole
    );

    if (!authorized) {
      return response;
    }

    return handler(request, { adminProfile, params: context?.params });
  };
}
