/**
 * Public Header Component
 * 
 * Purpose: Navigation header for public-facing pages.
 * Features:
 * - Logo and branding
 * - Main navigation links (Home, Bookings, About, Contact)
 * - Responsive mobile menu
 * - Login/Sign up buttons
 */

'use client';

import { Group, Burger, Container, Title, Box, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
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
                width: '40px',
                height: '40px',
                background: '#F5B800',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '20px',
                color: '#1A1A1A',
              }}
            >
              P
            </Box>
            <Box>
              <Title order={3} size="1.3rem" c="#1A1A1A" style={{ lineHeight: 1, marginBottom: '2px' }}>
                POWERPLAY
              </Title>
              <Text size="xs" c="#6B6B6B" style={{ lineHeight: 1, letterSpacing: '2px' }}>
                CRICKET ARENA
              </Text>
            </Box>
          </Group>
        </Link>

        {/* Desktop Navigation */}
        <Group gap="lg" visibleFrom="sm">
          <Link href="/" className={styles.link}>Home</Link>
          <Link href="/bookings" className={styles.link}>Bookings</Link>
          <Link href="/about" className={styles.link}>About</Link>
          <Link href="/contact" className={styles.link}>Contact</Link>
        </Group>

        {/* Mobile Menu Toggle */}
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="#1A1A1A" />
      </Group>
    </Container>
  );
}
