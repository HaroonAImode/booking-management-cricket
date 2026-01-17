/**
 * BookingDetailsModal Component
 * Modal displaying full booking details with approve/reject actions
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Divider,
  Paper,
  Grid,
  Textarea,
  Alert,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconUser,
  IconPhone,
  IconCalendar,
  IconClock,
  IconCurrencyRupee,
  IconNotes,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconPhoto,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { formatSlotRanges } from '@/lib/supabase/bookings';

interface BookingDetailsModalProps {
  bookingId: string;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BookingDetailsModal({
  bookingId,
  opened,
  onClose,
  onSuccess,
}: BookingDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/calendar/${bookingId}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setAdminNotes(result.data.booking.admin_notes || '');
      } else {
        notifications.show({
          title: 'Error',
          message: 'Failed to load booking details',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Fetch booking details error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load booking details',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch booking details when modal opens
  useEffect(() => {
    if (opened && bookingId) {
      fetchBookingDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, bookingId]);

  const fetchSignedUrl = async (storagePath: string) => {
    try {
      setLoadingImage(true);
      const response = await fetch(`/api/admin/storage/payment-proof?path=${encodeURIComponent(storagePath)}`);
      const result = await response.json();
      
      if (result.success && result.url) {
        setLightboxImage(result.url);
      } else {
        notifications.show({
          title: 'Error',
          message: 'Failed to load payment proof image',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Fetch signed URL error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load payment proof image',
        color: 'red',
      });
    } finally {
      setLoadingImage(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);

      const response = await fetch(`/api/admin/calendar/${bookingId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      });

      const result = await response.json();

      if (result.success) {
        notifications.show({
          title: 'Success',
          message: `Booking ${result.bookingNumber} approved successfully`,
          color: 'green',
        });
        onClose();
        onSuccess?.();
      } else {
        notifications.show({
          title: 'Error',
          message: result.error || 'Failed to approve booking',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Approve error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to approve booking',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please provide a reason for rejection',
        color: 'red',
      });
      return;
    }

    try {
      setActionLoading(true);

      const response = await fetch(`/api/admin/calendar/${bookingId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const result = await response.json();

      if (result.success) {
        notifications.show({
          title: 'Success',
          message: `Booking ${result.bookingNumber} rejected`,
          color: 'orange',
        });
        onClose();
        onSuccess?.();
      } else {
        notifications.show({
          title: 'Error',
          message: result.error || 'Failed to reject booking',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Reject error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to reject booking',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
      setShowRejectForm(false);
      setRejectReason('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'approved':
        return 'green';
      case 'completed':
        return 'blue';
      case 'cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount?.toLocaleString() || 0}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!data && !loading) return null;

  const booking = data?.booking;
  const customer = data?.customer;
  const slots = data?.slots || [];

  const isPending = booking?.status === 'pending';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <Text fw={600} size="lg">
            Booking Details
          </Text>
          {booking && (
            <Badge color={getStatusColor(booking.status)} size="lg">
              {booking.status?.toUpperCase()}
            </Badge>
          )}
        </Group>
      }
      size="xl"
    >
      <LoadingOverlay visible={loading} />

      {data && (
        <Stack gap="md">
          {/* Booking Info */}
          <Paper withBorder p="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={600}>Booking #{booking.booking_number}</Text>
                <Text size="sm" c="dimmed">
                  Created {formatDate(booking.created_at)}
                </Text>
              </Group>

              <Grid>
                <Grid.Col span={6}>
                  <Group gap="xs">
                    <IconCalendar size={18} />
                    <div>
                      <Text size="xs" c="dimmed">
                        Date
                      </Text>
                      <Text size="sm" fw={500}>
                        {formatDate(booking.booking_date)}
                      </Text>
                    </div>
                  </Group>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Group gap="xs">
                    <IconClock size={18} />
                    <div>
                      <Text size="xs" c="dimmed">
                        Total Hours
                      </Text>
                      <Text size="sm" fw={500}>
                        {booking.total_hours} hours
                      </Text>
                    </div>
                  </Group>
                </Grid.Col>
              </Grid>
            </Stack>
          </Paper>

          {/* Customer Info */}
          <Paper withBorder p="md">
            <Text fw={600} mb="sm">
              Customer Information
            </Text>
            <Stack gap="xs">
              <Group gap="xs">
                <IconUser size={18} />
                <Text size="sm">{customer.name}</Text>
              </Group>
              <Group gap="xs">
                <IconPhone size={18} />
                <Text size="sm">{customer.phone || 'Not provided'}</Text>
              </Group>
              <Badge size="sm" variant="light">
                Total Bookings: {customer.total_bookings}
              </Badge>
            </Stack>
          </Paper>

          {/* Payment Info */}
          <Paper withBorder p="md">
            <Text fw={600} mb="sm">
              Payment Details
            </Text>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">Total Amount:</Text>
                <Text size="sm" fw={600}>
                  {formatCurrency(booking.total_amount)}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Advance Paid:</Text>
                <Text size="sm" c="green" fw={500}>
                  {formatCurrency(booking.advance_payment)}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Remaining:</Text>
                <Text size="sm" c="orange" fw={500}>
                  {formatCurrency(booking.remaining_payment)}
                </Text>
              </Group>
              <Divider my="sm" />
              
              {/* Payment Proofs - Two Boxes Side by Side */}
              <Grid>
                {/* Advance Payment Proof (Customer) */}
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-green-0)' }}>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <IconCurrencyRupee size={18} color="green" />
                        <Text size="sm" fw={600} c="green">
                          Advance Payment
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        By Customer at Booking
                      </Text>
                      <Text size="xs">
                        Method: <strong>{booking.advance_payment_method || 'N/A'}</strong>
                      </Text>
                      {booking.advance_payment_date && (
                        <Text size="xs" c="dimmed">
                          {formatDate(booking.advance_payment_date)}
                        </Text>
                      )}
                      {booking.advance_payment_proof ? (
                        <Button
                          variant="light"
                          color="green"
                          size="sm"
                          leftSection={<IconPhoto size={16} />}
                          onClick={() => fetchSignedUrl(booking.advance_payment_proof)}
                          loading={loadingImage}
                          fullWidth
                        >
                          View Proof Image
                        </Button>
                      ) : (
                        <Text size="xs" c="dimmed" ta="center" py="sm">
                          No proof uploaded
                        </Text>
                      )}
                    </Stack>
                  </Paper>
                </Grid.Col>

                {/* Remaining Payment Proof (Admin) */}
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <IconCurrencyRupee size={18} color="blue" />
                        <Text size="sm" fw={600} c="blue">
                          Remaining Payment
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        By Admin at Completion
                      </Text>
                      <Text size="xs">
                        Method: <strong>{booking.remaining_payment_method || 'Pending'}</strong>
                      </Text>
                      {booking.remaining_payment_date && (
                        <Text size="xs" c="dimmed">
                          {formatDate(booking.remaining_payment_date)}
                        </Text>
                      )}
                      {booking.remaining_payment_proof ? (
                        <Button
                          variant="light"
                          color="blue"
                          size="sm"
                          leftSection={<IconPhoto size={16} />}
                          onClick={() => fetchSignedUrl(booking.remaining_payment_proof)}
                          loading={loadingImage}
                          fullWidth
                        >
                          View Proof Image
                        </Button>
                      ) : (
                        <Text size="xs" c="dimmed" ta="center" py="sm">
                          {booking.remaining_payment > 0 ? 'Not received yet' : 'No payment due'}
                        </Text>
                      )}
                    </Stack>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Stack>
          </Paper>

          {/* Slots */}
          <Paper withBorder p="md">
            <Text fw={600} mb="sm">
              Booked Slots
            </Text>
            <Text size="md" fw={500} c="blue">
              {formatSlotRanges(slots.map((slot: any) => slot.slot_hour))}
            </Text>
            <Text size="xs" c="dimmed" mt="xs">
              {slots.some((slot: any) => slot.is_night_rate) && '🌙 Includes night rate slots'}
            </Text>
          </Paper>

          {/* Notes */}
          {booking.customer_notes && (
            <Paper withBorder p="md">
              <Group gap="xs" mb="xs">
                <IconNotes size={18} />
                <Text fw={600}>Customer Notes</Text>
              </Group>
              <Text size="sm" c="dimmed">
                {booking.customer_notes}
              </Text>
            </Paper>
          )}

          {/* Admin Actions */}
          {isPending && !showRejectForm && (
            <>
              <Textarea
                label="Admin Notes (Optional)"
                placeholder="Add any notes about this booking..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                minRows={2}
              />

              {booking.pending_expires_at && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="orange"
                  title="Pending Timeout"
                >
                  Expires at {formatTime(booking.pending_expires_at)}
                </Alert>
              )}

              <Group justify="flex-end">
                <Button
                  variant="outline"
                  color="red"
                  leftSection={<IconX size={18} />}
                  onClick={() => setShowRejectForm(true)}
                  loading={actionLoading}
                >
                  Reject
                </Button>
                <Button
                  color="green"
                  leftSection={<IconCheck size={18} />}
                  onClick={handleApprove}
                  loading={actionLoading}
                >
                  Approve Booking
                </Button>
              </Group>
            </>
          )}

          {/* Reject Form */}
          {showRejectForm && (
            <Paper withBorder p="md" bg="red.0">
              <Stack gap="md">
                <Text fw={600} c="red">
                  Reject Booking
                </Text>
                <Textarea
                  label="Reason for Rejection"
                  placeholder="Provide a reason for the customer..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                  minRows={3}
                />
                <Group justify="flex-end">
                  <Button
                    variant="subtle"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="red"
                    onClick={handleReject}
                    loading={actionLoading}
                  >
                    Confirm Rejection
                  </Button>
                </Group>
              </Stack>
            </Paper>
          )}

          {/* Already Processed */}
          {!isPending && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color={booking.status === 'approved' ? 'green' : 'gray'}
            >
              This booking has been {booking.status}.
              {booking.approved_at && ` Approved on ${formatDate(booking.approved_at)}`}
              {booking.cancelled_at && ` Cancelled on ${formatDate(booking.cancelled_at)}`}
              {booking.cancelled_reason && `: ${booking.cancelled_reason}`}
            </Alert>
          )}
        </Stack>
      )}

      {/* Payment Proof Lightbox */}
      <Modal
        opened={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        size="auto"
        centered
        withCloseButton
        closeButtonProps={{ size: 'lg' }}
        padding={0}
        styles={{
          body: { padding: 0 },
          content: { backgroundColor: 'transparent' }
        }}
      >
        {lightboxImage && (
          <img
            src={lightboxImage}
            alt="Payment Proof"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        )}
      </Modal>
    </Modal>
  );
}
