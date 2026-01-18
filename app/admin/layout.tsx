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

import { useState, useEffect } from 'react';
import { AppShell, Burger, Overlay } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import AdminHeader from '@/components/layouts/AdminHeader';
import AdminNavbar from '@/components/layouts/AdminNavbar';
import AdminAuthGuard from '@/components/AdminAuthGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <AdminAuthGuard>
      {/* Mobile backdrop overlay */}
      {isMobile && mobileOpened && (
        <Overlay
          color="#000"
          opacity={0.55}
          onClick={closeMobile}
          style={{ zIndex: 199, position: 'fixed' }}
        />
      )}
      
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
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          },
          navbar: {
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 200,
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
          },
          header: {
            zIndex: 201,
          },
        }}
      >
        {/* Admin header with user menu */}
        <AppShell.Header
          style={{
            background: '#1A1A1A',
            borderBottom: '3px solid #F5B800',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
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
            borderRight: '3px solid #F5B800',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
          }}
          styles={{
            navbar: {
              '@media (max-width: 768px)': {
                position: 'fixed',
                top: '70px',
                left: 0,
                height: 'calc(100vh - 70px)',
                width: '280px',
                zIndex: 200,
              },
            },
          }}
        >
          <AdminNavbar toggleMobile={toggleMobile} mobileOpened={mobileOpened} />
        </AppShell.Navbar>

        {/* Main content area for admin pages */}
        <AppShell.Main>
          {children}
        </AppShell.Main>
      </AppShell>
    </AdminAuthGuard>
  );
}
