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
  Tabs,
  Grid,
  ActionIcon,
  Checkbox,
  Loader,
  SimpleGrid,
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
  IconClock,
  IconTrash,
  IconInfoCircle,
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
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  slots: Array<{
    id: string;
    slot_hour: number;
    is_night_rate: boolean;
  }>;
}

interface SlotData {
  hour: number;
  isNightRate: boolean;
  rate: number;
}

interface Settings {
  day_rate: number;
  night_rate: number;
  night_rate_start_hour: number;
  night_rate_end_hour: number;
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
  
  // Slot editing state
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [originalSlots, setOriginalSlots] = useState<number[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [slotsModified, setSlotsModified] = useState(false);

  useEffect(() => {
    if (opened && bookingId) {
      fetchSettings();
      fetchBookingData();
    }
  }, [opened, bookingId]);

  useEffect(() => {
    if (bookingDate && settings) {
      checkAvailableSlots();
    }
  }, [bookingDate, settings]);

  useEffect(() => {
    if (bookingData && settings && slots.length === 0) {
      initializeSlots(bookingData.slots);
    }
  }, [settings, bookingData]);

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

      // Check if booking is completed - should not be editable
      if (data.status === 'completed') {
        notifications.show({
          title: '🔒 Cannot Edit Completed Booking',
          message: 'Completed bookings cannot be edited. Please create a new booking instead.',
          color: 'orange',
          icon: <IconAlertCircle size={18} />,
          autoClose: 5000,
        });
        onClose();
        return;
      }

      setBookingData(data);
      setCustomerName(data.customer.name);
      setCustomerPhone(data.customer.phone || '');
      setBookingDate(new Date(data.booking_date));
      setTotalAmount(data.total_amount);
      setAdvancePayment(data.advance_payment);
      setPaymentMethod(data.advance_payment_method);
      
      // Initialize slots
      const originalSlotHours = data.slots.map((s: any) => s.slot_hour);
      setOriginalSlots(originalSlotHours);
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

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const result = await response.json();
      
      if (result.success && result.settings) {
        setSettings(result.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const initializeSlots = (bookingSlots: any[]) => {
    if (!settings) return;
    
    const initialSlots: SlotData[] = bookingSlots.map((s: any) => ({
      hour: s.slot_hour,
      isNightRate: s.is_night_rate,
      rate: s.is_night_rate ? settings.night_rate : settings.day_rate,
    }));
    setSlots(initialSlots);
  };

  const checkAvailableSlots = async () => {
    if (!bookingDate) return;
    
    try {
      setCheckingSlots(true);
      const dateStr = bookingDate.toISOString().split('T')[0];
      
      const response = await fetch(
        `/api/admin/bookings/check-slots?date=${dateStr}&excludeBookingId=${bookingId}`
      );
      const result = await response.json();
      
      if (result.success) {
        setAvailableSlots(result.availableSlots || []);
      }
    } catch (error) {
      console.error('Error checking slots:', error);
    } finally {
      setCheckingSlots(false);
    }
  };

  const isNightHour = (hour: number): boolean => {
    if (!settings) return false;
    
    const { night_rate_start_hour, night_rate_end_hour } = settings;
    
    if (night_rate_start_hour > night_rate_end_hour) {
      return hour >= night_rate_start_hour || hour <= night_rate_end_hour;
    }
    
    return hour >= night_rate_start_hour && hour <= night_rate_end_hour;
  };

  const validateConsecutiveSlots = (slotHours: number[]): boolean => {
    if (slotHours.length <= 1) return true;
    
    const sorted = [...slotHours].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] !== 1) {
        return false;
      }
    }
    return true;
  };

  const clearAllSlots = () => {
    setSlots([]);
    setSlotsModified(true);
  };

  const toggleSlot = (hour: number) => {
    if (!settings) return;
    
    // Check if slot is already selected
    const existingSlot = slots.find(s => s.hour === hour);
    
    if (existingSlot) {
      // Remove slot
      const newSlots = slots.filter(s => s.hour !== hour);
      
      // Check if removing this slot breaks consecutiveness
      if (newSlots.length > 0) {
        const newSlotHours = newSlots.map(s => s.hour);
        if (!validateConsecutiveSlots(newSlotHours)) {
          notifications.show({
            title: '⚠️ Cannot Remove Middle Slot',
            message: 'Removing this slot would break the consecutive selection. Please remove from the beginning or end, or use "Clear All Slots" to start fresh.',
            color: 'orange',
            autoClose: 5000,
            icon: <IconAlertCircle size={18} />,
          });
          return;
        }
      }
      
      setSlots(newSlots);
      setSlotsModified(true);
      return;
    }

    // Add new slot
    const isNight = isNightHour(hour);
    const newSlot: SlotData = {
      hour: hour,
      isNightRate: isNight,
      rate: isNight ? settings.night_rate : settings.day_rate,
    };

    const newSlots = [...slots, newSlot].sort((a, b) => a.hour - b.hour);
    const newSlotHours = newSlots.map(s => s.hour);
    
    // Validate consecutive slots
    if (!validateConsecutiveSlots(newSlotHours)) {
      notifications.show({
        title: '⚠️ Select Consecutive Slots Only',
        message: 'You must select continuous time slots (e.g., 4 PM, 5 PM, 6 PM). Use "Clear All Slots" to start a new selection range.',
        color: 'orange',
        autoClose: 5000,
        icon: <IconAlertCircle size={18} />,
      });
      return;
    }

    setSlots(newSlots);
    setSlotsModified(true);
  };

  const removeSlot = (hour: number) => {
    setSlots(slots.filter(s => s.hour !== hour));
    setSlotsModified(true);
  };

  const calculateTotal = () => {
    if (slotsModified && slots.length > 0) {
      return slots.reduce((sum, slot) => sum + slot.rate, 0);
    }
    return totalAmount || 0;
  };

  const formatTimeRange = (hour: number) => {
    const startHour = hour;
    const endHour = hour + 1;
    
    const formatHour = (h: number) => {
      if (h === 0) return '12AM';
      if (h < 12) return `${h}AM`;
      if (h === 12) return '12PM';
      return `${h - 12}PM`;
    };
    
    return `${formatHour(startHour)} - ${formatHour(endHour)}`;
  };

  const handleSubmit = async () => {
    if (!bookingData || !bookingDate) return;

    // Validate slots if modified
    if (slotsModified) {
      if (slots.length === 0) {
        notifications.show({
          title: '⚠️ No Slots Selected',
          message: 'Please select at least one time slot for the booking.',
          color: 'orange',
          icon: <IconAlertCircle size={18} />,
        });
        return;
      }

      const slotHours = slots.map(s => s.hour);
      if (!validateConsecutiveSlots(slotHours)) {
        notifications.show({
          title: '⚠️ Invalid Slot Selection',
          message: 'Selected slots must be consecutive. Please fix your selection.',
          color: 'red',
          icon: <IconAlertCircle size={18} />,
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      // Upload new payment proofs if provided
      let advanceProofUrl = bookingData.advance_payment_proof;
      let remainingProofUrl = bookingData.remaining_payment_proof;

      if (newAdvanceProof) {
        const validation = validatePaymentProofFile(newAdvanceProof);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid payment proof file');
        }

        const dateStr = bookingDate.toISOString().split('T')[0];
        const timestamp = Date.now();
        const fileExt = newAdvanceProof.name.split('.').pop();
        const filePath = `${dateStr}/${bookingId}-advance-${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, newAdvanceProof, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error('Failed to upload advance payment proof');
        }

        advanceProofUrl = `payment-proofs/${filePath}`;
      }

      if (newRemainingProof) {
        const validation = validatePaymentProofFile(newRemainingProof);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid payment proof file');
        }

        const dateStr = bookingDate.toISOString().split('T')[0];
        const timestamp = Date.now();
        const fileExt = newRemainingProof.name.split('.').pop();
        const filePath = `${dateStr}/${bookingId}-remaining-${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, newRemainingProof, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error('Failed to upload remaining payment proof');
        }

        remainingProofUrl = `payment-proofs/${filePath}`;
      }

      // Calculate amounts - ensure never null
      let finalTotalAmount: number;
      let finalTotalHours: number;
      
      if (slotsModified && slots.length > 0) {
        // Calculate from new slots
        finalTotalAmount = slots.reduce((sum, slot) => sum + slot.rate, 0);
        finalTotalHours = slots.length;
        
        // Debug logging
        console.log('Calculating from new slots:', {
          slots,
          finalTotalAmount,
          finalTotalHours
        });
      } else {
        // Use existing values from database
        finalTotalAmount = bookingData.total_amount;
        finalTotalHours = bookingData.total_hours;
        
        console.log('Using existing values:', {
          finalTotalAmount,
          finalTotalHours
        });
      }
      
      const remainingPayment = Math.max(0, finalTotalAmount - advancePayment);

      // Validate amounts
      if (!finalTotalAmount || finalTotalAmount <= 0) {
        console.error('Validation failed:', {
          finalTotalAmount,
          slots,
          settings,
          slotsModified
        });
        throw new Error(`Total amount must be greater than zero. Amount calculated: ${finalTotalAmount}`);
      }
      
      if (!finalTotalHours || finalTotalHours <= 0) {
        throw new Error('Total hours must be greater than zero');
      }

      // Update booking
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          booking_date: bookingDate.toISOString().split('T')[0],
          total_amount: finalTotalAmount,
          total_hours: finalTotalHours,
          advance_payment: advancePayment,
          remaining_payment: remainingPayment,
          advance_payment_method: paymentMethod,
          advance_payment_proof: advanceProofUrl,
          remaining_payment_proof: remainingProofUrl,
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      // Update slots if modified
      if (slotsModified && slots.length > 0) {
        // Delete old slots
        const { error: deleteError } = await supabase
          .from('booking_slots')
          .delete()
          .eq('booking_id', bookingId);

        if (deleteError) throw deleteError;

        // Insert new slots
        const bookingDateStr = bookingDate.toISOString().split('T')[0];
        const slotsToInsert = slots.map(slot => ({
          booking_id: bookingId,
          slot_date: bookingDateStr,
          slot_hour: slot.hour,
          is_night_rate: slot.isNightRate,
        }));

        const { error: insertError } = await supabase
          .from('booking_slots')
          .insert(slotsToInsert);

        if (insertError) throw insertError;
      }

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
      size="xl"
      centered
      zIndex={300}
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
            Update booking details. You can now change time slots and booking date.
          </Alert>

          <Tabs defaultValue="details">
            <Tabs.List>
              <Tabs.Tab value="details">Booking Details</Tabs.Tab>
              <Tabs.Tab value="slots" leftSection={<IconClock size={16} />}>
                Time Slots
              </Tabs.Tab>
              <Tabs.Tab value="payment">Payment</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="details" pt="md">
              <Stack gap="md">
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

                {/* Booking Date */}
                <Divider label="Booking Date" />

                <DatePickerInput
                  label="Booking Date"
                  placeholder="Select date"
                  leftSection={<IconCalendar size={16} />}
                  value={bookingDate}
                  onChange={(date) => {
                    const previousDate = bookingDate ? new Date(bookingDate).toISOString().split('T')[0] : null;
                    const newDate = date ? new Date(date).toISOString().split('T')[0] : null;
                    
                    setBookingDate(date);
                    
                    // If date actually changed (not just same date selected), clear slots and require new selection
                    if (date && previousDate !== newDate) {
                      setSlots([]);
                      setSlotsModified(true); // Force user to select new slots for new date
                      
                      notifications.show({
                        title: '📅 Date Changed',
                        message: 'Please select time slots for the new date.',
                        color: 'blue',
                        icon: <IconInfoCircle size={18} />,
                      });
                    }
                  }}
                  required
                  minDate={new Date()}
                />

                <Text size="sm" c="dimmed">
                  Current Hours: <strong>{bookingData.total_hours}</strong>
                  {slotsModified && slots.length > 0 && (
                    <span> → New Hours: <strong>{slots.length}</strong></span>
                  )}
                </Text>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="slots" pt="md">
              <Stack gap="md">
                <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
                  Change booking time slots. Current slots will be replaced if you modify them.
                </Alert>

                {/* Current Slots */}
                <Paper withBorder p="md">
                  <Text fw={600} mb="sm">Current Time Slots</Text>
                  {bookingData.slots.length > 0 ? (
                    <Group gap="xs">
                      {bookingData.slots.map((slot) => (
                        <Badge
                          key={slot.id}
                          size="lg"
                          color={slot.is_night_rate ? 'indigo' : 'yellow'}
                        >
                          {formatTimeRange(slot.slot_hour)}
                          {slot.is_night_rate && ' 🌙'}
                        </Badge>
                      ))}
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed">No slots</Text>
                  )}
                </Paper>

                {/* Slot Selection */}
                <Paper withBorder p="md">
                  <Group justify="space-between" mb="sm">
                    <Text fw={600}>Select New Time Slots</Text>
                    {slots.length > 0 && (
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        leftSection={<IconX size={14} />}
                        onClick={clearAllSlots}
                      >
                        Clear All Slots
                      </Button>
                    )}
                  </Group>
                  
                  {checkingSlots ? (
                    <Loader size="sm" />
                  ) : (
                    <>
                      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" mb="md">
                        💡 <strong>Tip:</strong> Select consecutive time slots. Use "Clear All Slots" to start a new selection range.
                      </Alert>
                      
                      <SimpleGrid cols={{ base: 3, sm: 4, md: 6 }} spacing="xs">
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                          // Check if slot is in the past for current date
                          const now = new Date();
                          const isToday = bookingDate && 
                            bookingDate.toDateString() === now.toDateString();
                          const isPastSlot = isToday && hour < now.getHours();
                          
                          const isAvailable = (availableSlots.includes(hour) || originalSlots.includes(hour)) && !isPastSlot;
                          const isSelected = slots.some(s => s.hour === hour);
                          const isNight = isNightHour(hour);
                          const isBooked = !isAvailable && !originalSlots.includes(hour) && !isPastSlot;
                          
                          return (
                            <Button
                              key={hour}
                              variant={isSelected ? 'filled' : 'outline'}
                              color={isNight ? 'indigo' : 'yellow'}
                              size="xs"
                              disabled={!isAvailable}
                              onClick={() => toggleSlot(hour)}
                              styles={{
                                root: {
                                  opacity: isAvailable ? 1 : 0.3,
                                  fontWeight: isSelected ? 700 : 400,
                                  position: 'relative',
                                },
                              }}
                            >
                              {formatTimeRange(hour).split(' - ')[0]}
                              {isNight && ' 🌙'}
                              {isPastSlot && (
                                <Badge
                                  size="xs"
                                  color="gray"
                                  style={{
                                    position: 'absolute',
                                    top: -5,
                                    right: -5,
                                    fontSize: 8,
                                  }}
                                >
                                  PAST
                                </Badge>
                              )}
                              {isBooked && !isPastSlot && (
                                <Badge
                                  size="xs"
                                  color="red"
                                  style={{
                                    position: 'absolute',
                                    top: -5,
                                    right: -5,
                                    fontSize: 8,
                                  }}
                                >
                                  ⚠️
                                </Badge>
                              )}
                            </Button>
                          );
                        })}
                      </SimpleGrid>
                      
                      {settings && (
                        <Text size="xs" c="dimmed" mt="md">
                          💰 Day Rate: Rs {settings.day_rate} | 🌙 Night Rate: Rs {settings.night_rate}
                        </Text>
                      )}
                    </>
                  )}
                </Paper>

                {/* Selected Slots */}
                {slots.length > 0 && (
                  <Paper withBorder p="md">
                    <Text fw={600} mb="sm">New Selected Slots</Text>
                    <Stack gap="xs">
                      {slots.map((slot) => (
                        <Group key={slot.hour} justify="space-between">
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
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => removeSlot(slot.hour)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      ))}
                      <Divider />
                      <Group justify="space-between">
                        <Text fw={600}>New Total:</Text>
                        <Text fw={600} size="lg">Rs {calculateTotal()}</Text>
                      </Group>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="payment" pt="md">
              <Stack gap="md">
                {/* Payment Details */}
                <Divider label="Payment Details" />

                <NumberInput
                  label="Total Amount (PKR)"
                  placeholder="Total amount"
                  leftSection={<IconCurrencyRupee size={16} />}
                  value={calculateTotal()}
                  readOnly={slotsModified}
                  onChange={(val) => !slotsModified && setTotalAmount(Number(val))}
                  min={0}
                  required
                  description={slotsModified ? 'Calculated from selected slots' : 'Manual amount'}
                />

                <NumberInput
                  label="Advance Payment (PKR)"
                  placeholder="Enter advance payment"
                  leftSection={<IconCurrencyRupee size={16} />}
                  value={advancePayment}
                  onChange={(val) => setAdvancePayment(Number(val))}
                  min={0}
                  max={calculateTotal()}
                  required
                />

                <Text size="sm" c="dimmed">
                  Remaining Payment: <strong>PKR {(calculateTotal() - advancePayment).toLocaleString()}</strong>
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
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${bookingData.advance_payment_proof}`}
                      alt="Current advance proof"
                      radius="md"
                      h={150}
                      fit="contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        console.error('Failed to load payment proof:', bookingData.advance_payment_proof);
                      }}
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
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${bookingData.remaining_payment_proof}`}
                        alt="Current remaining proof"
                        radius="md"
                        h={150}
                        fit="contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          console.error('Failed to load remaining payment proof:', bookingData.remaining_payment_proof);
                        }}
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
              </Stack>
            </Tabs.Panel>
          </Tabs>

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
