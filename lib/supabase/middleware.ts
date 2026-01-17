/**
 * Supabase Middleware
 * 
 * Purpose: Refresh user sessions and handle authentication in middleware.
 * Runs on every request to ensure auth state is up to date.
 * 
 * This middleware:
 * - Refreshes expired auth tokens
 * - Updates user session
 * - Protects admin routes (add logic as needed)
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser();

  // Protect admin routes
  const isAdminRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                       request.nextUrl.pathname.startsWith('/admin');
  const isLoginPage = request.nextUrl.pathname === '/admin/login';

  if (isAdminRoute && !isLoginPage) {
    // Check if user is authenticated
    if (!user) {
      // Redirect to login page
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify user is an admin
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id, role, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminProfile) {
      // User is authenticated but not an admin - redirect to unauthorized
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }

    // Add admin info to request headers for use in route handlers
    response.headers.set('x-admin-id', adminProfile.id);
    response.headers.set('x-admin-role', adminProfile.role);
  }

  // Redirect authenticated admins away from login page
  if (isLoginPage && user) {
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (adminProfile) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
