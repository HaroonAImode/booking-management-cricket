'use client';

/**
 * Admin Login Page
 * Authentication form for admin users
 * This page is outside the admin layout to prevent sidebar showing before login
 */

import { useState, useEffect, Suspense } from 'react';
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
  Loader,
  Center,
} from '@mantine/core';
import { IconAlertCircle, IconTrophy, IconShield } from '@tabler/icons-react';
import { signInAdmin } from '@/lib/supabase/auth';

function LoginForm() {
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

      if (result.success && result.profile) {
        // Route based on user role
        let redirectTo = searchParams.get('redirect');
        
        if (!redirectTo) {
          // Default routing based on role
          if (result.profile.role === 'admin') {
            redirectTo = '/admin/dashboard';
          } else if (result.profile.role === 'ground_manager') {
            redirectTo = '/admin/bookings'; // Ground managers see bookings page
          } else {
            redirectTo = '/admin/dashboard';
          }
        }
        
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
        background: '#1A1A1A',
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
            <Box
              style={{
                width: '80px',
                height: '80px',
                background: '#F5B800',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '48px',
                color: '#1A1A1A',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(245, 184, 0, 0.3)',
              }}
            >
              P
            </Box>
            <Title order={1} c="white" mb="xs" fw={900} style={{ letterSpacing: '1px' }}>
              POWERPLAY ADMIN
            </Title>
            <Text c="#F5B800" size="sm" fw={700} style={{ letterSpacing: '2px' }}>
              CRICKET ARENA
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
                <IconShield size={24} color="#F5B800" />
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
                    background: '#F5B800',
                    color: '#1A1A1A',
                    height: '50px',
                    fontSize: '16px',
                    fontWeight: 700,
                  }}
                  styles={{
                    root: {
                      '&:hover': {
                        background: '#FFDD80',
                      },
                    },
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
              background: 'rgba(245, 184, 0, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(245, 184, 0, 0.3)',
            }}
          >
            <Text c="white" size="sm" style={{ textAlign: 'center' }}>
              🔒 Secure admin-only area. All login attempts are monitored.
              Unauthorized access is prohibited.
            </Text>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <Box
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Center>
            <Stack align="center" gap="md">
              <Loader size="lg" color="white" />
              <Text c="white" size="lg">Loading...</Text>
            </Stack>
          </Center>
        </Box>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
