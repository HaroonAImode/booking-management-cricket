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
    icon: '/icon.png',
    badge: '/icon.png',
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
      console.log('Parsed push data:', data);
      
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: `${data.tag || notificationData.tag}-${Date.now()}`, // Unique tag to bypass throttling
        renotify: true, // Force new notification sound
        requireInteraction: true,
        silent: false, // Enable sound
        vibrate: [300, 100, 300, 100, 300], // Strong vibration pattern
        sound: '/notification.mp3', // Custom sound (if browser supports)
        data: {
          url: data.url || notificationData.data.url,
          bookingId: data.bookingId || null,
        },
        actions: [
          {
            action: 'approve',
            title: '✅ Review & Approve',
          },
          {
            action: 'view',
            title: '👁️ View Details',
          },
        ],
        // Show expanded notification on Android
        image: data.icon || '/icon.png',
      };
    } catch (error) {
      console.error('Error parsing notification data:', error);
    }
  }

  console.log('Showing notification with data:', notificationData);

  const promiseChain = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    renotify: notificationData.renotify,
    requireInteraction: notificationData.requireInteraction,
    silent: notificationData.silent,
    vibrate: notificationData.vibrate,
    sound: notificationData.sound,
    data: notificationData.data,
    actions: notificationData.actions,
    image: notificationData.image,
  }).then(() => {
    console.log('✅ Notification displayed successfully!');
  }).catch((error) => {
    console.error('❌ Error displaying notification:', error);
  });

  event.waitUntil(promiseChain);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);
  console.log('Action:', event.action);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/admin/bookings';

  // Handle different actions
  if (event.action === 'approve' || event.action === 'view') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);
          
          if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
            client.postMessage({ action: 'navigate', url: urlToOpen });
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else {
    // Default action - open bookings page
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === new URL(urlToOpen, self.location.origin).href && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});
