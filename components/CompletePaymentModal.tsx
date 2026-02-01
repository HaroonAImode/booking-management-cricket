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

import { useState, useEffect } from 'react';
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
  NumberInput,
  ActionIcon,
  Divider,
  SelectItem,
} from '@mantine/core';
import { IconUpload, IconAlertCircle, IconCheck, IconCurrencyRupee, IconPlus, IconTrash } from '@tabler/icons-react';
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
  const [paymentAmount, setPaymentAmount] = useState<number>(remainingAmount);

  // Extra charges state
  type ExtraCharge = { category: string; amount: number };
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [showExtraCharges, setShowExtraCharges] = useState(false);
  const [newExtraCategory, setNewExtraCategory] = useState<string>('');
  const [newExtraAmount, setNewExtraAmount] = useState<number>(0);

  const handleSubmit = async () => {
    // Validation
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    // Validate payment amount
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    if (paymentAmount > remainingAmount) {
      setError(`Payment amount cannot exceed remaining amount (Rs ${remainingAmount.toLocaleString()})`);
      return;
    }

    // Validate extra charges
    for (const ec of extraCharges) {
      if (!ec.category || !ec.amount || ec.amount <= 0) {
        setError('Please enter valid extra charge category and amount');
        return;
      }
    }

    // Payment proof is optional for cash payments
    // Required for digital payments (easypaisa, sadapay)
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
      formData.append('paymentAmount', paymentAmount.toString());
      // Only append proof if it exists (cash payments may not have proof)
      if (paymentProof) {
        formData.append('paymentProof', paymentProof);
      }
      if (adminNotes) {
        formData.append('adminNotes', adminNotes);
      }
      // Add extra charges as JSON string
      if (extraCharges.length > 0) {
        formData.append('extraCharges', JSON.stringify(extraCharges));
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
        setExtraCharges([]);
        setShowExtraCharges(false);
        setNewExtraCategory('');
        setNewExtraAmount(0);
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
      setPaymentAmount(remainingAmount);
      setExtraCharges([]);
      setShowExtraCharges(false);
      setNewExtraCategory('');
      setNewExtraAmount(0);
      setError(null);
      onClose();
    }
  };

  // Update payment amount when remaining amount changes
  useEffect(() => {
    setPaymentAmount(remainingAmount);
  }, [remainingAmount]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Complete Payment Verification"
      size="md"
      zIndex={300}
    >
      <Stack gap="md">
        {/* Booking Info */}
        <Alert color="blue" title="Booking Information">
          <Group>
            <Text size="sm">
              <strong>Booking:</strong> {bookingNumber}
            </Text>
            <Badge size="lg" color="orange">
              Total Remaining: Rs {remainingAmount.toLocaleString()}
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

        {/* Payment Amount Input */}
        <NumberInput
          label="Payment Amount"
          description="Enter amount to be paid (you can apply discount if needed)"
          placeholder="Enter amount"
          required
          leftSection={<IconCurrencyRupee size={18} />}
          value={paymentAmount}
          onChange={(value) => setPaymentAmount(Number(value) || 0)}
          min={1}
          max={remainingAmount}
          thousandSeparator="," 
          allowNegative={false}
          decimalScale={0}
        />

        {/* Show discount amount if different */}
        {paymentAmount < remainingAmount && (
          <Alert color="yellow" variant="light">
            <Text size="sm">
              <strong>Discount Applied:</strong> Rs {(remainingAmount - paymentAmount).toLocaleString()}
            </Text>
          </Alert>
        )}

        {/* Extra Charges Section */}
        <Divider label="Extra Charges (Optional)" labelPosition="center" my="xs" />
        <Button
          variant={showExtraCharges ? 'outline' : 'light'}
          leftSection={<IconPlus size={16} />}
          onClick={() => setShowExtraCharges((v) => !v)}
          size="xs"
        >
          {showExtraCharges ? 'Hide Extra Charges' : 'Add Extra Charges'}
        </Button>
        {showExtraCharges && (
          <Stack gap="xs">
            {/* List of extra charges */}
            {extraCharges.length > 0 && (
              <Stack gap="xs">
                {extraCharges.map((ec, idx) => (
                  <Group key={idx} gap="xs">
                    <Badge color="gray" size="sm">{ec.category}</Badge>
                    <Text size="sm">Rs {ec.amount.toLocaleString()}</Text>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      size="sm"
                      aria-label="Remove"
                      onClick={() => setExtraCharges(extraCharges.filter((_, i) => i !== idx))}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
            )}
            {/* Add new extra charge */}
            <Group gap="xs" align="end">
              <Select
                label="Category"
                placeholder="Select category"
                data={[
                  { value: 'mineral water', label: 'Mineral Water' },
                  { value: 'tape', label: 'Tape' },
                  { value: 'ball', label: 'Ball' },
                  { value: 'other', label: 'Other' },
                ]}
                value={newExtraCategory}
                onChange={(v) => setNewExtraCategory(v || '')}
                w={150}
              />
              <NumberInput
                label="Amount"
                placeholder="Amount"
                value={newExtraAmount}
                onChange={(v) => setNewExtraAmount(Number(v) || 0)}
                min={1}
                w={120}
                leftSection={<IconCurrencyRupee size={16} />}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                size="xs"
                disabled={!newExtraCategory || !newExtraAmount || newExtraAmount <= 0}
                onClick={() => {
                  if (newExtraCategory && newExtraAmount > 0) {
                    setExtraCharges([...extraCharges, { category: newExtraCategory, amount: newExtraAmount }]);
                    setNewExtraCategory('');
                    setNewExtraAmount(0);
                  }
                }}
              >
                Add
              </Button>
            </Group>
            {/* Total extra charges */}
            {extraCharges.length > 0 && (
              <Alert color="blue" variant="light">
                <Text size="sm">
                  <strong>Total Extra Charges:</strong> Rs {extraCharges.reduce((sum, ec) => sum + ec.amount, 0).toLocaleString()}
                </Text>
              </Alert>
            )}
          </Stack>
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
