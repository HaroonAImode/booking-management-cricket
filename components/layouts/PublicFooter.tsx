/**
 * Public Footer Component
 * 
 * Purpose: Footer for public-facing pages.
 * Features:
 * - Company information
 * - Quick links
 * - Contact information
 * - Social media links
 * - Copyright notice
 */

'use client';

import { Container, Group, Text, Stack } from '@mantine/core';
import Link from 'next/link';
import styles from './PublicFooter.module.css';

export default function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <Container size="xl">
        <Group justify="space-between" align="flex-start" py="xl" wrap="wrap">
          <Stack gap="xs">
            <Text fw={700} c="white" size="lg">Powerplay Cricket Arena</Text>
            <Text size="sm" c="#F5B800">
              Professional cricket ground booking
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text fw={600} c="#F5B800">Quick Links</Text>
            <Text
              component={Link}
              href="/"
              size="sm"
              c="white"
              style={{
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'color 200ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F5B800')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
            >
              Home
            </Text>
            <Text
              component={Link}
              href="/bookings"
              size="sm"
              c="white"
              style={{
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'color 200ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F5B800')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
            >
              New Booking
            </Text>
            <Text
              component={Link}
              href="/bookings/check"
              size="sm"
              c="white"
              style={{
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'color 200ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F5B800')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
            >
              Check Booking Status
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text fw={600} c="#F5B800">Contact</Text>
            <Text size="sm" c="white">info@powerplayarena.com</Text>
            <Text size="sm" c="white">+1 234 567 890</Text>
          </Stack>
        </Group>

        <Text ta="center" size="sm" c="rgba(255, 255, 255, 0.7)" py="md" style={{ borderTop: '1px solid rgba(245, 184, 0, 0.3)' }}>
          © 2026 Cricket Booking Software. All rights reserved.
        </Text>
      </Container>
    </footer>
  );
}
