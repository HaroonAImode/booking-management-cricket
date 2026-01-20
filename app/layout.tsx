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
          {/* Notifications for toast messages - fully responsive */}
          <Notifications 
            position="top-center"
            zIndex={9999}
            limit={3}
            styles={{
              root: {
                maxWidth: '100vw',
                width: '100%',
                top: '70px',
                left: 0,
                right: 0,
                padding: '0 8px',
                pointerEvents: 'none',
              },
              notification: {
                maxWidth: '500px',
                width: 'calc(100vw - 32px)',
                margin: '0 auto',
                boxSizing: 'border-box',
                padding: '12px 16px',
                minHeight: 'auto',
                pointerEvents: 'auto',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                '@media (max-width: 768px)': {
                  width: 'calc(100vw - 24px)',
                  maxWidth: '100%',
                  padding: '12px 14px',
                  margin: '0 auto 8px',
                },
              },
              title: {
                marginBottom: '4px',
                fontSize: '14px',
                fontWeight: 600,
                lineHeight: 1.3,
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                overflow: 'visible',
                textOverflow: 'clip',
                '@media (max-width: 768px)': {
                  fontSize: '13px',
                  marginBottom: '4px',
                },
              },
              description: {
                fontSize: '13px',
                lineHeight: 1.4,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflow: 'visible',
                textOverflow: 'clip',
                '@media (max-width: 768px)': {
                  fontSize: '12px',
                  lineHeight: 1.3,
                },
              },
              icon: {
                marginRight: '10px',
                '@media (max-width: 768px)': {
                  marginRight: '8px',
                  width: '18px',
                  height: '18px',
                },
              },
              closeButton: {
                '@media (max-width: 768px)': {
                  width: '24px',
                  height: '24px',
                },
              },
            }}
          />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
