/**
 * Public Header Component
 * 
 * Purpose: Navigation header for public-facing pages.
 * Features:
 * - Logo and branding
 * - Main navigation links (Home, Bookings, About, Contact)
 * - Responsive mobile menu
 * - Premium smooth animations
 */

'use client';

import { Group, Burger, Container, Title, Box, Text, Button, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCalendar, IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import styles from './PublicHeader.module.css';

export default function PublicHeader() {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Container size="xl" h="100%" px={{ base: 'xs', sm: 'md' }}>
      <Group justify="space-between" h="100%" wrap="nowrap">
        {/* Logo/Brand - Compact on mobile */}
        <Link href="/" className={styles.logo} style={{ textDecoration: 'none', flexShrink: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Box
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #F5B800 0%, #FFC933 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '20px',
                color: '#1A1A1A',
                boxShadow: '0 4px 12px rgba(245, 184, 0, 0.3)',
                transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              P
            </Box>
            <Box visibleFrom="xs">
              <Title order={3} size="1.2rem" c="#1A1A1A" style={{ lineHeight: 1, marginBottom: '2px', fontWeight: 800 }}>
                POWERPLAY
              </Title>
              <Text size="9px" c="#6B6B6B" style={{ lineHeight: 1, letterSpacing: '1.5px', fontWeight: 600 }}>
                CRICKET ARENA
              </Text>
            </Box>
          </Group>
        </Link>

        {/* Desktop Navigation */}
        <Group gap="sm" visibleFrom="sm">
          <Link href="/" className={styles.link}>Home</Link>
          <Link href="/bookings" className={styles.link}>Bookings</Link>
          <Link href="/bookings/check" className={styles.link}>Check Booking</Link>
        </Group>

        {/* Mobile Navigation Buttons */}
        <Group gap={6} hiddenFrom="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Button
            component={Link}
            href="/bookings"
            size="compact-sm"
            leftSection={<IconCalendar size={14} />}
            styles={{
              root: {
                background: '#F5B800',
                color: '#1A1A1A',
                fontWeight: 600,
                fontSize: '12px',
                height: '32px',
                padding: '0 12px',
              },
            }}
          >
            Book
          </Button>
          <Button
            component={Link}
            href="/bookings/check"
            size="compact-sm"
            variant="outline"
            leftSection={<IconSearch size={14} />}
            styles={{
              root: {
                borderColor: '#F5B800',
                color: '#1A1A1A',
                fontWeight: 600,
                fontSize: '12px',
                height: '32px',
                padding: '0 12px',
              },
            }}
          >
            Status
          </Button>
        </Group>
      </Group>
    </Container>
  );
}
