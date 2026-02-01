/**
 * Public Header Component
 * 
 * Purpose: Navigation header for public-facing pages.
 * Features:
 * - Logo and branding with image logo
 * - Main navigation links (Home, Bookings, About, Contact)
 * - Responsive mobile menu
 * - Premium smooth animations
 */

'use client';

import { Group, Burger, Container, Title, Box, Text, Button, Image } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCalendar, IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './PublicHeader.module.css';

export default function PublicHeader() {
  const [opened, { toggle }] = useDisclosure(false);
  const pathname = usePathname();

  return (
    <Container size="xl" h="100%" px={{ base: 'xs', sm: 'md' }}>
      <Group justify="space-between" h="100%" wrap="nowrap">
        {/* Logo/Brand - Compact on mobile */}
        <Link href="/" className={styles.logo} style={{ textDecoration: 'none', flexShrink: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Box className={styles.logoContainer}>
              <Image
                src="/logoo.png"
                alt="PowerPlay Cricket Arena Logo"
                width={34}
                height={34}
                className={styles.logoImage}
              />
            </Box>
            <Box>
              <Title order={3} size={{ base: '0.85rem', xs: '1.2rem' }} c="#1A1A1A" style={{ lineHeight: 1, marginBottom: '2px', fontWeight: 800 }}>
                POWERPLAY
              </Title>
              <Text size={{ base: '7px', xs: '9px' }} c="#6B6B6B" style={{ lineHeight: 1, letterSpacing: '1.5px', fontWeight: 600 }}>
                CRICKET ARENA
              </Text>
            </Box>
          </Group>
        </Link>

        {/* Desktop Navigation */}
        <Group gap="sm" visibleFrom="sm">
          <Link 
            href="/" 
            className={`${styles.link} ${pathname === '/' ? styles.active : ''}`}
          >
            Home
          </Link>
          <Link 
            href="/bookings" 
            className={`${styles.link} ${pathname.startsWith('/bookings') && !pathname.includes('/check') ? styles.active : ''}`}
          >
            Bookings
          </Link>
          <Link 
            href="/bookings/check" 
            className={`${styles.link} ${pathname.includes('/bookings/check') ? styles.active : ''}`}
          >
            Check Booking
          </Link>
        </Group>

        {/* Mobile Navigation Buttons */}
        <Group gap={8} hiddenFrom="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
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
                fontSize: '11px',
                height: '32px',
                padding: '0 10px',
                minWidth: '70px',
                pointerEvents: 'auto',
                cursor: 'pointer',
                touchAction: 'manipulation',
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
                fontSize: '11px',
                height: '32px',
                padding: '0 10px',
                minWidth: '85px',
                whiteSpace: 'nowrap',
                pointerEvents: 'auto',
                cursor: 'pointer',
                touchAction: 'manipulation',
              },
              label: {
                overflow: 'visible',
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