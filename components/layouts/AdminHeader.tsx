/**
 * Admin Header Component
 * 
 * Purpose: Header for admin panel pages.
 * Features:
 * - Admin branding
 * - User profile display
 * - Logout functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Group, 
  Title, 
  Container, 
  Menu, 
  Avatar, 
  Text, 
  UnstyledButton,
  rem,
  Burger,
  Box,
  ThemeIcon,
} from '@mantine/core';
import { 
  IconChevronDown, 
  IconLogout, 
  IconUser,
  IconShield,
  IconTrophy,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getAdminProfile, signOutAdmin, type AdminProfile } from '@/lib/supabase/auth';
import NotificationPanel from '@/components/NotificationPanel';

interface AdminHeaderProps {
  mobileOpened: boolean;
  desktopOpened: boolean;
  toggleMobile: () => void;
  toggleDesktop: () => void;
}

export default function AdminHeader({
  mobileOpened,
  desktopOpened,
  toggleMobile,
  toggleDesktop,
}: AdminHeaderProps) {
  const router = useRouter();
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Load admin profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const profile = await getAdminProfile();
    setAdminProfile(profile);
  };

  const handleLogout = async () => {
    setLoading(true);
    
    try {
      const result = await signOutAdmin();
      
      if (result.success) {
        notifications.show({
          title: '✅ Logged Out Successfully',
          message: 'See you next time!',
          color: 'blue',
          autoClose: 3000,
          icon: <IconLogout size={18} />,
        });
        
        router.push('/admin/login');
        router.refresh();
      } else {
        notifications.show({
          title: '❌ Logout Failed',
          message: result.error || 'Could not log out. Please try again.',
          color: 'red',
          autoClose: 4000,
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      notifications.show({
        title: '❌ Error',
        message: 'An unexpected error occurred during logout',
        color: 'red',
        autoClose: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'red';
      case 'admin':
        return 'blue';
      case 'staff':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'staff':
        return 'Staff';
      default:
        return role;
    }
  };

  return (
    <Container size="xl" h="100%" px={{ base: 'xs', sm: 'md' }}>
      <Group justify="space-between" h="100%" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          {/* Mobile burger menu */}
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom="sm"
            size="sm"
            color="white"
          />
          {/* Desktop burger menu */}
          <Burger
            opened={desktopOpened}
            onClick={toggleDesktop}
            visibleFrom="sm"
            size="sm"
            color="white"
          />
          
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon
              size={40}
              radius="md"
              variant="white"
              color="grape"
            >
              <IconTrophy size={24} />
            </ThemeIcon>
            <Box visibleFrom="xs">
              <Title order={4} c="white" size={{ base: 'h5', sm: 'h4' }}>
                Cricket Admin
              </Title>
            </Box>
          </Group>
        </Group>
        
        {adminProfile && (
          <Group gap={{ base: 'xs', sm: 'md' }} wrap="nowrap">
            <NotificationPanel />
            
            <Menu shadow="md" width={250} position="bottom-end">
              <Menu.Target>
                <UnstyledButton
                  style={{
                    padding: '6px 10px',
                    borderRadius: '12px',
                    transition: 'all 150ms ease',
                    background: 'rgba(255, 255, 255, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Avatar
                      color="white"
                      variant="filled"
                      radius="xl"
                      size="sm"
                      styles={{
                        root: {
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: '2px solid white',
                        },
                      }}
                    >
                      <IconUser size={18} />
                    </Avatar>
                    <Box visibleFrom="xs">
                      <div style={{ flex: 1 }}>
                        <Text size="sm" fw={600} c="white">
                          {adminProfile.full_name}
                        </Text>
                        <Text size="xs" c="rgba(255,255,255,0.9)">
                          {getRoleLabel(adminProfile.role)}
                        </Text>
                      </div>
                    </Box>
                    <IconChevronDown size={16} color="white" />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                
                <Menu.Item
                  leftSection={<IconUser style={{ width: rem(14), height: rem(14) }} />}
                  disabled
                >
                  <div>
                    <Text size="sm">{adminProfile.full_name}</Text>
                    <Text size="xs" c="dimmed">{adminProfile.email}</Text>
                  </div>
                </Menu.Item>

                <Menu.Item
                  leftSection={<IconShield style={{ width: rem(14), height: rem(14) }} />}
                  color={getRoleBadgeColor(adminProfile.role)}
                  disabled
                >
                  Role: {getRoleLabel(adminProfile.role)}
                </Menu.Item>

                <Menu.Divider />

                <Menu.Item
                  color="red"
                  leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                  onClick={handleLogout}
                  disabled={loading}
                >
                  {loading ? 'Logging out...' : 'Logout'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        )}
      </Group>
    </Container>
  );
}
