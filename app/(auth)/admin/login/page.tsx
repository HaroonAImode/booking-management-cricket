'use client';

/**
 * Admin Login Page
 * Authentication form for admin users
 * This page is outside the admin layout to prevent sidebar showing before login
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
  Box,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertCircle, IconTrophy, IconShield } from '@tabler/icons-react';
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
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <Container size={460}>
        <Stack gap="xl">
          {/* Header with Icon */}
          <Box style={{ textAlign: 'center' }}>
            <ThemeIcon
              size={80}
              radius="xl"
              variant="white"
              color="grape"
              style={{
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              <IconTrophy size={48} />
            </ThemeIcon>
            <Title order={1} c="white" mb="xs">
              Admin Portal
            </Title>
            <Text c="rgba(255,255,255,0.95)" size="lg">
              Cricket Booking Management System
            </Text>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert
              icon={<IconAlertCircle size={18} />}
              title="Authentication Failed"
              color="red"
              variant="filled"
            >
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Paper
            withBorder
            shadow="xl"
            p={{ base: 'lg', sm: 40 }}
            radius="lg"
            style={{
              background: 'white',
            }}
          >
            <Stack gap="xs" mb="xl">
              <Box style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IconShield size={24} color="#667eea" />
                <Title order={3}>Secure Sign In</Title>
              </Box>
              <Text c="dimmed" size="sm">
                Enter your credentials to access the admin dashboard
              </Text>
            </Stack>

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Email Address"
                  placeholder="admin@example.com"
                  type="email"
                  required
                  size="md"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={loading}
                  autoComplete="email"
                  styles={{
                    input: {
                      borderWidth: '2px',
                      '&:focus': {
                        borderColor: '#667eea',
                      },
                    },
                  }}
                />

                <PasswordInput
                  label="Password"
                  placeholder="Enter your password"
                  required
                  size="md"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={loading}
                  autoComplete="current-password"
                  styles={{
                    input: {
                      borderWidth: '2px',
                      '&:focus': {
                        borderColor: '#667eea',
                      },
                    },
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  size="lg"
                  mt="md"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    height: '50px',
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  {loading ? 'Signing In...' : 'Sign In to Dashboard'}
                </Button>
              </Stack>
            </form>
          </Paper>

          {/* Security Notice */}
          <Paper
            p="md"
            radius="md"
            style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <Text c="white" size="sm" style={{ textAlign: 'center' }}>
              🔒 This is a secure admin-only area. All login attempts are monitored
              and logged. Unauthorized access is strictly prohibited.
            </Text>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
