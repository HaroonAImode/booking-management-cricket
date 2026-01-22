/**
 * Notification Panel Component
 * 
 * Purpose: Display admin notifications in a dropdown panel
 * Features:
 * - List notifications with icons
 * - Show unread/read status
 * - Mark individual as read
 * - Mark all as read
 * - Filter by read status
 * - Link to related bookings
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Menu,
  ScrollArea,
  Stack,
  Text,
  Group,
  Badge,
  ActionIcon,
  Button,
  Divider,
  ThemeIcon,
  Box,
} from '@mantine/core';
import {
  IconBell,
  IconCheck,
  IconChecks,
  IconCalendar,
  IconCurrencyRupee,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications as mantineNotifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import EmptyState from './ui/EmptyState';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  booking_id: string | null;
  booking_number: string | null;
  customer_name: string | null;
  priority: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationPanel() {
  const router = useRouter();
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications?limit=20');
      const result = await response.json();

      if (result.success) {
        setNotificationsList(result.notifications || []);
        setUnreadCount(result.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/admin/notifications/${notificationId}/read`,
        { method: 'PATCH' }
      );

      const result = await response.json();

      if (result.success) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/notifications/mark-all-read', {
        method: 'PATCH',
      });

      const result = await response.json();

      if (result.success) {
        mantineNotifications.show({
          title: '✅ All Marked as Read',
          message: `${result.count || 0} notifications marked as read`,
          color: 'green',
          autoClose: 3000,
          icon: <IconChecks size={18} />,
        });
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      mantineNotifications.show({
        title: '❌ Error',
        message: 'Could not mark notifications as read',
        color: 'red',
        autoClose: 4000,
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_booking':
        return <IconCalendar size={18} />;
      case 'booking_approved':
        return <IconCheck size={18} />;
      case 'payment_completed':
        return <IconCurrencyRupee size={18} />;
      case 'booking_cancelled':
        return <IconX size={18} />;
      default:
        return <IconAlertCircle size={18} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_booking':
        return 'blue';
      case 'booking_approved':
        return 'green';
      case 'payment_completed':
        return 'teal';
      case 'booking_cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate to relevant page
    if (notification.booking_id) {
      setOpened(false);
      if (notification.notification_type === 'new_booking') {
        router.push('/admin/bookings');
      } else {
        router.push('/admin/calendar');
      }
    }
  };

  return (
    <Menu
      shadow="md"
      width={400}
      position="bottom-end"
      opened={opened}
      onChange={setOpened}
      closeOnClickOutside={true}
      closeOnEscape={true}
      withinPortal={true}
      styles={{
        dropdown: {
          maxWidth: 'calc(100vw - 20px)',
          right: '10px !important',
        },
      }}
    >
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          size="lg"
          pos="relative"
          styles={{
            root: {
              minWidth: '44px',
              minHeight: '44px',
            },
          }}
        >
          <IconBell size={22} />
          {unreadCount > 0 && (
            <Badge
              size="xs"
              variant="filled"
              color="red"
              pos="absolute"
              top={-2}
              right={-2}
              style={{ pointerEvents: 'none' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown p={0}>
        {/* Header */}
        <Group justify="space-between" p="sm" pb="xs" wrap="nowrap">
          <Text fw={600} size={{ base: 'md', sm: 'lg' }}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconChecks size={14} />}
              onClick={markAllAsRead}
              loading={loading}
              style={{ flexShrink: 0 }}
            >
              <Text visibleFrom="sm">Mark all read</Text>
              <Text hiddenFrom="sm">Read</Text>
            </Button>
          )}
        </Group>

        <Divider />

        {/* Notifications List */}
        <ScrollArea h={{ base: 300, sm: 400 }} type="auto">
          {notificationsList.length === 0 ? (
            <Box p="md">
              <EmptyState
                icon={<IconBell size={48} />}
                title="No Notifications"
                description="You're all caught up! New notifications will appear here."
              />
            </Box>
          ) : (
            <Stack gap={0}>
              {notificationsList.map((notification) => (
                <Box
                  key={notification.id}
                  p={{ base: 'xs', sm: 'md' }}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: notification.is_read
                      ? 'transparent'
                      : 'var(--mantine-color-blue-0)',
                    borderLeft: notification.is_read
                      ? 'none'
                      : '3px solid var(--mantine-color-blue-6)',
                    transition: 'background-color 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = notification.is_read
                      ? 'var(--mantine-color-gray-0)'
                      : 'var(--mantine-color-blue-1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.is_read
                      ? 'transparent'
                      : 'var(--mantine-color-blue-0)';
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Group align="flex-start" gap={{ base: 'xs', sm: 'sm' }} wrap="nowrap">
                    <ThemeIcon
                      size={{ base: 'md', sm: 'lg' }}
                      variant="light"
                      color={getNotificationColor(notification.notification_type)}
                      style={{ flexShrink: 0 }}
                    >
                      {getNotificationIcon(notification.notification_type)}
                    </ThemeIcon>

                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" gap="xs" wrap="nowrap">
                        <Text 
                          size={{ base: 'xs', sm: 'sm' }} 
                          fw={600} 
                          lineClamp={1}
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          {notification.title}
                        </Text>
                        {notification.priority === 'high' && (
                          <Badge size="xs" color="red" variant="light" style={{ flexShrink: 0 }}>
                            High
                          </Badge>
                        )}
                      </Group>

                      <Text 
                        size="xs" 
                        c="dimmed" 
                        lineClamp={2}
                        style={{ 
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {notification.message}
                      </Text>

                      {notification.booking_number && (
                        <Badge size="xs" variant="dot" color="gray">
                          {notification.booking_number}
                        </Badge>
                      )}

                      <Text size="xs" c="dimmed">
                        {new Date(notification.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Stack>
                  </Group>
                </Box>
              ))}
            </Stack>
          )}
        </ScrollArea>

        <Divider />

        {/* Footer */}
        <Group justify="center" p="xs">
          <Button
            variant="subtle"
            size="xs"
            fullWidth
            onClick={() => {
              setOpened(false);
              router.push('/admin/bookings');
            }}
          >
            View All Bookings
          </Button>
        </Group>
      </Menu.Dropdown>
    </Menu>
  );
}
