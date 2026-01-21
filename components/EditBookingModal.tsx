'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Select,
  FileInput,
  Button,
  Group,
  Text,
  Alert,
  Image,
  Paper,
  Badge,
  Divider,
  NumberInput,
  LoadingOverlay,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconUser,
  IconPhone,
  IconCalendar,
  IconUpload,
  IconAlertCircle,
  IconCheck,
  IconCurrencyRupee,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createClient } from '@/lib/supabase/client';
import { uploadPaymentProof, validatePaymentProofFile } from '@/lib/supabase/storage';

interface EditBookingModalProps {
  bookingId: string;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BookingData {
  booking_number: string;
  booking_date: string;
  total_hours: number;
  total_amount: number;
  advance_payment: number;
  remaining_payment: number;
  advance_payment_method: string;
  advance_payment_proof: string | null;
  remaining_payment_proof: string | null;
  status: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  slots: Array<{
    slot_hour: number;
    is_night_rate: boolean;
  }>;
}

const PAYMENT_METHODS = [
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'sadapay', label: 'SadaPay' },
  { value: 'cash', label: 'Cash' },
];

export default function EditBookingModal({
  bookingId,
  opened,
  onClose,
  onSuccess,
}: EditBookingModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [advancePayment, setAdvancePayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [newAdvanceProof, setNewAdvanceProof] = useState<File | null>(null);
  const [newRemainingProof, setNewRemainingProof] = useState<File | null>(null);

  useEffect(() => {
    if (opened && bookingId) {
      fetchBookingData();
    }
  }, [opened, bookingId]);

  const fetchBookingData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers!inner(*),
          slots:booking_slots(
            slot_hour,
            is_night_rate
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      setBookingData(data);
      setCustomerName(data.customer.name);
      setCustomerPhone(data.customer.phone || '');
      setBookingDate(new Date(data.booking_date));
      setTotalAmount(data.total_amount);
      setAdvancePayment(data.advance_payment);
      setPaymentMethod(data.advance_payment_method);
    } catch (error: any) {
      console.error('Error fetching booking:', error);
      notifications.show({
        title: '❌ Error',
        message: 'Failed to load booking data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!bookingData || !bookingDate) return;

    setSubmitting(true);

    try {
      const supabase = createClient();

      // Upload new payment proofs if provided
      let advanceProofUrl = bookingData.advance_payment_proof;
      let remainingProofUrl = bookingData.remaining_payment_proof;

      if (newAdvanceProof) {
        const validation = validatePaymentProofFile(newAdvanceProof);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const { data: uploadData, error: uploadError } = await uploadPaymentProof(
          newAdvanceProof,
          bookingId,
          bookingDate.toISOString().split('T')[0]
        );

        if (uploadError || !uploadData) {
          throw new Error('Failed to upload advance payment proof');
        }

        advanceProofUrl = uploadData;
      }

      if (newRemainingProof) {
        const validation = validatePaymentProofFile(newRemainingProof);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const { data: uploadData, error: uploadError } = await uploadPaymentProof(
          newRemainingProof,
          bookingId,
          bookingDate.toISOString().split('T')[0],
          'remaining'
        );

        if (uploadError || !uploadData) {
          throw new Error('Failed to upload remaining payment proof');
        }

        remainingProofUrl = uploadData;
      }

      const remainingPayment = totalAmount - advancePayment;

      // Update booking
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          booking_date: bookingDate.toISOString().split('T')[0],
          total_amount: totalAmount,
          advance_payment: advancePayment,
          remaining_payment: remainingPayment,
          advance_payment_method: paymentMethod,
          advance_payment_proof: advanceProofUrl,
          remaining_payment_proof: remainingProofUrl,
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      // Update customer info
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          name: customerName,
          phone: customerPhone || null,
        })
        .eq('id', bookingData.customer.id);

      if (customerError) throw customerError;

      notifications.show({
        title: '✅ Booking Updated',
        message: 'Booking has been updated successfully',
        color: 'green',
        icon: <IconCheck size={18} />,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating booking:', error);
      notifications.show({
        title: '❌ Update Failed',
        message: error.message || 'Failed to update booking',
        color: 'red',
        icon: <IconX size={18} />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Booking"
      size="lg"
      centered
    >
      <LoadingOverlay visible={loading} />
      
      {bookingData && (
        <Stack gap="md">
          {/* Booking Number Badge */}
          <Paper p="sm" withBorder style={{ background: '#F0F9FF' }}>
            <Group justify="space-between">
              <Text fw={600}>Booking #{bookingData.booking_number}</Text>
              <Badge color={bookingData.status === 'approved' ? 'green' : 'orange'}>
                {bookingData.status}
              </Badge>
            </Group>
          </Paper>

          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            Update booking details. New payment proofs will replace existing ones.
          </Alert>

          {/* Customer Information */}
          <Divider label="Customer Information" />
          
          <TextInput
            label="Customer Name"
            placeholder="Enter customer name"
            leftSection={<IconUser size={16} />}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />

          <TextInput
            label="Phone Number"
            placeholder="03XXXXXXXXX"
            leftSection={<IconPhone size={16} />}
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />

          {/* Booking Details */}
          <Divider label="Booking Details" />

          <DatePickerInput
            label="Booking Date"
            placeholder="Select date"
            leftSection={<IconCalendar size={16} />}
            value={bookingDate}
            onChange={setBookingDate}
            required
            minDate={new Date()}
          />

          <Text size="sm" c="dimmed">
            Total Hours: <strong>{bookingData.total_hours}</strong> (Cannot be changed)
          </Text>

          <NumberInput
            label="Total Amount (PKR)"
            placeholder="Enter total amount"
            leftSection={<IconCurrencyRupee size={16} />}
            value={totalAmount}
            onChange={(val) => setTotalAmount(Number(val))}
            min={0}
            required
          />

          <NumberInput
            label="Advance Payment (PKR)"
            placeholder="Enter advance payment"
            leftSection={<IconCurrencyRupee size={16} />}
            value={advancePayment}
            onChange={(val) => setAdvancePayment(Number(val))}
            min={0}
            max={totalAmount}
            required
          />

          <Text size="sm" c="dimmed">
            Remaining Payment: <strong>PKR {(totalAmount - advancePayment).toLocaleString()}</strong>
          </Text>

          <Select
            label="Payment Method"
            placeholder="Select payment method"
            data={PAYMENT_METHODS}
            value={paymentMethod}
            onChange={(val) => setPaymentMethod(val || '')}
            required
          />

          {/* Payment Proofs */}
          <Divider label="Payment Proofs" />

          <Stack gap="xs">
            <Text size="sm" fw={600}>Current Advance Proof:</Text>
            {bookingData.advance_payment_proof ? (
              <Image
                src={bookingData.advance_payment_proof}
                alt="Current advance proof"
                radius="md"
                h={150}
                fit="contain"
              />
            ) : (
              <Text size="sm" c="dimmed">No proof uploaded</Text>
            )}
          </Stack>

          <FileInput
            label="New Advance Payment Proof (Optional)"
            placeholder="Upload new proof to replace current"
            leftSection={<IconUpload size={16} />}
            accept="image/*"
            value={newAdvanceProof}
            onChange={setNewAdvanceProof}
          />

          {bookingData.remaining_payment_proof && (
            <>
              <Stack gap="xs">
                <Text size="sm" fw={600}>Current Remaining Proof:</Text>
                <Image
                  src={bookingData.remaining_payment_proof}
                  alt="Current remaining proof"
                  radius="md"
                  h={150}
                  fit="contain"
                />
              </Stack>

              <FileInput
                label="New Remaining Payment Proof (Optional)"
                placeholder="Upload new proof to replace current"
                leftSection={<IconUpload size={16} />}
                accept="image/*"
                value={newRemainingProof}
                onChange={setNewRemainingProof}
              />
            </>
          )}

          {/* Actions */}
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              leftSection={<IconCheck size={18} />}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
