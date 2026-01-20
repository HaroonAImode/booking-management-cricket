/**
 * Service Worker for Push Notifications
 * Handles push events and notification clicks
 */

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received', event);

  let notificationData = {
    title: 'New Booking',
    body: 'A new booking has been submitted',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'booking-notification',
    requireInteraction: true,
    data: {
      url: '/admin/bookings',
      bookingId: null,
    },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
          url: data.url || notificationData.data.url,
          bookingId: data.bookingId || null,
        },
        actions: [
          {
            action: 'open',
            title: 'Review & Approve',
            icon: '/icon-192.png',
          },
          {
            action: 'close',
            title: 'Dismiss',
          },
        ],
      };
    } catch (error) {
      console.error('Error parsing notification data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      data: notificationData.data,
      actions: notificationData.actions,
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/admin/bookings';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open with this URL
      for (const client of clientList) {
        if (client.url === new URL(urlToOpen, self.location.origin).href && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
