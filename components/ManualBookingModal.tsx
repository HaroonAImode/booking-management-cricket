/**
 * ManualBookingModal Component
 * Form for admin to create manual bookings
 */

'use client';

import { useState } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Button,
  Group,
  Checkbox,
  Grid,
  Badge,
  Paper,
  Text,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { formatTimeDisplay, formatTimeRange } from '@/lib/supabase/bookings';

interface ManualBookingModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Slot {
  hour: number;
  isNightRate: boolean;
  rate: number;
}

export default function ManualBookingModal({
  opened,
  onClose,
  onSuccess,
}: ManualBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    bookingDate: new Date(),
    advancePayment: 500,
    advancePaymentMethod: 'cash',
    notes: '',
    autoApprove: true,
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedHour, setSelectedHour] = useState<number>(9);

  const dayRate = 1500;
  const nightRate = 2000;

  const isNightHour = (hour: number) => {
    return hour >= 17 || hour <= 6;
  };

  const addSlot = () => {
    if (slots.find(s => s.hour === selectedHour)) {
      notifications.show({
        title: 'Error',
        message: 'This hour is already added',
        color: 'red',
      });
      return;
    }

    const isNight = isNightHour(selectedHour);
    const newSlot: Slot = {
      hour: selectedHour,
      isNightRate: isNight,
      rate: isNight ? nightRate : dayRate,
    };

    setSlots([...slots, newSlot].sort((a, b) => a.hour - b.hour));
  };

  const removeSlot = (hour: number) => {
    setSlots(slots.filter(s => s.hour !== hour));
  };

  const calculateTotal = () => {
    return slots.reduce((sum, slot) => sum + slot.rate, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.customerPhone) {
      notifications.show({
        title: 'Error',
        message: 'Customer name and phone are required',
        color: 'red',
      });
      return;
    }

    if (slots.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please add at least one slot',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone || null,
          bookingDate: formData.bookingDate.toISOString().split('T')[0],
          slots,
          totalAmount: calculateTotal(),
          advancePayment: formData.advancePayment,
          advancePaymentMethod: formData.advancePaymentMethod,
          notes: formData.notes || null,
          autoApprove: formData.autoApprove,
        }),
      });

      const result = await response.json();

      if (result.success) {
        notifications.show({
          title: 'Success',
          message: `Booking ${result.bookingNumber} created successfully`,
          color: 'green',
        });
        onClose();
        onSuccess();
        resetForm();
      } else {
        notifications.show({
          title: 'Error',
          message: result.error || 'Failed to create booking',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Create booking error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create booking',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      bookingDate: new Date(),
      advancePayment: 500,
      advancePaymentMethod: 'cash',
      notes: '',
      autoApprove: true,
    });
    setSlots([]);
    setSelectedHour(9);
  };

  const totalAmount = calculateTotal();
  const remainingAmount = totalAmount - formData.advancePayment;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create Manual Booking"
      size={{ base: 'full', sm: 'xl' }}
      zIndex={300}
      fullScreen={window.innerWidth < 768}
      styles={{
        body: {
          padding: window.innerWidth < 768 ? '0.5rem' : undefined,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Customer Info */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Text fw={600} mb="sm" size={{ base: 'sm', sm: 'md' }}>Customer Information</Text>
            <Grid gutter={{ base: 'xs', sm: 'md' }}>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Customer Name"
                  placeholder="Enter name"
                  required
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  size={{ base: 'sm', sm: 'md' }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Phone Number (Optional)"
                  placeholder="03001234567 (optional)"
                  value={formData.customerPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, customerPhone: e.target.value })
                  }
                  size={{ base: 'sm', sm: 'md' }}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Booking Details */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Text fw={600} mb="sm" size={{ base: 'sm', sm: 'md' }}>Booking Details</Text>
            <DateInput
              label="Booking Date"
              placeholder="Select date"
              required
              value={formData.bookingDate}
              onChange={(value) => {
                const date = typeof value === 'string' ? new Date(value) : (value || new Date());
                setFormData({ ...formData, bookingDate: date });
              }}
              minDate={new Date()}
              size={{ base: 'sm', sm: 'md' }}
            />
          </Paper>

          {/* Slots Selection */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Text fw={600} mb="sm" size={{ base: 'sm', sm: 'md' }}>Select Time Slots</Text>
            <Stack gap="sm">
              <Group grow>
                <Select
                  label="Hour"
                  placeholder="Select hour"
                  data={Array.from({ length: 24 }, (_, i) => ({
                    value: String(i),
                    label: `${formatTimeDisplay(i)} ${isNightHour(i) ? '(Night)' : '(Day)'}`,
                  }))}
                  value={String(selectedHour)}
                  onChange={(value) => setSelectedHour(parseInt(value || '9'))}
                  size={{ base: 'sm', sm: 'md' }}
                />
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={addSlot}
                  size={{ base: 'sm', sm: 'md' }}
                  mt={24}
                >
                  Add Slot
                </Button>
              </Group>

            {slots.length > 0 && (
              <Stack gap="xs">
                {slots.map((slot) => (
                  <Group key={slot.hour} justify="space-between" wrap="nowrap">
                    <Badge
                      size="lg"
                      color={slot.isNightRate ? 'indigo' : 'yellow'}
                    >
                      {formatTimeRange(slot.hour)}
                      {slot.isNightRate && ' 🌙'}
                    </Badge>
                    <Text size="sm" fw={500}>
                      Rs {slot.rate}
                    </Text>
                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      onClick={() => removeSlot(slot.hour)}
                    >
                      <IconTrash size={16} />
                    </Button>
                  </Group>
                ))}
              </Stack>
            )}
            </Stack>
          </Paper>

          {/* Payment Details */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Text fw={600} mb="sm" size={{ base: 'sm', sm: 'md' }}>Payment Details</Text>
            <Grid gutter={{ base: 'xs', sm: 'md' }}>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  label="Advance Payment"
                  placeholder="500"
                  required
                  min={0}
                  max={totalAmount}
                  value={formData.advancePayment}
                  onChange={(value) =>
                    setFormData({ ...formData, advancePayment: Number(value) })
                  }
                  size={{ base: 'sm', sm: 'md' }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Payment Method"
                  data={[
                    { value: 'easypaisa', label: 'Easypaisa' },
                    { value: 'sadapay', label: 'SadaPay' },
                    { value: 'cash', label: 'Cash' },
                  ]}
                  value={formData.advancePaymentMethod}
                  onChange={(value) =>
                    setFormData({ ...formData, advancePaymentMethod: value || 'cash' })
                  }
                  size={{ base: 'sm', sm: 'md' }}
                />
              </Grid.Col>
            </Grid>

            <Stack gap="xs" mt="sm">
              <Group justify="space-between">
                <Text size="sm">Total Amount:</Text>
                <Text size="sm" fw={600}>Rs {totalAmount.toLocaleString()}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Advance Payment:</Text>
                <Text size="sm" c="green" fw={500}>Rs {formData.advancePayment.toLocaleString()}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Remaining:</Text>
                <Text size="sm" c="orange" fw={500}>Rs {remainingAmount.toLocaleString()}</Text>
              </Group>
            </Stack>
          </Paper>

          {/* Notes */}
          <Textarea
            label="Notes (Optional)"
            placeholder="Any additional notes..."
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            minRows={2}
            size={{ base: 'sm', sm: 'md' }}
          />

          {/* Auto Approve */}
          <Checkbox
            label="Auto-approve this booking"
            checked={formData.autoApprove}
            onChange={(e) =>
              setFormData({ ...formData, autoApprove: e.currentTarget.checked })
            }
            size={{ base: 'sm', sm: 'md' }}
          />

          {/* Actions */}
          <Group justify="flex-end" gap={{ base: 'xs', sm: 'sm' }}>
            <Button variant="subtle" onClick={onClose} size={{ base: 'sm', sm: 'md' }}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={loading} 
              disabled={slots.length === 0}
              size={{ base: 'sm', sm: 'md' }}
            >
              Create Booking
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
