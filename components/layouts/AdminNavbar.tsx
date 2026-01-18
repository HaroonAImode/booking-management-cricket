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
import { useMediaQuery } from '@mantine/hooks';

interface AdminNavbarProps {
  toggleMobile?: () => void;
  mobileOpened?: boolean;
}

export default function AdminNavbar({ toggleMobile, mobileOpened }: AdminNavbarProps) {
  const pathname = usePathname();
  const isMobile = useMediaQuery('(max-width: 768px)');

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
        
        // Auto-close sidebar on mobile when navigation link is clicked
        const handleNavClick = () => {
          if (isMobile && toggleMobile && mobileOpened) {
            toggleMobile();
          }
        };
        
        return (
          <NavLink
            key={link.href}
            component={Link}
            href={link.href}
            label={link.label}
            onClick={handleNavClick}
            leftSection={
              <ThemeIcon
                size={36}
                radius="md"
                variant={isActive ? 'gradient' : 'light'}
                gradient={
                  isActive
                    ? { from: link.color, to: link.color, deg: 135 }
                    : undefined
                }
                color={link.color}
              >
                <link.icon size={20} />
              </ThemeIcon>
            }
            active={isActive}
            styles={{
              root: {
                borderRadius: '12px',
                padding: '14px',
                minHeight: '52px',
                fontWeight: 500,
                transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                background: isActive ? 'rgba(245, 184, 0, 0.12)' : 'transparent',
                transform: 'translateX(0)',
                '&:hover': {
                  background: isActive
                    ? 'rgba(245, 184, 0, 0.18)'
                    : 'rgba(245, 184, 0, 0.06)',
                  transform: 'translateX(4px)',
                },
                '&:active': {
                  transform: 'translateX(2px) scale(0.98)',
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
