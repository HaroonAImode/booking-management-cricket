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
import styles from './PublicFooter.module.css';

export default function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <Container size="xl">
        <Group justify="space-between" align="flex-start" py="xl">
          <Stack gap="xs">
            <Text fw={700}>Cricket Booking Software</Text>
            <Text size="sm" c="dimmed">
              Professional cricket ground booking
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text fw={600}>Quick Links</Text>
            <Text size="sm" c="dimmed">Home</Text>
            <Text size="sm" c="dimmed">Bookings</Text>
            <Text size="sm" c="dimmed">About</Text>
          </Stack>

          <Stack gap="xs">
            <Text fw={600}>Contact</Text>
            <Text size="sm" c="dimmed">info@cricketbooking.com</Text>
            <Text size="sm" c="dimmed">+1 234 567 890</Text>
          </Stack>
        </Group>

        <Text ta="center" size="sm" c="dimmed" py="md">
          © 2026 Cricket Booking Software. All rights reserved.
        </Text>
      </Container>
    </footer>
  );
}
