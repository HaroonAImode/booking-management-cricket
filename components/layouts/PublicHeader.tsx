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

import { Group, Burger, Container, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import styles from './PublicHeader.module.css';

export default function PublicHeader() {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Container size="xl" h="100%">
      <Group justify="space-between" h="100%">
        {/* Logo/Brand */}
        <Link href="/" className={styles.logo}>
          <Title order={3}>Cricket Booking</Title>
        </Link>

        {/* Desktop Navigation */}
        <Group gap="lg" visibleFrom="sm">
          <Link href="/" className={styles.link}>Home</Link>
          <Link href="/bookings" className={styles.link}>Bookings</Link>
          <Link href="/about" className={styles.link}>About</Link>
          <Link href="/contact" className={styles.link}>Contact</Link>
        </Group>

        {/* Mobile Menu Toggle */}
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
      </Group>
    </Container>
  );
}
