/**
 * Service Worker for Push Notifications
 * Handles push events and notification clicks
 */

self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activated');
  event.waitUntil(self.clients.claim());
});

/* ================= PUSH EVENT ================= */

self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received');

  let payload = {
    title: 'New Booking',
    body: 'A new booking has been submitted',
    icon: '/icon.png',
    badge: '/icon.png',
    tag: `booking-${Date.now()}`,
    url: '/admin/bookings',
    bookingId: null,
  };

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('📦 Push payload:', data);

      payload = {
        title: data.title || payload.title,
        body: data.body || payload.body,
        icon: data.icon || payload.icon,
        badge: data.badge || payload.badge,
        tag: data.tag || payload.tag,
        url: data.url || payload.url,
        bookingId: data.bookingId || null,
      };
    } catch (err) {
      console.error('❌ Failed to parse push payload', err);
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: {
      url: payload.url, // ✅ RELATIVE URL (IMPORTANT)
      bookingId: payload.bookingId,
    },
    actions: [
      { action: 'approve', title: '✅ Review & Approve' },
      { action: 'view', title: '👁️ View Details' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
      .then(() => console.log('✅ Notification shown'))
      .catch(err => console.error('❌ Notification error', err))
  );
});

/* ================= CLICK EVENT ================= */

self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event.action);

  event.notification.close();

  // ✅ ALWAYS use the correct production URL
  const PRODUCTION_URL = 'https://cricket-booking-peach.vercel.app';
  const relativeUrl = event.notification.data?.url || '/admin/bookings';
  const targetUrl = new URL(relativeUrl, PRODUCTION_URL).href;

  console.log('🔗 Opening URL:', targetUrl);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsList) => {
        // Check if already open
        for (const client of clientsList) {
          if (client.url === targetUrl && 'focus' in client) {
            console.log('✅ Focusing existing window');
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          console.log('🆕 Opening new window');
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});