/**
 * ManualBookingModal Component
 * Form for admin to create manual bookings
 */

'use client';

import { useState, useEffect } from 'react';
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
  FileInput,
  Alert,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconChevronLeft, IconChevronRight, IconCalendar } from '@tabler/icons-react';
import { formatTimeDisplay, formatTimeRange } from '@/lib/supabase/bookings';
import SlotSelector from './SlotSelector';
import { uploadPaymentProof } from '@/lib/supabase/storage';
import { SlotInfo } from '@/types';

interface ManualBookingModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SlotWithDate {
  date: string;
  hour: number;
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
  const [selectedSlots, setSelectedSlots] = useState<SlotWithDate[]>([]);
  const [viewingDate, setViewingDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<SlotInfo[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);

  const dayRate = 1500;
  const nightRate = 2000;

  const isNightHour = (hour: number) => {
    return hour >= 17 || hour <= 6;
  };

  // Initialize viewing date when modal opens
  useEffect(() => {
    if (opened) {
      setViewingDate(formData.bookingDate);
    }
  }, [opened]);

  // Fetch available slots when viewingDate changes
  useEffect(() => {
    if (!viewingDate) return;
    setSlotsLoading(true);
    setSlotsError(null);
    const url = `/api/admin/bookings/check-slots?date=${viewingDate.toISOString().split('T')[0]}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const availableHours: number[] = data.availableSlots || [];
        const bookedHours: number[] = data.bookedSlots || [];
        const now = new Date();
        const isToday = viewingDate.toDateString() === now.toDateString();
        const currentHour = isToday ? now.getHours() : -1;
        const slots: SlotInfo[] = Array.from({ length: 24 }, (_, hour) => {
          const isPast = isToday && hour <= currentHour;
          const isAvailable = availableHours.includes(hour) && !isPast;
          const isBooked = bookedHours.includes(hour);
          return {
            slot_hour: hour,
            slot_time: `${String(hour).padStart(2, '0')}:00:00`,
            is_available: isAvailable,
            current_status: isBooked ? 'booked' : isAvailable ? 'available' : 'booked',
            hourly_rate: isNightHour(hour) ? nightRate : dayRate,
            is_night_rate: isNightHour(hour),
          };
        });
        setAvailableSlots(slots);
        setSlotsLoading(false);
      })
      .catch(err => {
        setSlotsError('Failed to load slots');
        setSlotsLoading(false);
      });
  }, [viewingDate]);

  // Date navigation handlers
  const handlePreviousDay = () => {
    const newDate = new Date(viewingDate);
    newDate.setDate(newDate.getDate() - 1);
    setViewingDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(viewingDate);
    newDate.setDate(newDate.getDate() + 1);
    setViewingDate(newDate);
  };

  // Get selected dates for display
  const getSelectedDates = () => {
    const dateGroups: Record<string, SlotWithDate[]> = {};
    selectedSlots.forEach(slot => {
      if (!dateGroups[slot.date]) {
        dateGroups[slot.date] = [];
      }
      dateGroups[slot.date].push(slot);
    });
    return dateGroups;
  };

  // Calculate total from selected slots
  const calculateTotal = () => {
    return selectedSlots.reduce((sum, slot) => {
      const rate = isNightHour(slot.hour) ? nightRate : dayRate;
      return sum + rate;
    }, 0);
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

    if (selectedSlots.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please select at least one slot',
        color: 'red',
      });
      return;
    }

    // Group slots by date and check sequential within each date
    const slotsByDate: Record<string, number[]> = {};
    selectedSlots.forEach(slot => {
      if (!slotsByDate[slot.date]) {
        slotsByDate[slot.date] = [];
      }
      slotsByDate[slot.date].push(slot.hour);
    });

    // Check for sequential slots within each date
    for (const [date, hours] of Object.entries(slotsByDate)) {
      const sorted = [...hours].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) {
          // Allow crossing midnight (23 -> 0)
          if (!(sorted[i - 1] === 23 && sorted[i] === 0)) {
            notifications.show({
              title: 'Warning',
              message: `Slots on ${new Date(date).toLocaleDateString()} are not consecutive. Please select continuous hours.`,
              color: 'yellow',
            });
            return;
          }
        }
      }
    }

    // No duplicate checking needed - slots already validated when selected

    try {
      setLoading(true);

      // Handle payment proof upload if required
      let paymentProofUrlToSend = null;
      if (formData.advancePaymentMethod !== 'cash' && paymentProofFile) {
        const fakeBookingId = crypto.randomUUID();
        const uploadResult = await uploadPaymentProof(
          paymentProofFile,
          fakeBookingId,
          formData.bookingDate.toISOString().split('T')[0]
        );
        if (uploadResult.error) {
          notifications.show({
            title: 'Error',
            message: uploadResult.error,
            color: 'red',
          });
          setLoading(false);
          return;
        }
        paymentProofUrlToSend = uploadResult.data || null;
      }

      // Prepare slots data with slot_date for each slot
      const allDates = Object.keys(getSelectedDates());
      const firstDate = allDates.sort()[0] || formData.bookingDate.toISOString().split('T')[0];
      
      const slotsData = selectedSlots.map(slot => {
        const slotTime = `${String(slot.hour).padStart(2, '0')}:00:00`;
        const rate = isNightHour(slot.hour) ? nightRate : dayRate;
        
        return {
          slotDate: slot.date,
          slotTime: slotTime,
          slotHour: slot.hour,
          hourlyRate: rate,
          is_night_rate: isNightHour(slot.hour),
          hour: slot.hour,
          rate: rate,
          isNightRate: isNightHour(slot.hour)
        };
      });

      console.log('=== SLOTS DATA BEING SENT ===');
      console.log(JSON.stringify(slotsData, null, 2));
      console.log('=== END SLOTS DATA ===');

      // Calculate totals
      const totalHours = selectedSlots.length;
      const totalAmount = calculateTotal();

      console.log('=== COMPLETE REQUEST DATA ===');
      console.log({
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        bookingDate: firstDate,
        slots: slotsData,
        totalHours,
        totalAmount,
        advancePayment: formData.advancePayment,
        advancePaymentMethod: formData.advancePaymentMethod,
        advancePaymentProof: paymentProofUrlToSend,
        adminNotes: formData.notes || null,
        autoApprove: formData.autoApprove,
      });
      console.log('=== END REQUEST DATA ===');

      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          bookingDate: firstDate,
          slots: slotsData,
          totalHours: totalHours,
          totalAmount: totalAmount,
          advancePayment: formData.advancePayment,
          advancePaymentMethod: formData.advancePaymentMethod,
          advancePaymentProof: paymentProofUrlToSend,
          adminNotes: formData.notes || null,
          autoApprove: formData.autoApprove,
        }),
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}. Response: ${errorText}`);
      }

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
    } catch (error: any) {
      console.error('Create booking error:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create booking',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const newDate = new Date();
    setFormData({
      customerName: '',
      customerPhone: '',
      bookingDate: newDate,
      advancePayment: 500,
      advancePaymentMethod: 'cash',
      notes: '',
      autoApprove: true,
    });
    setSelectedSlots([]);
    setViewingDate(newDate);
    setPaymentProofFile(null);
    setPaymentProofUrl(null);
  };

  const totalAmount = calculateTotal();
  const remainingAmount = totalAmount - formData.advancePayment;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create Manual Booking"
      size="xl"
      zIndex={300}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Customer Info */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Text fw={600} mb="sm" size="sm">Customer Information</Text>
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
                  size="sm"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Phone Number"
                  placeholder="03001234567"
                  required
                  value={formData.customerPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, customerPhone: e.target.value })
                  }
                  size="sm"
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Booking Details */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Text fw={600} mb="sm" size="sm">Booking Details</Text>
            <DateInput
              label="Booking Date"
              placeholder="Select date"
              required
              value={formData.bookingDate}
              onChange={(value) => {
                const date = typeof value === 'string' ? new Date(value) : (value || new Date());
                setFormData({ ...formData, bookingDate: date });
                setViewingDate(date);
                setSelectedSlots([]);
              }}
              minDate={new Date()}
              size="sm"
            />
          </Paper>

          {/* Slots Selection with Multi-Day Support */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Stack gap="md">
              <Text fw={600} size="sm">Select Time Slots</Text>
              
              {/* Date Navigation */}
              <Group justify="space-between" align="center">
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconChevronLeft size={14} />}
                  onClick={handlePreviousDay}
                >
                  Previous Day
                </Button>
                <Group gap="xs">
                  <IconCalendar size={16} />
                  <Text size="sm" fw={500}>
                    {viewingDate.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </Group>
                <Button
                  variant="light"
                  size="xs"
                  rightSection={<IconChevronRight size={14} />}
                  onClick={handleNextDay}
                >
                  Next Day
                </Button>
              </Group>

              {/* Selected Slots Display */}
              {selectedSlots.length > 0 && (
                <Paper withBorder p="sm" bg="blue.0">
                  <Text size="xs" fw={600} mb="xs" c="blue">
                    Selected: {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}
                  </Text>
                  <Stack gap="xs">
                    {Object.entries(getSelectedDates()).map(([date, slots]) => (
                      <Group key={date} gap="xs" wrap="wrap">
                        <Text size="xs" fw={500} style={{ minWidth: 100 }}>
                          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}:
                        </Text>
                        {slots
                          .sort((a, b) => a.hour - b.hour)
                          .map(slot => (
                            <Badge 
                              key={`${slot.date}-${slot.hour}`} 
                              size="sm"
                              color={isNightHour(slot.hour) ? 'indigo' : 'yellow'}
                            >
                              {formatTimeDisplay(slot.hour)} {isNightHour(slot.hour) ? '🌙' : ''}
                            </Badge>
                          ))
                        }
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              )}

              {/* Slot Selector */}
              <SlotSelector
                selectedDate={viewingDate}
                selectedSlots={selectedSlots
                  .filter(s => s.date === viewingDate.toISOString().split('T')[0])
                  .map(s => s.hour)}
                onSlotToggle={(hour) => {
                  const dateStr = viewingDate.toISOString().split('T')[0];
                  const slotIndex = selectedSlots.findIndex(
                    s => s.date === dateStr && s.hour === hour
                  );
                  
                  if (slotIndex >= 0) {
                    // Remove slot
                    setSelectedSlots(prev => prev.filter((_, i) => i !== slotIndex));
                  } else {
                    // Add slot
                    setSelectedSlots(prev => [...prev, { date: dateStr, hour }]);
                  }
                }}
                availableSlots={availableSlots}
                loading={slotsLoading}
                error={slotsError}
              />
            </Stack>
          </Paper>

          {/* Payment Details */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Text fw={600} mb="sm" size="sm">Payment Details</Text>
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
                  size="sm"
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
                  size="sm"
                />
              </Grid.Col>
            </Grid>

            {/* Payment Proof Upload */}
            <FileInput
              label={formData.advancePaymentMethod === 'cash' ? 'Payment Proof Screenshot (Optional)' : 'Payment Proof Screenshot'}
              placeholder="Upload payment screenshot"
              accept="image/png,image/jpeg,image/jpg"
              value={paymentProofFile}
              onChange={setPaymentProofFile}
              required={formData.advancePaymentMethod !== 'cash'}
              size="sm"
            />
            {formData.advancePaymentMethod !== 'cash' && (
              <Alert color="yellow" mt="xs">
                ⚠️ Please upload a clear screenshot of your payment receipt. Accepted formats: PNG, JPG, JPEG (Max 5MB)
              </Alert>
            )}
            {formData.advancePaymentMethod === 'cash' && (
              <Alert color="green" mt="xs">
                ℹ️ Cash payment will be collected at the venue before play time.
              </Alert>
            )}

            <Stack gap="xs" mt="sm">
              <Group justify="space-between">
                <Text size="sm">Selected Hours:</Text>
                <Text size="sm" fw={600}>{selectedSlots.length} hours</Text>
              </Group>
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
            size="sm"
          />

          {/* Auto Approve */}
          <Checkbox
            label="Auto-approve this booking"
            checked={formData.autoApprove}
            onChange={(e) =>
              setFormData({ ...formData, autoApprove: e.currentTarget.checked })
            }
            size="sm"
            styles={{
              label: {
                marginLeft: 8,
                '@media (max-width: 600px)': {
                  display: 'block',
                  marginLeft: 0,
                  marginTop: 4,
                },
              },
            }}
          />

          {/* Actions */}
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={loading} 
              disabled={selectedSlots.length === 0}
              size="sm"
            >
              Create Booking
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}