/**
 * Auth Layout
 * 
 * Purpose: Layout for authentication pages (login, etc.)
 * No sidebar, no admin navigation - clean authentication experience
 */

import { ReactNode } from 'react';

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
