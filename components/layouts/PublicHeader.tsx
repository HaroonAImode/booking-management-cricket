/**
 * Public Header Component
 * 
 * Purpose: Navigation header for public-facing pages.
 * Features:
 * - Logo and branding with image logo (zoomed)
 * - Main navigation links (Home, Bookings, About, Contact)
 * - Responsive mobile menu
 * - Premium smooth animations
 */

'use client';

import { Group, Container, Box, Text, Button, Image } from '@mantine/core';
import { IconCalendar, IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './PublicHeader.module.css';

export default function PublicHeader() {
  const pathname = usePathname();

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
                background: '#FFFFFF',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #F5B800',
                boxShadow: '0 4px 12px rgba(245, 184, 0, 0.3)',
                overflow: 'hidden',
                padding: '0px',
                transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Container to apply scale transform */}
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'scale(1.6)', // Same zoom as AdminHeader
              }}>
                <Image
                  src="/logoo.png"
                  alt="PowerPlay Cricket Arena Logo"
                  width={38}
                  height={38}
                  fit="cover"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center center',
                    width: '100%',
                    height: '100%',
                  }}
                />
              </div>
            </Box>
            <Box>
              <Text 
                size={{ base: '0.85rem', xs: '1.2rem' }} 
                c="#1A1A1A" 
                fw={800}
                style={{ 
                  lineHeight: 1, 
                  marginBottom: '2px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                POWERPLAY
              </Text>
              <Text 
                size={{ base: '7px', xs: '9px' }} 
                c="#6B6B6B" 
                fw={600}
                style={{ 
                  lineHeight: 1, 
                  letterSpacing: '1.5px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
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