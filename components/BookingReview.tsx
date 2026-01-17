'use client';

import {
  Modal,
  Stack,
  Text,
  Group,
  Badge,
  Paper,
  Divider,
  Button,
  Image,
  Box,
  SimpleGrid,
  Title,
  Alert,
} from '@mantine/core';
import {
  IconUser,
  IconPhone,
  IconCalendar,
  IconClock,
  IconCurrencyDollar,
  IconReceipt,
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
} from '@tabler/icons-react';
import { BookingSummary } from '@/types';
import { formatTimeDisplay } from '@/lib/supabase/bookings';

interface BookingReviewProps {
  opened: boolean;
  onClose: () => void;
  bookingData: BookingSummary | null;
  onEdit: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export default function BookingReview({
  opened,
  onClose,
  bookingData,
  onEdit,
  onConfirm,
  isSubmitting,
}: BookingReviewProps) {
  if (!bookingData) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const daySlots = bookingData.day_slots || [];
  const nightSlots = bookingData.night_slots || [];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconReceipt size={24} />
          <Title order={3}>Review Booking Details</Title>
        </Group>
      }
      size="lg"
      centered
      padding="lg"
    >
      <Stack gap="lg">
        {/* Important Notice */}
        <Alert icon={<IconAlertCircle size="1rem" />} color="blue" variant="light">
          Please review all details carefully before confirming. You can edit any information if
          needed.
        </Alert>

        {/* Customer Information */}
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text size="sm" fw={700} tt="uppercase" c="dimmed">
              Customer Information
            </Text>
            <Divider />

            <Group gap="xs">
              <IconUser size={16} />
              <Text size="sm" fw={600}>
                Name:
              </Text>
              <Text size="sm">{bookingData.customer.name}</Text>
            </Group>

            <Group gap="xs">
              <IconPhone size={16} />
              <Text size="sm" fw={600}>
                Phone:
              </Text>
              <Text size="sm">{bookingData.customer.phone || 'Not provided'}</Text>
            </Group>
          </Stack>
        </Paper>

        {/* Booking Details */}
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text size="sm" fw={700} tt="uppercase" c="dimmed">
              Booking Details
            </Text>
            <Divider />

            <Group gap="xs">
              <IconCalendar size={16} />
              <Text size="sm" fw={600}>
                Date:
              </Text>
              <Text size="sm">{formatDate(bookingData.booking_date)}</Text>
            </Group>

            <Group gap="xs">
              <IconClock size={16} />
              <Text size="sm" fw={600}>
                Total Hours:
              </Text>
              <Badge size="lg" color="blue">
                {bookingData.total_hours} {bookingData.total_hours === 1 ? 'hour' : 'hours'}
              </Badge>
            </Group>

            <Stack gap="xs" mt="xs">
              <Text size="sm" fw={600}>
                Selected Time Slots:
              </Text>

              {daySlots.length > 0 && (
                <Box>
                  <Text size="xs" c="dimmed" mb={4}>
                    Day Slots (PKR 1,500/hr):
                  </Text>
                  <Group gap="xs">
                    {daySlots.map((hour) => (
                      <Badge key={hour} size="md" color="blue" variant="light">
                        {formatTimeDisplay(hour)}
                      </Badge>
                    ))}
                  </Group>
                </Box>
              )}

              {nightSlots.length > 0 && (
                <Box>
                  <Text size="xs" c="dimmed" mb={4}>
                    Night Slots (PKR 2,000/hr):
                  </Text>
                  <Group gap="xs">
                    {nightSlots.map((hour) => (
                      <Badge key={hour} size="md" color="violet" variant="light">
                        {formatTimeDisplay(hour)} 🌙
                      </Badge>
                    ))}
                  </Group>
                </Box>
              )}
            </Stack>

            {bookingData.customer_notes && (
              <>
                <Divider />
                <Stack gap={4}>
                  <Text size="sm" fw={600}>
                    Additional Notes:
                  </Text>
                  <Text size="sm" c="dimmed">
                    {bookingData.customer_notes}
                  </Text>
                </Stack>
              </>
            )}
          </Stack>
        </Paper>

        {/* Payment Information */}
        <Paper p="md" withBorder bg="blue.0">
          <Stack gap="sm">
            <Text size="sm" fw={700} tt="uppercase" c="dimmed">
              Payment Information
            </Text>
            <Divider />

            <SimpleGrid cols={2}>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Total Amount
                </Text>
                <Group gap="xs">
                  <IconCurrencyDollar size={18} />
                  <Text size="lg" fw={700}>
                    PKR {bookingData.total_amount.toLocaleString()}
                  </Text>
                </Group>
              </Stack>

              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Advance Payment (Required)
                </Text>
                <Group gap="xs">
                  <IconCurrencyDollar size={18} />
                  <Text size="lg" fw={700} c="green">
                    PKR {bookingData.advance_payment.toLocaleString()}
                  </Text>
                </Group>
              </Stack>

              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Remaining Payment
                </Text>
                <Group gap="xs">
                  <IconCurrencyDollar size={18} />
                  <Text size="lg" fw={700} c="orange">
                    PKR {bookingData.remaining_payment.toLocaleString()}
                  </Text>
                </Group>
              </Stack>

              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Payment Method
                </Text>
                <Badge size="lg" color="teal" variant="light">
                  {bookingData.advance_payment_method}
                </Badge>
              </Stack>
            </SimpleGrid>

            <Divider />

            <Stack gap={4}>
              <Text size="sm" fw={600}>
                Payment Proof:
              </Text>
              <Paper p="xs" withBorder bg="white">
                <Image
                  src={bookingData.payment_proof_url}
                  alt="Payment Proof"
                  fit="contain"
                  h={200}
                  radius="sm"
                />
              </Paper>
            </Stack>
          </Stack>
        </Paper>

        {/* Important Reminders */}
        <Alert icon={<IconAlertCircle size="1rem" />} color="orange" variant="light">
          <Stack gap={4}>
            <Text size="sm" fw={600}>
              Important Reminders:
            </Text>
            <Text size="xs">
              • Your booking will be sent to admin for approval
            </Text>
            <Text size="xs">
              • Selected slots will be marked as "Under Approval" for other customers
            </Text>
            <Text size="xs">
              • Remaining payment (PKR {bookingData.remaining_payment.toLocaleString()}) should be
              paid at the ground
            </Text>
            <Text size="xs">
              • Please arrive 10 minutes before your scheduled time
            </Text>
          </Stack>
        </Alert>

        {/* Action Buttons */}
        <Group justify="space-between" grow>
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onEdit}
            disabled={isSubmitting}
          >
            Edit Details
          </Button>
          <Button
            color="green"
            leftSection={<IconCheck size={16} />}
            onClick={onConfirm}
            loading={isSubmitting}
          >
            Confirm Booking
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
