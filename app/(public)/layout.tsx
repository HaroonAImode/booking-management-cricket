/**
 * Public Routes Layout
 * 
 * Purpose: Layout component for all public-facing pages.
 * Wraps pages in app/(public)/ folder with:
 * - Public navigation header
 * - Footer
 * - Consistent styling for public pages
 * 
 * Pages using this layout: home, bookings, about, contact, etc.
 */

'use client';

import { AppShell, Container } from '@mantine/core';
import PublicHeader from '@/components/layouts/PublicHeader';
import PublicFooter from '@/components/layouts/PublicFooter';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      {/* Public navigation header */}
      <AppShell.Header>
        <PublicHeader />
      </AppShell.Header>

      {/* Main content area */}
      <AppShell.Main>
        <Container size="xl">
          {children}
        </Container>
      </AppShell.Main>

      {/* Footer with links and info */}
      <PublicFooter />
    </AppShell>
  );
}
