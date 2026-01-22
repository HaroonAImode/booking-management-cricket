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
import { theme } from '@/styles/theme-new';

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
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        {/* Mantine Provider wraps the entire app with theme configuration */}
        <MantineProvider theme={theme} defaultColorScheme="light">
          {/* Notifications - Professional, centered, mobile-optimized */}
          <Notifications 
            position="top-center"
            zIndex={9999}
            limit={3}
            styles={{
              root: {
                position: 'fixed',
                top: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'auto',
                maxWidth: '90vw',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '0',
              },
              notification: {
                width: 'auto',
                minWidth: '280px',
                maxWidth: 'min(450px, 90vw)',
                margin: '0',
                padding: '12px 16px',
                boxSizing: 'border-box',
                pointerEvents: 'auto',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              },
              title: {
                fontSize: '14px',
                fontWeight: 600,
                lineHeight: 1.4,
                marginBottom: '2px',
                wordBreak: 'break-word',
                overflow: 'visible',
              },
              description: {
                fontSize: '13px',
                lineHeight: 1.4,
                wordBreak: 'break-word',
                overflow: 'visible',
                maxWidth: '100%',
              },
              icon: {
                flexShrink: 0,
                marginTop: '2px',
              },
              closeButton: {
                flexShrink: 0,
              },
            }}
          />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
