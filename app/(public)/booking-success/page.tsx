'use client';

import { Suspense } from 'react';
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

  const handleCheckBooking = () => {
    router.push('/bookings/check');
  };

  return (
    <Box style={{ background: '#FFF9E6', minHeight: '100vh', paddingTop: '70px' }}>
      <Container size="sm" py={{ base: 'sm', sm: 'md' }}>
        <Center>
          <Stack gap="md" align="center" style={{ maxWidth: '500px', width: '100%' }}>
            {/* Success Icon */}
            <ThemeIcon
              size={80}
              radius="50%"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
              }}
            >
              <IconCheck size={50} stroke={3} />
            </ThemeIcon>

            {/* Success Message */}
            <Paper
              p={{ base: 'lg', sm: 'xl' }}
              radius="lg"
              shadow="xl"
              style={{
                background: '#FFFFFF',
                border: '2px solid #10B981',
                width: '100%',
              }}
            >
              <Stack gap="md" align="center">
                <Title
                  order={2}
                  ta="center"
                  style={{
                    color: '#1A1A1A',
                    fontSize: 'clamp(18px, 5vw, 24px)',
                    fontWeight: 700,
                  }}
                >
                  ✅ Booking Request Submitted!
                </Title>

                {bookingNumber && (
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #10B981',
                      width: '100%',
                    }}
                  >
                    <Text ta="center" fw={600} c="#059669" size="sm">
                      Booking #{bookingNumber}
                    </Text>
                  </Paper>
                )}

                <Stack gap="xs" style={{ width: '100%' }}>
                  <Text
                    ta="center"
                    size="sm"
                    style={{
                      color: '#4A4A4A',
                      lineHeight: 1.5,
                      fontSize: 'clamp(13px, 3.5vw, 15px)',
                    }}
                  >
                    Your booking has been sent to the admin for review and approval.
                  </Text>

                  <Paper
                    p="sm"
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
                      style={{ fontSize: 'clamp(12px, 3vw, 13px)' }}
                    >
                      ⏱️ Check your booking status after 10-15 minutes
                    </Text>
                  </Paper>

                  <Text
                    ta="center"
                    size="xs"
                    c="dimmed"
                    style={{ fontSize: 'clamp(11px, 2.8vw, 13px)' }}
                  >
                    You will be able to view the approval status and download your booking
                    confirmation slip.
                  </Text>
                </Stack>

                {/* Check Booking Button */}
                <Button
                  size="lg"
                  fullWidth
                  leftSection={<IconSearch size={18} />}
                  onClick={handleCheckBooking}
                  style={{
                    background: '#F5B800',
                    color: '#1A1A1A',
                    fontWeight: 700,
                    height: '50px',
                    fontSize: 'clamp(13px, 3.5vw, 15px)',
                    marginTop: '4px',
                  }}
                  styles={{
                    root: {
                      '&:hover': {
                        background: '#FFDD80',
                      },
                    },
                  }}
                >
                  Check Booking Status
                </Button>

                <Text
                  ta="center"
                  size="xs"
                  c="dimmed"
                  style={{ marginTop: '4px', fontSize: 'clamp(10px, 2.5vw, 11px)' }}
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
        <Box style={{ background: '#FFF9E6', minHeight: '100vh', paddingTop: '70px' }}>
          <Center style={{ height: '70vh' }}>
            <Loader color="#F5B800" size="lg" />
          </Center>
        </Box>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  );
}
