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
 * - Discount functionality (can be applied to total amount)
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
  // Split payment state
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [onlineAmount, setOnlineAmount] = useState<number>(0);
  const [onlineMethod, setOnlineMethod] = useState<string>(''); // 'easypaisa' or 'sadapay'
  
  // Legacy single payment method (kept for backward compatibility)
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

  // Calculate total with extra charges
  const totalExtraCharges = extraCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  const totalPayable = (remainingAmount || 0) + totalExtraCharges;
  
  // Final payable amount after discount
  const finalPayableAmount = totalPayable - appliedDiscount;
  
  // Split payment total (cash + online)
  const splitPaymentTotal = (cashAmount || 0) + (onlineAmount || 0);

  // Reset form when modal opens
  useEffect(() => {
    if (opened) {
      // Initialize with full amount in cash by default
      const initialAmount = remainingAmount || 0;
      setCashAmount(initialAmount);
      setOnlineAmount(0);
      setOnlineMethod('');
      setPaymentAmount(initialAmount);
      setAppliedDiscount(0);
      setExtraCharges([]);
      setPaymentMethod('');
      setPaymentProof(null);
      setAdminNotes('');
      setError(null);
      setShowExtraCharges(false);
      setSelectedCategory('');
      setExtraChargeAmount('');
    }
  }, [opened, remainingAmount]);
  
  // Auto-adjust cash when online amount changes
  const handleOnlineAmountChange = (value: number | string) => {
    const numValue = Number(value) || 0;
    const currentFinalAmount = finalPayableAmount;
    
    if (numValue < 0) {
      setError('Online amount cannot be negative');
      return;
    }
    
    if (numValue > currentFinalAmount) {
      setError(`Online amount cannot exceed final payable amount (Rs ${currentFinalAmount.toLocaleString()})`);
      return;
    }
    
    setOnlineAmount(numValue);
    // Auto-calculate cash amount based on final payable (after discount)
    const newCashAmount = currentFinalAmount - numValue;
    setCashAmount(newCashAmount >= 0 ? newCashAmount : 0);
    setError(null);
  };
  
  // Handle cash amount change manually
  const handleCashAmountChange = (value: number | string) => {
    const numValue = Number(value) || 0;
    const currentFinalAmount = finalPayableAmount;
    
    if (numValue < 0) {
      setError('Cash amount cannot be negative');
      return;
    }
    
    if (numValue > currentFinalAmount) {
      setError(`Cash amount cannot exceed final payable amount (Rs ${currentFinalAmount.toLocaleString()})`);
      return;
    }
    
    setCashAmount(numValue);
    // Auto-calculate online amount based on final payable (after discount)
    const newOnlineAmount = currentFinalAmount - numValue;
    setOnlineAmount(newOnlineAmount >= 0 ? newOnlineAmount : 0);
    setError(null);
  };

  // Update payment amount when extra charges change (auto-calculate)
  useEffect(() => {
    // Calculate new total including extra charges
    const newTotal = (remainingAmount || 0) + totalExtraCharges;
    
    // Only auto-update if payment amount is currently at the previous total
    // This prevents overwriting manual adjustments
    if (paymentAmount === (remainingAmount || 0) || paymentAmount === totalPayable - appliedDiscount) {
      setPaymentAmount(newTotal);
      // Reset discount when extra charges are added/removed
      setAppliedDiscount(0);
    }
  }, [totalExtraCharges, remainingAmount]);
  
  // Update split payment amounts when finalPayableAmount changes (extra charges/discount applied)
  useEffect(() => {
    const currentFinalAmount = finalPayableAmount;
    const currentTotal = (cashAmount || 0) + (onlineAmount || 0);
    
    // Only update if current split doesn't match final payable amount
    if (currentTotal !== currentFinalAmount) {
      // Maintain the ratio of cash vs online, or default to all cash
      if (onlineAmount > 0 && currentTotal > 0) {
        const ratio = onlineAmount / currentTotal;
        const newOnline = Math.round(currentFinalAmount * ratio);
        const newCash = currentFinalAmount - newOnline;
        setOnlineAmount(newOnline);
        setCashAmount(newCash);
      } else {
        // Default: all cash
        setCashAmount(currentFinalAmount);
        setOnlineAmount(0);
      }
    }
  }, [finalPayableAmount]);

  const handleSubmit = async () => {
    // Validation for split payment
    const totalSplit = (cashAmount || 0) + (onlineAmount || 0);
    const currentFinalAmount = finalPayableAmount;
    
    if (totalSplit !== currentFinalAmount) {
      setError(`Total payment (Cash: Rs ${cashAmount.toLocaleString()} + Online: Rs ${onlineAmount.toLocaleString()} = Rs ${totalSplit.toLocaleString()}) must equal Rs ${currentFinalAmount.toLocaleString()}`);
      return;
    }
    
    // If online amount > 0, require online method selection
    if (onlineAmount > 0 && !onlineMethod) {
      setError('Please select online payment method (EasyPaisa or SadaPay)');
      return;
    }
    
    // Payment proof validation
    if (!paymentProof && onlineAmount > 0) {
      setError('Please upload payment proof for online payments');
      return;
    }

    // Confirm split payment
    if (onlineAmount > 0 && cashAmount > 0) {
      const confirmed = window.confirm(
        `Split Payment Confirmation:\n\n` +
        `Cash Amount: Rs ${cashAmount.toLocaleString()}\n` +
        `Online (${onlineMethod?.toUpperCase()}): Rs ${onlineAmount.toLocaleString()}\n` +
        `Total: Rs ${totalSplit.toLocaleString()}\n\n` +
        (extraCharges.length > 0 ? `Extra Charges: Rs ${totalExtraCharges.toLocaleString()}\n\n` : '') +
        `Proceed with payment?`
      );
      
      if (!confirmed) return;
    }

    try {
      setLoading(true);
      setError(null);

      // Determine payment method based on split payment
      let determinedPaymentMethod: string;
      if (onlineAmount > 0 && cashAmount > 0) {
        // Split payment: use the online method or 'cash' if only cash
        determinedPaymentMethod = onlineMethod || 'cash';
      } else if (onlineAmount > 0) {
        // Online payment only
        determinedPaymentMethod = onlineMethod || 'easypaisa';
      } else {
        // Cash payment only
        determinedPaymentMethod = 'cash';
      }

      // Create form data
      const formData = new FormData();
      
      // Payment method (REQUIRED by backend)
      formData.append('paymentMethod', determinedPaymentMethod);
      
      // Split payment data
      formData.append('cashAmount', cashAmount.toString());
      formData.append('onlineAmount', onlineAmount.toString());
      if (onlineMethod) {
        formData.append('onlineMethod', onlineMethod);
      }
      
      // Total payment amount
      formData.append('paymentAmount', totalSplit.toString());
      formData.append('discountAmount', appliedDiscount.toString());
      
      // Extra charges
      const extraChargesData = extraCharges.length > 0 ? extraCharges : [];
      formData.append('extraCharges', JSON.stringify(extraChargesData));
      
      // Payment proof (only needed if online amount > 0)
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
        paymentMethod: determinedPaymentMethod,
        cashAmount,
        onlineAmount,
        onlineMethod,
        paymentAmount: totalSplit,
        discountAmount: appliedDiscount,
        extraCharges: extraChargesData,
        extraChargesJson: JSON.stringify(extraChargesData),
        extraChargesCount: extraChargesData.length,
        remainingAmount,
        totalExtraCharges,
        totalPayable,
        expectedTotal: totalPayable - appliedDiscount,
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
        setCashAmount(0);
        setOnlineAmount(0);
        setOnlineMethod('');
        setPaymentMethod('');
        setPaymentProof(null);
        setAdminNotes('');
        setPaymentAmount(remainingAmount || 0);
        setExtraCharges([]);
        setShowExtraCharges(false);
        setSelectedCategory('');
        setExtraChargeAmount('');
        setAppliedDiscount(0);
        
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
      // Reset all state
      setCashAmount(0);
      setOnlineAmount(0);
      setOnlineMethod('');
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

  const handlePaymentAmountChange = (value: number | string) => {
    const numValue = Number(value);
    if (numValue >= 0 && numValue <= totalPayable) {
      setPaymentAmount(numValue);
      
      // Calculate discount based on payment amount
      const newDiscount = totalPayable - numValue;
      if (newDiscount >= 0 && newDiscount <= totalPayable) {
        setAppliedDiscount(newDiscount);
      }
    }
  };

  const handleApplyDiscount = () => {
    const discount = window.prompt(`Enter discount amount (max: Rs ${totalPayable.toLocaleString()}):`);
    if (discount && !isNaN(parseFloat(discount)) && parseFloat(discount) >= 0) {
      const discountAmount = parseFloat(discount);
      
      // Allow discount on TOTAL PAYABLE, not just extra charges
      if (discountAmount > totalPayable) {
        setError(`Discount cannot exceed Rs ${totalPayable.toLocaleString()} (total payable amount)`);
        notifications.show({
          title: '❌ Discount Too High',
          message: `Discount cannot exceed total payable amount (Rs ${totalPayable.toLocaleString()})`,
          color: 'red',
          icon: <IconAlertCircle size={18} />,
        });
        return;
      }
      
      // Calculate new payment amount
      const newPayment = totalPayable - discountAmount;
      
      // Validate minimum payment (must be at least 0)
      if (newPayment < 0) {
        setError(`Payment after discount cannot be negative`);
        notifications.show({
          title: '❌ Invalid Discount',
          message: 'Payment after discount cannot be negative',
          color: 'red',
          icon: <IconAlertCircle size={18} />,
        });
        return;
      }
      
      // Apply discount
      setPaymentAmount(newPayment);
      setAppliedDiscount(discountAmount);
      setError(null);
      
      notifications.show({
        title: '✅ Discount Applied',
        message: `Discount of Rs ${discountAmount.toLocaleString()} applied. New payment: Rs ${newPayment.toLocaleString()}`,
        color: 'green',
        icon: <IconDiscount size={18} />,
      });
    }
  };

  const handleResetDiscount = () => {
    setPaymentAmount(totalPayable);
    setAppliedDiscount(0);
    setError(null);
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
                    onChange={(value) => setExtraChargeAmount(String(value))}
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
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  color="yellow"
                  leftSection={<IconDiscount size={14} />}
                  onClick={handleApplyDiscount}
                >
                  Apply Discount
                </Button>
                {appliedDiscount > 0 && (
                  <Button
                    size="xs"
                    variant="light"
                    color="gray"
                    onClick={handleResetDiscount}
                  >
                    Reset
                  </Button>
                )}
              </Group>
            </Group>

            <NumberInput
              label="Enter Payment Amount"
              description={appliedDiscount > 0 ? 
                "Payment amount includes discount. Click 'Reset' to remove discount." :
                "Amount includes extra charges. Click 'Apply Discount' to reduce amount."}
              placeholder="Enter amount"
              required
              leftSection={<IconCurrencyRupee size={18} />}
              value={paymentAmount}
              onChange={handlePaymentAmountChange}
              min={0}
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
                <strong>Important:</strong> Discount can be applied to the total payable amount. 
                Payment after discount must be at least Rs 0. The payment amount should match: 
                (Remaining + Extra Charges) - Discount
              </Text>
            </Alert>
          </Paper>

          {/* Split Payment Section */}
          <Paper withBorder p="md" radius="md" style={{ background: '#F5F5F5' }}>
            <Text fw={700} size="lg" mb="md" c="#1A1A1A">💰 Payment Split</Text>
            
            <Stack gap="md">
              {/* Cash Amount */}
              <Box>
                <NumberInput
                  label="Cash Amount"
                  placeholder="Enter cash amount"
                  leftSection={<IconCurrencyRupee size={18} />}
                  value={cashAmount}
                  onChange={handleCashAmountChange}
                  min={0}
                  max={finalPayableAmount}
                  thousandSeparator=","
                  allowNegative={false}
                  decimalScale={0}
                  disabled={loading}
                  styles={{
                    input: {
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      background: 'white',
                      border: '2px solid #1A1A1A',
                    }
                  }}
                  description={`Cash portion of payment (Max: Rs ${finalPayableAmount.toLocaleString()})${appliedDiscount > 0 ? ' - After discount' : ''}`}
                />
              </Box>

              {/* Online Payment Section */}
              <Paper withBorder p="sm" radius="md" style={{ background: 'white' }}>
                <Text fw={600} size="sm" mb="xs" c="#1A1A1A">Online Payment</Text>
                
                <Stack gap="sm">
                  <NumberInput
                    label="Online Amount"
                    placeholder="Enter online amount"
                    leftSection={<IconCurrencyRupee size={18} />}
                    value={onlineAmount}
                    onChange={handleOnlineAmountChange}
                    min={0}
                    max={finalPayableAmount}
                    thousandSeparator=","
                    allowNegative={false}
                    decimalScale={0}
                    disabled={loading}
                    styles={{
                      input: {
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        background: '#FFF9E6',
                        border: '2px solid #F5B800',
                      }
                    }}
                    description={`Online portion - Cash will auto-adjust${appliedDiscount > 0 ? ' (After discount)' : ''}`}
                  />
                  
                  {onlineAmount > 0 && (
                    <Select
                      label="Online Payment Method"
                      placeholder="Select method"
                      required
                      data={[
                        { value: 'easypaisa', label: '💳 Easypaisa' },
                        { value: 'sadapay', label: '💳 SadaPay' },
                      ]}
                      value={onlineMethod}
                      onChange={(value) => setOnlineMethod(value || '')}
                      disabled={loading}
                      styles={{
                        input: {
                          border: '2px solid #F5B800',
                        }
                      }}
                    />
                  )}
                </Stack>
              </Paper>

              {/* Payment Summary */}
              <Alert color="blue" icon={<IconInfoCircle size={18} />}>
                <Stack gap={4}>
                  <Group justify="space-between">
                    <Text size="sm">Cash Payment:</Text>
                    <Text size="sm" fw={700}>Rs {cashAmount.toLocaleString()}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Online Payment{onlineMethod && ` (${onlineMethod.toUpperCase()})`}:</Text>
                    <Text size="sm" fw={700}>Rs {onlineAmount.toLocaleString()}</Text>
                  </Group>
                  <Divider my={4} />
                  {appliedDiscount > 0 && (
                    <>
                      <Group justify="space-between">
                        <Text size="sm">Subtotal (Before Discount):</Text>
                        <Text size="sm" fw={600}>Rs {totalPayable.toLocaleString()}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm">Discount Applied:</Text>
                        <Text size="sm" fw={600} c="red">- Rs {appliedDiscount.toLocaleString()}</Text>
                      </Group>
                      <Divider my={4} />
                    </>
                  )}
                  <Group justify="space-between">
                    <Text size="sm" fw={700}>Total Payment:</Text>
                    <Text size="lg" fw={900} c={splitPaymentTotal === finalPayableAmount ? 'green' : 'red'}>
                      Rs {splitPaymentTotal.toLocaleString()}
                    </Text>
                  </Group>
                  {splitPaymentTotal !== finalPayableAmount && (
                    <Text size="xs" c="red" mt={4}>
                      ⚠️ Total must equal Rs {finalPayableAmount.toLocaleString()}
                    </Text>
                  )}
                </Stack>
              </Alert>
            </Stack>
          </Paper>

          {/* Payment Proof Upload (only if online payment) */}
          {onlineAmount > 0 && (
            <FileInput
              label="Payment Proof"
              placeholder="Upload payment proof image"
              required
              accept="image/*"
              leftSection={<IconUpload size={18} />}
              value={paymentProof}
              onChange={setPaymentProof}
              description="Upload screenshot or photo of online payment receipt"
              disabled={loading}
            />
          )}

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
              w={{ base: '100%', sm: 'auto' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              leftSection={<IconCheck size={18} />}
              color="green"
              w={{ base: '100%', sm: 'auto' }}
            >
              Verify & Complete Booking
            </Button>
          </Group>
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
}