'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Paper,
  Stack,
  Title,
  Text,
  Button,
  Box,
  ThemeIcon,
  Center,
  Loader,
} from '@mantine/core';
import { IconCheck, IconSearch } from '@tabler/icons-react';

function BookingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingNumber = searchParams.get('booking');
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCheckBooking = () => {
    router.push('/bookings/check');
  };

  return (
    <Box style={{ background: '#FFF9E6', minHeight: '100vh', paddingTop: '80px' }}>
      <Container size="sm" py={{ base: 40, sm: 60 }}>
        <Center>
          <Stack gap="xl" align="center" style={{ maxWidth: '500px', width: '100%' }}>
            {/* Success Icon */}
            <ThemeIcon
              size={100}
              radius="50%"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
              }}
            >
              <IconCheck size={60} stroke={3} />
            </ThemeIcon>

            {/* Success Message */}
            <Paper
              p={{ base: 'xl', sm: 40 }}
              radius="lg"
              shadow="xl"
              style={{
                background: '#FFFFFF',
                border: '2px solid #10B981',
                width: '100%',
              }}
            >
              <Stack gap="lg" align="center">
                <Title
                  order={2}
                  ta="center"
                  style={{
                    color: '#1A1A1A',
                    fontSize: 'clamp(20px, 5vw, 28px)',
                    fontWeight: 700,
                  }}
                >
                  ✅ Booking Request Submitted!
                </Title>

                {bookingNumber && (
                  <Paper
                    p="md"
                    radius="md"
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #10B981',
                      width: '100%',
                    }}
                  >
                    <Text ta="center" fw={600} c="#059669">
                      Booking #{bookingNumber}
                    </Text>
                  </Paper>
                )}

                <Stack gap="sm" style={{ width: '100%' }}>
                  <Text
                    ta="center"
                    size="md"
                    style={{
                      color: '#4A4A4A',
                      lineHeight: 1.6,
                      fontSize: 'clamp(14px, 3.5vw, 16px)',
                    }}
                  >
                    Your booking has been sent to the admin for review and approval.
                  </Text>

                  <Paper
                    p="md"
                    radius="md"
                    style={{
                      background: '#FEF3C7',
                      border: '1px solid #F59E0B',
                    }}
                  >
                    <Text
                      ta="center"
                      size="sm"
                      fw={600}
                      c="#92400E"
                      style={{ fontSize: 'clamp(13px, 3vw, 14px)' }}
                    >
                      ⏱️ Check your booking status after{' '}
                      {countdown > 0 ? `${countdown} seconds` : '10-15 minutes'}
                    </Text>
                  </Paper>

                  <Text
                    ta="center"
                    size="sm"
                    c="dimmed"
                    style={{ fontSize: 'clamp(12px, 3vw, 14px)' }}
                  >
                    You will be able to view the approval status and download your booking
                    confirmation slip.
                  </Text>
                </Stack>

                {/* Check Booking Button */}
                <Button
                  size="lg"
                  fullWidth
                  leftSection={<IconSearch size={20} />}
                  onClick={handleCheckBooking}
                  disabled={countdown > 0}
                  style={{
                    background: countdown > 0 ? '#D1D5DB' : '#F5B800',
                    color: countdown > 0 ? '#6B7280' : '#1A1A1A',
                    fontWeight: 700,
                    height: '56px',
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    marginTop: '8px',
                  }}
                  styles={{
                    root: {
                      '&:hover': {
                        background: countdown > 0 ? '#D1D5DB' : '#FFDD80',
                      },
                    },
                  }}
                >
                  {countdown > 0 ? `Wait ${countdown}s` : 'Check Booking Status'}
                </Button>

                <Text
                  ta="center"
                  size="xs"
                  c="dimmed"
                  style={{ marginTop: '8px', fontSize: 'clamp(11px, 2.5vw, 12px)' }}
                >
                  💡 Tip: Search using your name or phone number
                </Text>
              </Stack>
            </Paper>
          </Stack>
        </Center>
      </Container>
    </Box>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <Box style={{ background: '#FFF9E6', minHeight: '100vh', paddingTop: '80px' }}>
          <Center style={{ height: '80vh' }}>
            <Loader color="#F5B800" size="lg" />
          </Center>
        </Box>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  );
}
