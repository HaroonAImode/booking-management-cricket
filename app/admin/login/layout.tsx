/**
 * Admin Login Layout
 * 
 * Purpose: Separate layout for login page without admin navigation
 */

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
