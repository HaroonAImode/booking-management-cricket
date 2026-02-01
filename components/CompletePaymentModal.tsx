/**
 * Complete Payment Modal Component
 * 
 * Purpose: Admin modal to upload remaining payment proof and complete booking
 * Features:
 * - Payment method selection
 * - File upload for payment proof
 * - Display remaining amount
 * - Admin notes field
 * - Extra charges functionality
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
  Box,
  Flex,
  ActionIcon,
  ScrollArea,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import {
  IconUpload,
  IconAlertCircle,
  IconCheck,
  IconCurrencyRupee,
  IconPlus,
  IconTrash,
  IconBottle,
  IconBallTennis,
  IconBandage,
  IconPackage,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface ExtraCharge {
  category: 'mineral water' | 'tape' | 'ball' | 'other';
  amount: number;
}

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
  const [paymentAmount, setPaymentAmount] = useState<number>(remainingAmount || 0);
  const [showExtraCharges, setShowExtraCharges] = useState(false);
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [extraChargeAmount, setExtraChargeAmount] = useState<string>('');

  // Calculate total with extra charges
  const totalExtraCharges = extraCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  const totalPayable = (remainingAmount || 0) + totalExtraCharges;

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

    if (paymentAmount > totalPayable) {
      setError(`Payment amount cannot exceed total payable amount (Rs ${totalPayable.toLocaleString()})`);
      return;
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
      
      // Add extra charges if any
      if (extraCharges.length > 0) {
        formData.append('extraCharges', JSON.stringify(extraCharges));
      }
      
      // Only append proof if it exists (cash payments may not have proof)
      if (paymentProof) {
        formData.append('paymentProof', paymentProof);
      }
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
          message: `Payment verified! Booking ${bookingNumber} is now completed.${result.totalExtraCharges > 0 ? ` Added Rs ${result.totalExtraCharges} in extra charges.` : ''}`,
          color: 'green',
          icon: <IconCheck size={18} />,
        });
        
        // Reset form
        setPaymentMethod('');
        setPaymentProof(null);
        setAdminNotes('');
        setExtraCharges([]);
        setShowExtraCharges(false);
        setSelectedCategory('');
        setExtraChargeAmount('');
        
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
      setPaymentAmount(remainingAmount || 0);
      setError(null);
      setExtraCharges([]);
      setShowExtraCharges(false);
      setSelectedCategory('');
      setExtraChargeAmount('');
      onClose();
    }
  };

  const handleAddExtraCharge = () => {
    if (!selectedCategory || !extraChargeAmount || parseFloat(extraChargeAmount) <= 0) {
      setError('Please select a category and enter a valid amount');
      return;
    }

    const newCharge: ExtraCharge = {
      category: selectedCategory as ExtraCharge['category'],
      amount: parseFloat(extraChargeAmount),
    };

    setExtraCharges([...extraCharges, newCharge]);
    setSelectedCategory('');
    setExtraChargeAmount('');
    setError(null);
  };

  const handleRemoveExtraCharge = (index: number) => {
    const updatedCharges = [...extraCharges];
    updatedCharges.splice(index, 1);
    setExtraCharges(updatedCharges);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'mineral water':
        return <IconBottle size={16} />;
      case 'tape':
        return <IconBandage size={16} />;
      case 'ball':
        return <IconBallTennis size={16} />;
      case 'other':
        return <IconPackage size={16} />;
      default:
        return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'mineral water':
        return 'Mineral Water';
      case 'tape':
        return 'Tape';
      case 'ball':
        return 'Ball';
      case 'other':
        return 'Other';
      default:
        return category;
    }
  };

  // Update payment amount when total payable changes
  useEffect(() => {
    setPaymentAmount(totalPayable);
  }, [totalPayable]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Complete Payment Verification"
      size="lg"
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
              Total Remaining: Rs {(remainingAmount || 0).toLocaleString()}
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

        {/* Extra Charges Section */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="sm">
            <Text fw={600}>Extra Charges</Text>
            <Button
              size="xs"
              variant={showExtraCharges ? 'filled' : 'light'}
              leftSection={<IconPlus size={14} />}
              onClick={() => setShowExtraCharges(!showExtraCharges)}
            >
              {showExtraCharges ? 'Hide' : 'Add Extra Charges'}
            </Button>
          </Group>

          {showExtraCharges && (
            <Stack gap="sm">
              <Group align="flex-end">
                <Select
                  label="Category"
                  placeholder="Select category"
                  data={[
                    { value: 'mineral water', label: 'Mineral Water' },
                    { value: 'tape', label: 'Tape' },
                    { value: 'ball', label: 'Ball' },
                    { value: 'other', label: 'Other' },
                  ]}
                  value={selectedCategory}
                  onChange={(value) => setSelectedCategory(value || '')}
                  style={{ flex: 1 }}
                />
                <NumberInput
                  label="Amount"
                  placeholder="Enter amount"
                  leftSection={<IconCurrencyRupee size={16} />}
                  value={extraChargeAmount}
                  onChange={setExtraChargeAmount}
                  min={1}
                  thousandSeparator=","
                  allowNegative={false}
                  decimalScale={0}
                  style={{ flex: 1 }}
                />
                <Button
                  onClick={handleAddExtraCharge}
                  leftSection={<IconPlus size={16} />}
                  mb={4}
                >
                  Add
                </Button>
              </Group>

              {extraCharges.length > 0 && (
                <ScrollArea.Autosize mah={150}>
                  <Stack gap="xs">
                    {extraCharges.map((charge, index) => (
                      <Paper key={index} withBorder p="xs" radius="sm">
                        <Group justify="space-between">
                          <Group gap="xs">
                            <ThemeIcon size="sm" variant="light">
                              {getCategoryIcon(charge.category)}
                            </ThemeIcon>
                            <Text size="sm">{getCategoryLabel(charge.category)}</Text>
                          </Group>
                          <Group gap="xs">
                            <Text size="sm" fw={600}>
                              Rs {charge.amount.toLocaleString()}
                            </Text>
                            <ActionIcon
                              size="sm"
                              color="red"
                              variant="subtle"
                              onClick={() => handleRemoveExtraCharge(index)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              )}
            </Stack>
          )}

          {/* Total Summary */}
          <Box mt="md">
            <Group justify="space-between">
              <Text size="sm">Original Remaining:</Text>
              <Text size="sm" fw={600}>
                Rs {(remainingAmount || 0).toLocaleString()}
              </Text>
            </Group>
            {extraCharges.length > 0 && (
              <>
                <Group justify="space-between" mt={4}>
                  <Text size="sm">Extra Charges:</Text>
                  <Text size="sm" fw={600} c="blue">
                    + Rs {totalExtraCharges.toLocaleString()}
                  </Text>
                </Group>
                <Group justify="space-between" mt={4}>
                  <Text size="sm" fw={600}>Total Payable:</Text>
                  <Text size="sm" fw={700} c="green">
                    Rs {totalPayable.toLocaleString()}
                  </Text>
                </Group>
              </>
            )}
          </Box>
        </Paper>

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
          max={totalPayable}
          thousandSeparator=","
          allowNegative={false}
          decimalScale={0}
        />

        {/* Show discount amount if different */}
        {paymentAmount < totalPayable && (
          <Alert color="yellow" variant="light">
            <Text size="sm">
              <strong>Discount Applied:</strong> Rs {(totalPayable - paymentAmount).toLocaleString()}
            </Text>
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
            notification. Extra charges will be added to the booking total.
          </Text>
        </Alert>
      </Stack>
    </Modal>
  );
}