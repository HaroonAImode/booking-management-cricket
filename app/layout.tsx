/**
 * Root Layout Component
 * 
 * Purpose: This is the top-level layout that wraps all pages in the application.
 * It sets up:
 * - HTML structure and metadata
 * - Mantine UI theme provider
 * - Global styles
 * - Color scheme management
 * 
 * All pages in the app will be rendered within this layout.
 */

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@/styles/globals.css';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '@/styles/theme';

export const metadata = {
  title: 'Powerplay Cricket Arena - Book Your Slot',
  description: 'Professional cricket ground booking and management system with real-time slot availability',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Mantine color scheme script - prevents flash of unstyled content */}
        <ColorSchemeScript />
      </head>
      <body>
        {/* Mantine Provider wraps the entire app with theme configuration */}
        <MantineProvider theme={theme}>
          {/* Notifications for toast messages - responsive positioning */}
          <Notifications 
            position="top-center"
            zIndex={9999}
            limit={3}
            styles={{
              root: {
                maxWidth: '95vw',
                width: '100%',
                top: '70px',
              },
              notification: {
                maxWidth: '500px',
                width: '95vw',
                margin: '0 auto',
                boxSizing: 'border-box',
                padding: '16px',
                minHeight: '80px',
              },
              title: {
                marginBottom: '8px',
                fontSize: '15px',
                fontWeight: 600,
                lineHeight: 1.4,
              },
              description: {
                fontSize: '14px',
                lineHeight: 1.5,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
              },
            }}
          />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
