'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Title,
  Text,
  Alert,
  Select,
  FileInput,
  Loader,
  Badge,
  Divider,
  Box,
  SimpleGrid,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconUser,
  IconPhone,
  IconCalendar,
  IconUpload,
  IconAlertCircle,
  IconCurrencyRupee,
  IconCheck,
  IconInfoCircle,
  IconSearch,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import SlotSelector from './SlotSelector';
import BookingReview from './BookingReview';
import { FormSkeleton } from './ui/LoadingSkeleton';
import {
  fetchSettings,
  getAvailableSlots,
  calculateBookingAmount,
  createCompleteBooking,
  formatDateForSQL,
  isNightRate,
} from '@/lib/supabase/bookings';
import { uploadPaymentProof, validatePaymentProofFile } from '@/lib/supabase/storage';
import { SlotInfo, BookingSummary } from '@/types';

const PAYMENT_METHODS = [
  { value: 'easypaisa', label: 'Easypaisa - 03XX XXXXXXX' },
  { value: 'sadapay', label: 'SadaPay - 03XX XXXXXXX' },
  { value: 'cash', label: 'Cash' },
];

// Payment account details
const PAYMENT_ACCOUNTS = {
  easypaisa: { number: '03001234567', name: 'Cricket Ground Bookings' },
  sadapay: { number: '03007654321', name: 'Cricket Ground Bookings' },
};

interface BookingFormProps {
  preSelectedDate?: Date | null;
  preSelectedSlots?: number[];
  hideCalendar?: boolean;
}

export default function BookingForm({ 
  preSelectedDate = null, 
  preSelectedSlots = [], 
  hideCalendar = false 
}: BookingFormProps = {}) {
  const router = useRouter();
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingDate, setBookingDate] = useState<Date | null>(preSelectedDate);
  const [selectedSlots, setSelectedSlots] = useState<number[]>(preSelectedSlots);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Data state
  const [availableSlots, setAvailableSlots] = useState<SlotInfo[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [advancePayment, setAdvancePayment] = useState(500);
  const [bookingSummary, setBookingSummary] = useState<BookingSummary | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Sync preselected values from props
  useEffect(() => {
    if (preSelectedDate) {
      setBookingDate(preSelectedDate);
    }
    if (preSelectedSlots && preSelectedSlots.length > 0) {
      setSelectedSlots(preSelectedSlots);
    }
  }, [preSelectedDate, preSelectedSlots]);

  // Load slots when date changes
  useEffect(() => {
    if (bookingDate && !hideCalendar) {
      loadAvailableSlots();
      if (!preSelectedSlots || preSelectedSlots.length === 0) {
        setSelectedSlots([]); // Reset selected slots when date changes (only if not pre-selected)
      }
    } else if (!hideCalendar) {
      setAvailableSlots(null);
      setSelectedSlots([]);
    }
  }, [bookingDate]);

  // Calculate amount when slots change
  useEffect(() => {
    if (bookingDate && selectedSlots.length > 0) {
      calculateAmount();
    } else {
      setTotalAmount(0);
    }
  }, [selectedSlots, bookingDate]);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await fetchSettings();
    if (error) {
      notifications.show({
        title: '❌ Loading Error',
        message: 'Failed to load settings. Please refresh the page.',
        color: 'red',
        autoClose: 5000,
        icon: <IconAlertCircle size={18} />,
      });
    } else if (data) {
      setSettings(data);
      setAdvancePayment(data.advance_payment_required);
    }
    setLoading(false);
  };

  const loadAvailableSlots = async () => {
    if (!bookingDate) return;

    setSlotsLoading(true);
    setSlotsError(null);

    const dateStr = formatDateForSQL(bookingDate);
    const { data, error } = await getAvailableSlots(dateStr);

    if (error) {
      setSlotsError(error);
      setAvailableSlots(null);
    } else {
      setAvailableSlots(data);
    }

    setSlotsLoading(false);
  };

  const calculateAmount = async () => {
    if (!bookingDate || selectedSlots.length === 0) return;

    const dateStr = formatDateForSQL(bookingDate);
    const { data, error } = await calculateBookingAmount(dateStr, selectedSlots);

    if (error) {
      notifications.show({
        title: '❌ Calculation Error',
        message: 'Could not calculate total amount. Please try again.',
        color: 'red',
        autoClose: 4000,
        icon: <IconAlertCircle size={18} />,
      });
    } else if (data !== null) {
      setTotalAmount(data);
    }
  };

  const handleSlotToggle = (hour: number) => {
    setSelectedSlots((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour]
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    // Phone is now optional, only validate format if provided
    if (phone.trim() && !/^[0-9]{11}$/.test(phone.replace(/[-\s]/g, ''))) {
      newErrors.phone = 'Invalid phone number (11 digits required)';
    }
    if (!bookingDate) newErrors.booking_date = 'Please select a booking date';
    if (selectedSlots.length === 0) newErrors.slots = 'Please select at least one time slot';
    if (!paymentMethod) newErrors.payment_method = 'Please select a payment method';
    
    // Payment proof required for online payments, optional for cash
    if (paymentMethod !== 'cash' && !paymentProofFile) {
      newErrors.payment_proof = 'Payment proof required for online payments';
    }

    // Validate file if provided
    if (paymentProofFile) {
      const fileValidation = validatePaymentProofFile(paymentProofFile);
      if (!fileValidation.valid) {
        newErrors.payment_proof = fileValidation.error || 'Invalid file';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReviewBooking = () => {
    if (!validateForm()) {
      notifications.show({
        title: '⚠️ Missing Information',
        message: 'Please fill all required fields correctly',
        color: 'orange',
        autoClose: 4000,
        icon: <IconAlertCircle size={18} />,
      });
      return;
    }

    // Check if slots are still available (client-side check)
    const unavailableSlots = selectedSlots.filter((hour) => {
      const slot = availableSlots?.find((s) => s.slot_hour === hour);
      return slot && !slot.is_available;
    });

    if (unavailableSlots.length > 0) {
      notifications.show({
        title: '⚠️ Slots Unavailable',
        message: 'Some slots are no longer available. Refreshing...',
        color: 'orange',
        autoClose: 4000,
        icon: <IconAlertCircle size={18} />,
      });
      loadAvailableSlots();
      return;
    }

    // Prepare booking summary
    const dateStr = formatDateForSQL(bookingDate!);
    const paymentProofUrl = paymentProofFile ? URL.createObjectURL(paymentProofFile) : '';

    // Separate day and night slots
    const daySlots: number[] = [];
    const nightSlots: number[] = [];

    selectedSlots.forEach((hour) => {
      if (settings && isNightRate(hour, settings.night_start_time, settings.night_end_time)) {
        nightSlots.push(hour);
      } else {
        daySlots.push(hour);
      }
    });

    const summary: BookingSummary = {
      customer: {
        name,
        phone: phone || undefined,
      },
      booking_date: dateStr,
      selected_slots: selectedSlots,
      total_hours: selectedSlots.length,
      total_amount: totalAmount,
      advance_payment: advancePayment,
      remaining_payment: totalAmount - advancePayment,
      advance_payment_method: paymentMethod!,
      payment_proof_url: paymentProofUrl,
      customer_notes: customerNotes || undefined,
      day_slots: daySlots,
      night_slots: nightSlots,
    };

    setBookingSummary(summary);
    setReviewOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!bookingSummary || !paymentProofFile || !bookingDate) return;

    setSubmitting(true);

    try {
      // Step 1: Upload payment proof
      const bookingIdTemp = `temp-${Date.now()}`;
      const dateStr = formatDateForSQL(bookingDate);

      const { data: uploadData, error: uploadError } = await uploadPaymentProof(
        paymentProofFile,
        bookingIdTemp,
        dateStr
      );

      if (uploadError || !uploadData) {
        throw new Error(uploadError || 'Failed to upload payment proof');
      }

      // Step 2: Create booking
      const bookingData = {
        customer: bookingSummary.customer,
        booking: {
          booking_date: bookingSummary.booking_date,
          total_hours: bookingSummary.total_hours,
          total_amount: bookingSummary.total_amount,
          advance_payment: bookingSummary.advance_payment,
          advance_payment_method: bookingSummary.advance_payment_method,
          advance_payment_proof: uploadData,
          customer_notes: bookingSummary.customer_notes,
        },
        slots: selectedSlots.map((hour) => {
          const slot = availableSlots?.find((s) => s.slot_hour === hour);
          const hourTime = `${hour.toString().padStart(2, '0')}:00:00`;
          return {
            slot_date: bookingSummary.booking_date,
            slot_time: hourTime,
            slot_hour: hour,
            is_night_rate:
              settings &&
              isNightRate(hour, settings.night_start_time, settings.night_end_time),
            hourly_rate: slot?.hourly_rate || 0,
          };
        }),
      };

      const { data: bookingResult, error: bookingError } = await createCompleteBooking(
        bookingData
      );

      if (bookingError || !bookingResult) {
        throw new Error(bookingError || 'Failed to create booking');
      }

      // Step 3: Send push notification to all admins
      try {
        await fetch('/api/notifications/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '🏏 New Booking Request',
            message: `${bookingSummary.customer.name} booked for ${formatDate(bookingSummary.booking_date)} - ${bookingSummary.total_hours} hour(s)`,
            bookingId: bookingResult.booking_id,
            customerName: bookingSummary.customer.name,
          }),
        });
      } catch (notifError) {
        // Don't fail the booking if notification fails
        console.error('Failed to send push notification:', notifError);
      }

      // Success!
      notifications.show({
        title: '✅ Booking Request Submitted Successfully!',
        message: (
          <Box>
            <Text size="sm" mb="xs">
              Booking #{bookingResult.booking_number} sent to admin for approval.
            </Text>
            <Text size="sm" fw={600} c="blue.7" mb="xs">
              📌 IMPORTANT NEXT STEPS:
            </Text>
            <Text size="xs" component="ul" style={{ paddingLeft: '1rem', margin: 0 }}>
              <li>Click "Check Your Booking" button above</li>
              <li>Search with your name within 10 minutes</li>
              <li>View approval status</li>
              <li>Download booking confirmation slip</li>
            </Text>
          </Box>
        ),
        color: 'green',
        autoClose: 15000,
        icon: <IconCheck size={18} />,
      });

      // Reset form
      setReviewOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Booking submission error:', err);
      notifications.show({
        title: '❌ Booking Failed',
        message: err.message || 'An error occurred. Please try again or contact support.',
        color: 'red',
        autoClose: 6000,
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setBookingDate(null);
    setSelectedSlots([]);
    setPaymentMethod(null);
    setPaymentProofFile(null);
    setCustomerNotes('');
    setErrors({});
    setBookingSummary(null);
  };

  if (loading) {
    return (
      <Container size="md" py={{ base: "md", sm: "xl" }} px={{ base: "xs", sm: "md" }} className="animate-fade-in">
        <Stack gap="xl">
          <Stack gap="xs">
            <Title order={1}>Book Cricket Ground</Title>
            <Text c="dimmed">Loading booking system...</Text>
          </Stack>
          <FormSkeleton />
        </Stack>
      </Container>
    );
  }

  return (
    <>
      <Container 
        size="md" 
        py={{ base: "md", sm: "xl" }} 
        px={{ base: "xs", sm: "md" }} 
        className="animate-fade-in"
        style={{ 
          maxWidth: '100%',
          overflowX: 'hidden',
        }}
      >
        <Stack gap="xl" style={{ maxWidth: '100%' }}>
          {/* Header */}
          <Stack gap="xs">
            <Title order={1} size="h1">Book Cricket Ground</Title>
            <Text c="dimmed" size="md">Fill in the details below to book your time slot</Text>
          </Stack>

          {/* Customer Information */}
          <Paper 
            p={{ base: "md", sm: "lg" }} 
            withBorder 
            className="hover-lift"
            style={{ 
              maxWidth: '100%',
              overflowX: 'hidden',
            }}
          >
            <Stack gap="md" style={{ maxWidth: '100%' }}>
              <Title order={3} size="h3">Customer Information</Title>
              <Divider />

              <TextInput
                label="Full Name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                error={errors.name}
                required
                leftSection={<IconUser size={16} />}
              />

              <TextInput
                label="Phone Number (Optional)"
                placeholder="03XXXXXXXXX (optional)"
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value)}
                error={errors.phone}
                leftSection={<IconPhone size={16} />}
              />
            </Stack>
          </Paper>

          {/* Booking Details */}
          {!hideCalendar && (
            <Paper p={{ base: "md", sm: "lg" }} withBorder className="hover-lift">
              <Stack gap="md">
                <Title order={3} size="h3">Booking Details</Title>
                <Divider />

                <DatePickerInput
                  label="Select Date"
                  placeholder="Pick a date"
                  value={bookingDate}
                  onChange={(value) => {
                    if (value) {
                      setBookingDate(new Date(value));
                    } else {
                      setBookingDate(null);
                    }
                  }}
                  error={errors.booking_date}
                  required
                  leftSection={<IconCalendar size={16} />}
                  minDate={new Date()}
                  clearable
                />

                {errors.slots && (
                  <Alert icon={<IconAlertCircle size="1rem" />} color="red">
                    {errors.slots}
                  </Alert>
                )}

                <SlotSelector
                  selectedDate={bookingDate}
                  selectedSlots={selectedSlots}
                  onSlotToggle={handleSlotToggle}
                  availableSlots={availableSlots}
                  loading={slotsLoading}
                  error={slotsError}
                />

                <Textarea
                  label="Additional Notes"
                  placeholder="Any special requests or notes (optional)"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.currentTarget.value)}
                  minRows={3}
                />
              </Stack>
            </Paper>
          )}

          {/* Additional Notes (when calendar is hidden) */}
          {hideCalendar && (
            <Paper p={{ base: "md", sm: "lg" }} withBorder className="hover-lift">
              <Stack gap="md">
                <Title order={3} size="h3">Additional Information</Title>
                <Divider />

                <Textarea
                  label="Additional Notes"
                  placeholder="Any special requests or notes (optional)"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.currentTarget.value)}
                  minRows={3}
                />
              </Stack>
            </Paper>
          )}

          {/* Payment Information */}
          <Paper 
            p={{ base: "md", sm: "lg" }} 
            withBorder 
            bg="blue.0"
            style={{ 
              maxWidth: '100%',
              overflowX: 'hidden',
            }}
          >
            <Stack gap="md" style={{ maxWidth: '100%' }}>
              <Title order={3} size="h3">Payment Information</Title>
              <Divider />

              {/* Amount Summary */}
              {selectedSlots.length > 0 && (
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <Box>
                    <Text size="xs" c="dimmed">
                      Total Amount
                    </Text>
                    <Group gap="xs">
                      <IconCurrencyRupee size={18} />
                      <Text size="xl" fw={700}>
                        PKR {totalAmount.toLocaleString()}
                      </Text>
                    </Group>
                  </Box>

                  <Box>
                    <Text size="xs" c="dimmed">
                      Advance Payment (Required)
                    </Text>
                    <Group gap="xs">
                      <IconCurrencyRupee size={18} />
                      <Text size="xl" fw={700} c="green">
                        PKR {advancePayment.toLocaleString()}
                      </Text>
                    </Group>
                  </Box>

                  <Box>
                    <Text size="xs" c="dimmed">
                      Remaining Payment
                    </Text>
                    <Group gap="xs">
                      <IconCurrencyRupee size={18} />
                      <Text size="xl" fw={700} c="orange">
                        PKR {(totalAmount - advancePayment).toLocaleString()}
                      </Text>
                    </Group>
                  </Box>
                </SimpleGrid>
              )}

              <Select
                label="Payment Method"
                placeholder="Select how you paid"
                data={PAYMENT_METHODS}
                value={paymentMethod}
                onChange={setPaymentMethod}
                error={errors.payment_method}
                required
              />

              {/* Payment Account Details */}
              {paymentMethod && paymentMethod !== 'cash' && (
                <Alert icon={<IconAlertCircle size="1rem" />} color="blue" variant="light">
                  <Stack gap={4}>
                    <Text size="sm" fw={600}>Transfer to this account:</Text>
                    <Text size="sm">
                      <strong>Account Name:</strong> {PAYMENT_ACCOUNTS[paymentMethod as keyof typeof PAYMENT_ACCOUNTS]?.name}
                    </Text>
                    <Text size="sm">
                      <strong>Account Number:</strong> {PAYMENT_ACCOUNTS[paymentMethod as keyof typeof PAYMENT_ACCOUNTS]?.number}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      💡 After transferring, please upload the payment screenshot below
                    </Text>
                  </Stack>
                </Alert>
              )}

              <FileInput
                label={paymentMethod === 'cash' ? 'Payment Proof Screenshot (Optional)' : 'Payment Proof Screenshot'}
                placeholder="Upload payment screenshot"
                accept="image/png,image/jpeg,image/jpg"
                value={paymentProofFile}
                onChange={setPaymentProofFile}
                error={errors.payment_proof}
                required={paymentMethod !== 'cash'}
                leftSection={<IconUpload size={16} />}
                clearable
                styles={{
                  input: {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                  section: {
                    flexShrink: 0,
                  },
                }}
              />

              {paymentMethod !== 'cash' && (
                <Alert icon={<IconAlertCircle size="1rem" />} color="yellow" variant="light">
                  ⚠️ Please upload a clear screenshot of your payment receipt. Accepted formats: PNG,
                  JPG, JPEG (Max 5MB)
                </Alert>
              )}
              {paymentMethod === 'cash' && (
                <Alert icon={<IconAlertCircle size="1rem" />} color="green" variant="light">
                  ℹ️ Cash payment will be collected at the venue before play time.
                </Alert>
              )}
            </Stack>
          </Paper>

          {/* Submit Button */}
          <Button
            size="lg"
            fullWidth
            onClick={handleReviewBooking}
            disabled={selectedSlots.length === 0 || !bookingDate}
            loading={submitting}
            leftSection={selectedSlots.length > 0 && bookingDate ? <IconCheck size={18} /> : null}
            styles={{
              root: {
                minHeight: '48px',
                fontSize: '16px',
              },
            }}
          >
            Review Booking Details
          </Button>

          {/* Check Booking Status Button - Prominent */}
          <Paper 
            withBorder 
            p={{ base: "md", sm: "lg" }} 
            radius="md" 
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
          >
            <Stack gap="md" align="center">
              <Box ta="center">
                <Text size="lg" fw={600} c="white" mb={4}>
                  Already Booked? Check Your Status
                </Text>
                <Text size="sm" c="rgba(255,255,255,0.95)">
                  Search by name to view approval status & download booking slip
                </Text>
              </Box>
              <Button
                size="lg"
                variant="white"
                leftSection={<IconSearch size={20} />}
                onClick={() => router.push('/bookings/check')}
                fullWidth
                styles={{
                  root: {
                    height: '50px',
                  },
                }}
              >
                Check Your Booking
              </Button>
            </Stack>
          </Paper>

          {/* Important Info */}
          <Alert icon={<IconInfoCircle size="1rem" />} color="blue" variant="light">
            <Stack gap={4}>
              <Text size="sm" fw={600}>
                📌 Important Information:
              </Text>
              <Text size="xs">
                • Advance payment of PKR {advancePayment.toLocaleString()} is required for all
                bookings
              </Text>
              <Text size="xs">• Day rate: PKR 1,500/hr | Night rate: PKR 2,000/hr (5 PM - 7 AM)</Text>
              <Text size="xs">• Please upload payment proof screenshot (required)</Text>
              <Text size="xs">
                • Your booking will be confirmed after admin approval
              </Text>
              <Text size="xs" fw={600} c="blue.7">
                • After submitting, click "Check Your Booking" to see approval status
              </Text>
            </Stack>
          </Alert>
        </Stack>
      </Container>

      {/* Review Modal */}
      <BookingReview
        opened={reviewOpen}
        onClose={() => setReviewOpen(false)}
        bookingData={bookingSummary}
        onEdit={() => setReviewOpen(false)}
        onConfirm={handleConfirmBooking}
        isSubmitting={submitting}
      />
    </>
  );
}
