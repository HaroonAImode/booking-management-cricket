/**
 * Complete Payment Modal Component
 * 
 * Purpose: Admin modal to upload remaining payment proof and complete booking
 * Features:
 * - Payment method selection
 * - File upload for payment proof
 * - Display remaining amount
 * - Admin notes field
 * - Validation and submission
 */

'use client';

import { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Select,
  FileInput,
  Textarea,
  Button,
  Alert,
  Group,
  Badge,
} from '@mantine/core';
import { IconUpload, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface CompletePaymentModalProps {
  opened: boolean;
  onClose: () => void;
  bookingId: string;
  bookingNumber: string;
  remainingAmount: number;
  onSuccess: () => void;
}

export default function CompletePaymentModal({
  opened,
  onClose,
  bookingId,
  bookingNumber,
  remainingAmount,
  onSuccess,
}: CompletePaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validation
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    // Payment proof is required for digital payments (easypaisa, sadapay)
    // but optional for cash payments
    if (!paymentProof && paymentMethod !== 'cash') {
      setError('Please upload payment proof for digital payments');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create form data
      const formData = new FormData();
      formData.append('paymentMethod', paymentMethod);
      formData.append('paymentProof', paymentProof);
      if (adminNotes) {
        formData.append('adminNotes', adminNotes);
      }

      // Submit to API
      const response = await fetch(
        `/api/admin/bookings/${bookingId}/complete-payment`,
        {
          method: 'PATCH',
          body: formData,
        }
      );

      const result = await response.json();

      if (result.success) {
        notifications.show({
          title: 'Success',
          message: `Payment verified! Booking ${bookingNumber} is now completed.`,
          color: 'green',
          icon: <IconCheck size={18} />,
        });
        
        // Reset form
        setPaymentMethod('');
        setPaymentProof(null);
        setAdminNotes('');
        
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Complete payment error:', error);
      setError('Failed to verify payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPaymentMethod('');
      setPaymentProof(null);
      setAdminNotes('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Complete Payment Verification"
      size="md"
    >
      <Stack gap="md">
        {/* Booking Info */}
        <Alert color="blue" title="Booking Information">
          <Group>
            <Text size="sm">
              <strong>Booking:</strong> {bookingNumber}
            </Text>
            <Badge size="lg" color="orange">
              Remaining: Rs {remainingAmount.toLocaleString()}
            </Badge>
          </Group>
        </Alert>

        {/* Error Alert */}
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
            onClose={() => setError(null)}
            withCloseButton
          >
            {error}
          </Alert>
        )}

        {/* Payment Method */}
        <Select
          label="Payment Method"
          placeholder="Select payment method"
          required
          data={[
            { value: 'easypaisa', label: 'Easypaisa' },
            { value: 'sadapay', label: 'SadaPay' },
            { value: 'cash', label: 'Cash' },
          ]}
          value={paymentMethod}
          onChange={(value) => setPaymentMethod(value || '')}
        />

        {/* Payment Proof Upload */}
        <FileInput
          label="Payment Proof"
          placeholder="Upload payment proof image"
          required={paymentMethod !== 'cash'}
          accept="image/*"
          leftSection={<IconUpload size={18} />}
          value={paymentProof}
          onChange={setPaymentProof}
          description={
            paymentMethod === 'cash'
              ? 'Optional for cash payments'
              : 'Upload screenshot or photo of payment receipt'
          }
        />

        {/* Admin Notes */}
        <Textarea
          label="Admin Notes (Optional)"
          placeholder="Add any notes about this payment verification..."
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          minRows={3}
        />

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            leftSection={<IconCheck size={18} />}
            color="green"
          >
            Verify & Complete Booking
          </Button>
        </Group>

        {/* Info */}
        <Alert color="gray" variant="light">
          <Text size="xs">
            After verification, the booking will be automatically marked as{' '}
            <strong>completed</strong> and the customer will receive a
            notification.
          </Text>
        </Alert>
      </Stack>
    </Modal>
  );
}
