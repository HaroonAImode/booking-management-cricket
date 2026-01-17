/**
 * Admin Navbar Component
 * 
 * Purpose: Sidebar navigation for admin panel.
 * Features:
 * - Navigation links to admin pages
 * - Icons for each section
 * - Active link highlighting
 * - Collapsible on mobile
 */

'use client';

import { Stack, NavLink, Text, Divider, Box, ThemeIcon, Group } from '@mantine/core';
import { IconDashboard, IconCalendar, IconClipboardList, IconUsers, IconSettings, IconChartBar } from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminNavbar() {
  const pathname = usePathname();

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: IconDashboard, color: 'yellow' },
    { href: '/admin/calendar', label: 'Calendar', icon: IconCalendar, color: 'dark' },
    { href: '/admin/bookings', label: 'Bookings', icon: IconClipboardList, color: 'yellow' },
    { href: '/admin/settings', label: 'Settings', icon: IconSettings, color: 'dark' },
  ];

  return (
    <Stack gap="xs">
      <Box mb="md">
        <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="xs">
          Navigation
        </Text>
        <Divider />
      </Box>
      
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <NavLink
            key={link.href}
            component={Link}
            href={link.href}
            label={link.label}
            leftSection={
              <ThemeIcon
                size={32}
                radius="md"
                variant={isActive ? 'gradient' : 'light'}
                gradient={
                  isActive
                    ? { from: link.color, to: link.color, deg: 135 }
                    : undefined
                }
                color={link.color}
              >
                <link.icon size={18} />
              </ThemeIcon>
            }
            active={isActive}
            styles={{
              root: {
                borderRadius: '12px',
                padding: '12px',
                fontWeight: 500,
                transition: 'all 150ms ease',
                background: isActive ? 'rgba(245, 184, 0, 0.1)' : 'transparent',
                '&:hover': {
                  background: isActive
                    ? 'rgba(245, 184, 0, 0.15)'
                    : 'rgba(245, 184, 0, 0.05)',
                },
              },
              label: {
                fontSize: '15px',
                color: isActive ? '#1A1A1A' : '#4A4A4A',
                fontWeight: isActive ? 700 : 500,
              },
            }}
          />
        );
      })}
      
      <Divider my="md" />
      
      <Box>
        <Text size="xs" c="dimmed" ta="center">
          Admin Panel v1.0
        </Text>
      </Box>
    </Stack>
  );
}
