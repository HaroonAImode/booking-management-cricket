/**
 * Admin Routes Layout
 * 
 * Purpose: Layout component for admin panel pages.
 * Wraps pages in app/admin/ folder with:
 * - Admin navigation sidebar
 * - Protected route logic (authentication check)
 * - Admin-specific header and styling
 * 
 * Pages using this layout: dashboard, manage bookings, manage grounds, users, etc.
 */

'use client';

import { useState } from 'react';
import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import AdminHeader from '@/components/layouts/AdminHeader';
import AdminNavbar from '@/components/layouts/AdminNavbar';
import AdminAuthGuard from '@/components/AdminAuthGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  return (
    <AdminAuthGuard>
      <AppShell
        header={{ height: 70 }}
        navbar={{
          width: 280,
          breakpoint: 'sm',
          collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
        }}
        padding="md"
        styles={{
          main: {
            background: '#FFF9E6',
            minHeight: '100vh',
          },
        }}
      >
        {/* Admin header with user menu */}
        <AppShell.Header
          style={{
            background: '#1A1A1A',
            borderBottom: '2px solid #F5B800',
          }}
        >
          <AdminHeader
            mobileOpened={mobileOpened}
            desktopOpened={desktopOpened}
            toggleMobile={toggleMobile}
            toggleDesktop={toggleDesktop}
          />
        </AppShell.Header>

        {/* Sidebar navigation for admin pages */}
        <AppShell.Navbar
          p="md"
          style={{
            background: 'white',
            borderRight: '2px solid #F5B800',
          }}
        >
          <AdminNavbar />
        </AppShell.Navbar>

        {/* Main content area for admin pages */}
        <AppShell.Main>
          {children}
        </AppShell.Main>
      </AppShell>
    </AdminAuthGuard>
  );
}
