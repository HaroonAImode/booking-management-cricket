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
 * - Discount functionality
 * - Validation and submission
 * - Mobile responsive design
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
  SimpleGrid,
  Divider,
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
  IconDiscount,
  IconInfoCircle,
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
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [isDiscountManual, setIsDiscountManual] = useState(false);

  // Calculate total with extra charges
  const totalExtraCharges = extraCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  const totalPayable = (remainingAmount || 0) + totalExtraCharges;
  const calculatedPayment = totalPayable - appliedDiscount;

  // Update payment amount when total changes
  useEffect(() => {
    if (!isDiscountManual) {
      setPaymentAmount(totalPayable);
      setAppliedDiscount(0);
    }
  }, [totalPayable, isDiscountManual]);

  // Update discount when payment amount is manually changed
  useEffect(() => {
    if (isDiscountManual && paymentAmount < totalPayable) {
      setAppliedDiscount(totalPayable - paymentAmount);
    } else if (isDiscountManual && paymentAmount >= totalPayable) {
      setAppliedDiscount(0);
    }
  }, [paymentAmount, totalPayable, isDiscountManual]);

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

    // Validate minimum payment
    const minimumPayment = remainingAmount; // Must pay at least original remaining
    if (paymentAmount < minimumPayment) {
      setError(`Payment must be at least Rs ${minimumPayment.toLocaleString()} (original remaining amount)`);
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

    // Confirm discount if applied
    if (appliedDiscount > 0) {
      const confirmed = window.confirm(
        `You are applying a discount of Rs ${appliedDiscount.toLocaleString()}.\n\n` +
        `Original Remaining: Rs ${remainingAmount.toLocaleString()}\n` +
        `Extra Charges: Rs ${totalExtraCharges.toLocaleString()}\n` +
        `Total Payable: Rs ${totalPayable.toLocaleString()}\n` +
        `Discount: Rs ${appliedDiscount.toLocaleString()}\n` +
        `Final Payment: Rs ${paymentAmount.toLocaleString()}\n\n` +
        `Is this correct?`
      );
      
      if (!confirmed) {
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Create form data
      const formData = new FormData();
      formData.append('paymentMethod', paymentMethod);
      formData.append('paymentAmount', paymentAmount.toString());
      formData.append('discountAmount', appliedDiscount.toString());
      
      // FIX: ALWAYS send extraCharges field, even if empty array
      formData.append('extraCharges', JSON.stringify(extraCharges));
      
      // Only append proof if it exists (cash payments may not have proof)
      if (paymentProof) {
        formData.append('paymentProof', paymentProof);
      }
      if (adminNotes) {
        formData.append('adminNotes', adminNotes);
      }

      // Debug logging
      console.log('Submitting payment data:', {
        bookingId,
        bookingNumber,
        paymentMethod,
        paymentAmount,
        discountAmount: appliedDiscount,
        extraCharges: extraCharges,
        extraChargesJson: JSON.stringify(extraCharges),
        extraChargesCount: extraCharges.length,
        hasPaymentProof: !!paymentProof,
        adminNotes,
      });

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
        let message = `Payment verified! Booking ${bookingNumber} is now completed.`;
        if (totalExtraCharges > 0) {
          message += ` Added Rs ${totalExtraCharges.toLocaleString()} in extra charges.`;
        }
        if (appliedDiscount > 0) {
          message += ` Discount: Rs ${appliedDiscount.toLocaleString()}.`;
        }
        
        notifications.show({
          title: '✅ Payment Verified',
          message,
          color: 'green',
          icon: <IconCheck size={18} />,
        });
        
        // Reset form
        setPaymentMethod('');
        setPaymentProof(null);
        setAdminNotes('');
        setPaymentAmount(remainingAmount || 0);
        setExtraCharges([]);
        setShowExtraCharges(false);
        setSelectedCategory('');
        setExtraChargeAmount('');
        setAppliedDiscount(0);
        setIsDiscountManual(false);
        
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Failed to verify payment');
        
        notifications.show({
          title: '❌ Payment Failed',
          message: result.error || 'Failed to verify payment',
          color: 'red',
          icon: <IconAlertCircle size={18} />,
        });
      }
    } catch (error) {
      console.error('Complete payment error:', error);
      setError('Failed to verify payment. Please try again.');
      
      notifications.show({
        title: '❌ Network Error',
        message: 'Failed to connect to server. Please check your connection.',
        color: 'red',
        icon: <IconAlertCircle size={18} />,
      });
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
      setAppliedDiscount(0);
      setIsDiscountManual(false);
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
    setIsDiscountManual(true); // Allow editing after adding extra charges
  };

  const handleRemoveExtraCharge = (index: number) => {
    const updatedCharges = [...extraCharges];
    updatedCharges.splice(index, 1);
    setExtraCharges(updatedCharges);
    setIsDiscountManual(true); // Allow editing after removing charges
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

  const handlePaymentAmountChange = (value: number | string) => {
    const numValue = Number(value);
    setPaymentAmount(numValue);
    setIsDiscountManual(true);
  };

  const handleApplyDiscount = () => {
    const discount = window.prompt('Enter discount amount:');
    if (discount && !isNaN(parseFloat(discount)) && parseFloat(discount) >= 0) {
      const discountAmount = parseFloat(discount);
      if (discountAmount > totalPayable - remainingAmount) {
        setError(`Discount cannot exceed Rs ${(totalPayable - remainingAmount).toLocaleString()} (extra charges amount)`);
        return;
      }
      const newPayment = totalPayable - discountAmount;
      if (newPayment < remainingAmount) {
        setError(`Payment after discount (Rs ${newPayment.toLocaleString()}) must be at least Rs ${remainingAmount.toLocaleString()} (original remaining amount)`);
        return;
      }
      setPaymentAmount(newPayment);
      setAppliedDiscount(discountAmount);
      setIsDiscountManual(true);
      setError(null);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Complete Payment Verification"
      size="lg"
      zIndex={300}
      fullScreen
      transitionProps={{ transition: 'fade', duration: 200 }}
    >
      <ScrollArea.Autosize mah="80vh">
        <Stack gap="md" p="sm">
          {/* Booking Info */}
          <Alert color="blue" title="Booking Information">
            <Group wrap="wrap" justify="space-between">
              <Text size="sm">
                <strong>Booking:</strong> {bookingNumber}
              </Text>
              <Badge size="lg" color="orange">
                Remaining Amount: Rs {(remainingAmount || 0).toLocaleString()}
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
              <Text fw={600} size="sm">Extra Charges</Text>
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
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
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
                  />
                </SimpleGrid>
                <Button
                  onClick={handleAddExtraCharge}
                  leftSection={<IconPlus size={16} />}
                  fullWidth
                  size="sm"
                >
                  Add Extra Charge
                </Button>

                {extraCharges.length > 0 && (
                  <ScrollArea.Autosize mah={150}>
                    <Stack gap="xs">
                      {extraCharges.map((charge, index) => (
                        <Paper key={index} withBorder p="xs" radius="sm">
                          <Group justify="space-between" wrap="nowrap">
                            <Group gap="xs" wrap="nowrap">
                              <ThemeIcon size="sm" variant="light">
                                {getCategoryIcon(charge.category)}
                              </ThemeIcon>
                              <Text size="sm" truncate>
                                {getCategoryLabel(charge.category)}
                              </Text>
                            </Group>
                            <Group gap="xs" wrap="nowrap">
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
              <Stack gap={4}>
                <Group justify="space-between" wrap="wrap">
                  <Text size="sm">Original Remaining:</Text>
                  <Text size="sm" fw={600}>
                    Rs {(remainingAmount || 0).toLocaleString()}
                  </Text>
                </Group>
                {extraCharges.length > 0 && (
                  <Group justify="space-between" wrap="wrap">
                    <Text size="sm">Extra Charges:</Text>
                    <Text size="sm" fw={600} c="blue">
                      + Rs {totalExtraCharges.toLocaleString()}
                    </Text>
                  </Group>
                )}
                <Divider my={4} />
                <Group justify="space-between" wrap="wrap">
                  <Text size="sm" fw={600}>Total Payable:</Text>
                  <Text size="sm" fw={700} c="green">
                    Rs {totalPayable.toLocaleString()}
                  </Text>
                </Group>
                {appliedDiscount > 0 && (
                  <Group justify="space-between" wrap="wrap">
                    <Text size="sm">Discount Applied:</Text>
                    <Text size="sm" fw={600} c="red">
                      - Rs {appliedDiscount.toLocaleString()}
                    </Text>
                  </Group>
                )}
              </Stack>
            </Box>
          </Paper>

          {/* Payment Amount & Discount Section */}
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="md">
              <Text fw={600} size="sm">Payment Amount</Text>
              <Button
                size="xs"
                variant="light"
                color="yellow"
                leftSection={<IconDiscount size={14} />}
                onClick={handleApplyDiscount}
                disabled={totalPayable <= remainingAmount}
              >
                Apply Discount
              </Button>
            </Group>

            <NumberInput
              label="Enter Payment Amount"
              description={isDiscountManual ? 
                "Payment amount manually adjusted. Auto-calculation disabled." :
                "Amount auto-calculated. Click 'Apply Discount' or edit to adjust."}
              placeholder="Enter amount"
              required
              leftSection={<IconCurrencyRupee size={18} />}
              value={paymentAmount}
              onChange={handlePaymentAmountChange}
              min={remainingAmount}
              max={totalPayable}
              thousandSeparator=","
              allowNegative={false}
              decimalScale={0}
              disabled={loading}
            />

            {/* Payment Summary */}
            <Stack gap={4} mt="md">
              <Group justify="space-between">
                <Text size="sm">Total Payable:</Text>
                <Text size="sm" fw={600}>Rs {totalPayable.toLocaleString()}</Text>
              </Group>
              {appliedDiscount > 0 && (
                <Group justify="space-between">
                  <Text size="sm">Discount:</Text>
                  <Text size="sm" fw={600} c="green">
                    - Rs {appliedDiscount.toLocaleString()}
                  </Text>
                </Group>
              )}
              <Divider />
              <Group justify="space-between">
                <Text size="sm" fw={600}>Final Payment:</Text>
                <Text size="sm" fw={700} c="blue">
                  Rs {paymentAmount.toLocaleString()}
                </Text>
              </Group>
            </Stack>

            {/* Important Notes */}
            <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light" mt="md" p="xs">
              <Text size="xs">
                <strong>Important:</strong> Payment must be at least Rs {remainingAmount.toLocaleString()} (original remaining amount). 
                Discount can only be applied to extra charges portion.
              </Text>
            </Alert>
          </Paper>

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
            disabled={loading}
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
            disabled={loading}
          />

          {/* Admin Notes */}
          <Textarea
            label="Admin Notes (Optional)"
            placeholder="Add any notes about this payment verification or discount reason..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            minRows={3}
            autosize
            disabled={loading}
          />

          {/* Action Buttons */}
          <Group justify="flex-end" mt="md" wrap="wrap">
            <Button 
              variant="light" 
              onClick={handleClose} 
              disabled={loading}
              fullWidth={{ base: true, sm: false }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              leftSection={<IconCheck size={18} />}
              color="green"
              fullWidth={{ base: true, sm: false }}
            >
              Verify & Complete Booking
            </Button>
          </Group>
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
}