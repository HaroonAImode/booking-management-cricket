'use client';

/**
 * Admin Login Page
 * Authentication form for admin users
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Container,
  Alert,
  Stack,
} from '@mantine/core';
import { IconAlertCircle, IconLock } from '@tabler/icons-react';
import { signInAdmin } from '@/lib/supabase/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Check for error in URL params
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError === 'unauthorized') {
      setError('Access denied. Admin privileges required.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signInAdmin(formData);

      if (result.success) {
        // Redirect to dashboard or original destination
        const redirectTo = searchParams.get('redirect') || '/admin/dashboard';
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={100}>
      <Stack gap="lg">
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <IconLock size={50} style={{ margin: '0 auto 20px' }} />
          <Title order={2}>Admin Login</Title>
          <Text c="dimmed" size="sm" mt="sm">
            Sign in to access the admin dashboard
          </Text>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <Paper withBorder shadow="md" p={30} radius="md">
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Email Address"
                placeholder="admin@example.com"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={loading}
                autoComplete="email"
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                disabled={loading}
                autoComplete="current-password"
              />

              <Button
                type="submit"
                fullWidth
                loading={loading}
                mt="md"
              >
                Sign In
              </Button>
            </Stack>
          </form>
        </Paper>

        {/* Info Text */}
        <Text c="dimmed" size="sm" style={{ textAlign: 'center' }}>
          This is a secure admin-only area. Unauthorized access is prohibited.
        </Text>
      </Stack>
    </Container>
  );
}
