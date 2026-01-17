/**
 * Admin Authentication Guard
 * 
 * Purpose: Protects admin routes from unauthorized access
 * Redirects to login page if user is not authenticated
 * Shows loading state while checking authentication
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { getAdminProfile } from '@/lib/supabase/auth';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const profile = await getAdminProfile();
        
        if (!profile) {
          // Not authenticated, redirect to login
          router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        // Authenticated
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        router.replace('/admin/login');
      } finally {
        setIsChecking(false);
      }
    }

    checkAuth();
  }, [router, pathname]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" color="green" />
          <Text c="dimmed">Verifying authentication...</Text>
        </Stack>
      </Center>
    );
  }

  // Only render children if authenticated
  return isAuthenticated ? <>{children}</> : null;
}
