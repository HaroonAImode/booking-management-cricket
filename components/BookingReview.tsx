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
  IconCurrencyRupee,
  IconReceipt,
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconFileInvoice,
  IconCreditCard,
} from '@tabler/icons-react';
import { BookingSummary } from '@/types';
import { formatSlotRanges } from '@/lib/supabase/bookings';

// Payment account details
const PAYMENT_ACCOUNTS = {
  easypaisa: { number: '03065329174', name: 'Soban Ahmed Khan' },
  sadapay: { number: '03065329174', name: 'Soban Ahmed Khan' },
};

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

  // Get account details based on payment method
  const getPaymentAccountDetails = () => {
    const method = bookingData.advance_payment_method;
    if (method === 'easypaisa' || method === 'sadapay') {
      return PAYMENT_ACCOUNTS[method];
    }
    return null;
  };

  const accountDetails = getPaymentAccountDetails();

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
      zIndex={300}
      overlayProps={{
        backgroundOpacity: 0.65,
        blur: 8,
      }}
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
                  <Text size="md" fw={500} c="blue">
                    {formatSlotRanges(daySlots)}
                  </Text>
                </Box>
              )}

              {nightSlots.length > 0 && (
                <Box>
                  <Text size="xs" c="dimmed" mb={4}>
                    Night Slots (PKR 2,000/hr):
                  </Text>
                  <Text size="md" fw={500} c="violet">
                    {formatSlotRanges(nightSlots)} 🌙
                  </Text>
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
                <Text size="lg" fw={700}>
                  PKR {bookingData.total_amount.toLocaleString()}
                </Text>
              </Stack>

              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Advance Payment (Required)
                </Text>
                <Text size="lg" fw={700} c="green">
                  PKR {bookingData.advance_payment.toLocaleString()}
                </Text>
              </Stack>

              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Remaining Payment
                </Text>
                <Text size="lg" fw={700} c="orange">
                  PKR {bookingData.remaining_payment.toLocaleString()}
                </Text>
              </Stack>

              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Payment Method
                </Text>
                <Badge size="lg" color="teal" variant="light">
                  {bookingData.advance_payment_method === 'easypaisa' && 'Easypaisa'}
                  {bookingData.advance_payment_method === 'sadapay' && 'SadaPay'}
                  {bookingData.advance_payment_method === 'cash' && 'Cash'}
                  {!['easypaisa', 'sadapay', 'cash'].includes(bookingData.advance_payment_method) && bookingData.advance_payment_method}
                </Badge>
                
                {/* Display account details for online payments */}
                {accountDetails && (
                  <Box mt={4}>
                    <Text size="xs" c="dimmed" fw={600}>
                      Account Details:
                    </Text>
                    <Text size="xs" c="dimmed">
                      Number: {accountDetails.number}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Holder: {accountDetails.name}
                    </Text>
                  </Box>
                )}
              </Stack>
            </SimpleGrid>

            <Divider />

            {/* Payment Instructions for Online Payments */}
            {accountDetails && (
              <Alert icon={<IconCreditCard size="1rem" />} color="blue" variant="light" mt="md">
                <Stack gap={2}>
                  <Text size="sm" fw={600}>
                    💰 Payment Instructions:
                  </Text>
                  <Text size="xs">
                    1. Send PKR {bookingData.advance_payment.toLocaleString()} to account number: {accountDetails.number}
                  </Text>
                  <Text size="xs">
                    2. Account holder name: {accountDetails.name}
                  </Text>
                  <Text size="xs">
                    3. Upload screenshot of payment confirmation below
                  </Text>
                </Stack>
              </Alert>
            )}

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

        {/* Invoice Info */}
        <Alert icon={<IconFileInvoice size="1rem" />} color="blue" variant="light">
          <Stack gap={4}>
            <Text size="sm" fw={600}>
              📄 Invoice Available
            </Text>
            <Text size="xs">
              After booking confirmation, you can check your booking status and download a professional invoice from the "Check Booking" page.
            </Text>
          </Stack>
        </Alert>

        {/* Action Buttons */}
        <Group justify="space-between" gap="sm">
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onEdit}
            disabled={isSubmitting}
            style={{ flex: 1, minWidth: 0 }}
            styles={{
              label: {
                whiteSpace: 'nowrap',
                overflow: 'visible',
              },
            }}
          >
            Edit Details
          </Button>
          <Button
            color="green"
            leftSection={<IconCheck size={16} />}
            onClick={onConfirm}
            loading={isSubmitting}
            style={{ flex: 1, minWidth: 0 }}
            styles={{
              label: {
                whiteSpace: 'nowrap',
                overflow: 'visible',
              },
            }}
          >
            Confirm Booking
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}