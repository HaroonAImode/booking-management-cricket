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
    <Container size="xl" h="100%">
      <Group justify="space-between" h="100%">
        {/* Logo/Brand */}
        <Link href="/" className={styles.logo} style={{ textDecoration: 'none' }}>
          <Group gap="xs">
            <Box
              style={{
                width: '44px',
                height: '44px',
                background: 'linear-gradient(135deg, #F5B800 0%, #FFC933 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '22px',
                color: '#1A1A1A',
                boxShadow: '0 4px 12px rgba(245, 184, 0, 0.3)',
                transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              P
            </Box>
            <Box>
              <Title order={3} size="1.4rem" c="#1A1A1A" style={{ lineHeight: 1, marginBottom: '3px', fontWeight: 800 }}>
                POWERPLAY
              </Title>
              <Text size="xs" c="#6B6B6B" style={{ lineHeight: 1, letterSpacing: '2.5px', fontWeight: 600 }}>
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
        <Group gap="xs" hiddenFrom="sm">
          <Button
            component={Link}
            href="/bookings"
            size="xs"
            leftSection={<IconCalendar size={16} />}
            style={{
              background: '#F5B800',
              color: '#1A1A1A',
              fontWeight: 600,
            }}
          >
            Book Now
          </Button>
          <Button
            component={Link}
            href="/bookings/check"
            size="xs"
            variant="outline"
            leftSection={<IconSearch size={16} />}
            style={{
              borderColor: '#F5B800',
              color: '#1A1A1A',
              fontWeight: 600,
            }}
          >
            Check Status
          </Button>
        </Group>
      </Group>
    </Container>
  );
}
