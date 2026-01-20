/**
 * Push Notification Toggle Component
 * Allows admins to enable/disable push notifications on their device
 */

'use client';

import { useState, useEffect } from 'react';
import { Button, Paper, Text, Stack, Alert, Group, Switch } from '@mantine/core';
import { IconBell, IconBellOff, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  isPushSupported,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPush,
  getExistingSubscription,
  unsubscribeFromPush,
} from '@/lib/push-notifications';

interface PushNotificationToggleProps {
  userId: string;
}

export default function PushNotificationToggle({ userId }: PushNotificationToggleProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setIsSupported(isPushSupported());

    if (isPushSupported()) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await getExistingSubscription(registration);
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);

    try {
      // Request permission
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        notifications.show({
          title: 'Permission Denied',
          message: 'Please allow notifications in your browser settings',
          color: 'red',
          icon: <IconAlertCircle size={18} />,
        });
        setIsLoading(false);
        return;
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push
      const subscription = await subscribeToPush(registration);

      // Save subscription to database
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsSubscribed(true);

      notifications.show({
        title: 'Notifications Enabled! 🔔',
        message: 'You will now receive push notifications for new bookings',
        color: 'green',
        icon: <IconCheck size={18} />,
      });

      // Send test notification
      await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🎉 Push Notifications Enabled!',
          message: 'You will receive notifications like this when customers book',
          bookingId: null,
          customerName: 'Test',
        }),
      });
    } catch (error: any) {
      console.error('Error enabling notifications:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to enable notifications',
        color: 'red',
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await getExistingSubscription(registration);

      if (subscription) {
        // Unsubscribe from database
        await fetch(
          `/api/notifications/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}&userId=${userId}`,
          { method: 'DELETE' }
        );

        // Unsubscribe from push
        await unsubscribeFromPush(registration);
      }

      setIsSubscribed(false);

      notifications.show({
        title: 'Notifications Disabled',
        message: 'You will no longer receive push notifications',
        color: 'gray',
        icon: <IconBellOff size={18} />,
      });
    } catch (error: any) {
      console.error('Error disabling notifications:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to disable notifications',
        color: 'red',
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Alert icon={<IconAlertCircle size={18} />} color="orange" variant="light">
        Push notifications are not supported on this device/browser
      </Alert>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm">
            <IconBell size={20} />
            <div>
              <Text fw={600} size="sm">
                Push Notifications
              </Text>
              <Text size="xs" c="dimmed">
                Get notified instantly when customers book
              </Text>
            </div>
          </Group>

          <Switch
            checked={isSubscribed}
            onChange={(event) => {
              if (event.currentTarget.checked) {
                handleEnableNotifications();
              } else {
                handleDisableNotifications();
              }
            }}
            disabled={isLoading}
            color="green"
            size="md"
          />
        </Group>

        {!isSubscribed && permission === 'default' && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            <Text size="xs">
              Enable push notifications to receive instant alerts on your phone when new bookings
              arrive - even when the browser is closed!
            </Text>
          </Alert>
        )}

        {!isSubscribed && permission === 'denied' && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            <Text size="xs">
              Notifications are blocked. Please enable them in your browser settings:
              <br />
              <strong>Settings → Site Settings → Notifications</strong>
            </Text>
          </Alert>
        )}

        {isSubscribed && (
          <Alert icon={<IconCheck size={16} />} color="green" variant="light">
            <Text size="xs">
              ✅ Push notifications are active! You'll receive alerts for new bookings.
            </Text>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
