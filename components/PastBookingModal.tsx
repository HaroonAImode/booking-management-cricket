/**
 * PastBookingModal Component
 *
 * Allows admin to record a booking for a past date (e.g., when internet was unavailable).
 * Admin can:
 *  - Browse past unbooked slots by date
 *  - Select one or more consecutive slots on a date
 *  - Enter all payment details at once (discount, extra charges, amount received)
 *  - Booking is created as 'completed' when fully paid, or 'approved' when partially paid
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
  Grid,
  Badge,
  Paper,
  Text,
  Alert,
  ActionIcon,
  Divider,
  Box,
  Loader,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconPlus,
  IconTrash,
  IconHistory,
  IconCurrencyRupee,
  IconDiscount,
  IconInfoCircle,
  IconCheck,
} from '@tabler/icons-react';

interface PastBookingModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SlotWithDate {
  date: string;
  hour: number;
}

interface SlotStatus {
  hour: number;
  isBooked: boolean;
  isNight: boolean;
  rate: number;
}

interface ExtraCharge {
  category: string;
  amount: number;
}

const DAY_RATE = 1500;
const NIGHT_RATE = 2000;

function isNightHour(hour: number): boolean {
  return hour >= 17 || hour <= 6;
}

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${ampm}`;
}

export default function PastBookingModal({
  opened,
  onClose,
  onSuccess,
}: PastBookingModalProps) {
  const [loading, setLoading] = useState(false);

  // Yesterday by default (most recent past day)
  const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const [viewingDate, setViewingDate] = useState<Date>(getYesterday);

  // Slot data
  const [slotStatuses, setSlotStatuses] = useState<SlotStatus[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Selected slots (can be on multiple dates via date navigation)
  const [selectedSlots, setSelectedSlots] = useState<SlotWithDate[]>([]);

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Payment
  const [amountReceived, setAmountReceived] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [notes, setNotes] = useState('');

  // Reset everything when modal opens
  useEffect(() => {
    if (opened) {
      setViewingDate(getYesterday());
      setSelectedSlots([]);
      setCustomerName('');
      setCustomerPhone('');
      setAmountReceived(0);
      setPaymentMethod('cash');
      setDiscountAmount(0);
      setDiscountReason('');
      setExtraCharges([]);
      setNotes('');
    }
  }, [opened]);

  // Fetch slot availability whenever viewingDate changes
  useEffect(() => {
    if (!viewingDate) return;
    setSlotsLoading(true);
    setSlotsError(null);

    const dateStr = viewingDate.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Karachi',
    });

    fetch(`/api/admin/bookings/check-slots?date=${dateStr}`)
      .then((res) => res.json())
      .then((data) => {
        const bookedHours: number[] = data.bookedSlots || [];
        const statuses: SlotStatus[] = Array.from({ length: 24 }, (_, hour) => ({
          hour,
          isBooked: bookedHours.includes(hour),
          isNight: isNightHour(hour),
          rate: isNightHour(hour) ? NIGHT_RATE : DAY_RATE,
        }));
        setSlotStatuses(statuses);
        setSlotsLoading(false);
      })
      .catch(() => {
        setSlotsError('Failed to load slot data. Please try again.');
        setSlotsLoading(false);
      });
  }, [viewingDate]);

  // ─── Date Navigation ───────────────────────────────────────────────────────
  const todayMidnight = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const handlePrevDay = () => {
    const d = new Date(viewingDate);
    d.setDate(d.getDate() - 1);
    setViewingDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(viewingDate);
    d.setDate(d.getDate() + 1);
    // Can navigate up to yesterday only
    if (d < todayMidnight) {
      setViewingDate(d);
    }
  };

  const isViewingYesterday =
    new Date(viewingDate.getTime() + 86400000).toDateString() ===
    todayMidnight.toDateString();

  // ─── Slot Selection ────────────────────────────────────────────────────────
  const currentDateStr = viewingDate.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Karachi',
  });

  const handleSlotToggle = (hour: number) => {
    const slot = slotStatuses.find((s) => s.hour === hour);
    if (!slot || slot.isBooked) return;

    const existingIdx = selectedSlots.findIndex(
      (s) => s.date === currentDateStr && s.hour === hour
    );

    if (existingIdx >= 0) {
      setSelectedSlots((prev) => prev.filter((_, i) => i !== existingIdx));
    } else {
      setSelectedSlots((prev) => [...prev, { date: currentDateStr, hour }]);
    }
  };

  // Group selected slots by date
  const selectedByDate = selectedSlots.reduce<Record<string, SlotWithDate[]>>(
    (acc, s) => {
      if (!acc[s.date]) acc[s.date] = [];
      acc[s.date].push(s);
      return acc;
    },
    {}
  );

  // ─── Calculations ──────────────────────────────────────────────────────────
  const subtotal = selectedSlots.reduce(
    (sum, s) => sum + (isNightHour(s.hour) ? NIGHT_RATE : DAY_RATE),
    0
  );
  const totalExtraCharges = extraCharges.reduce(
    (sum, ec) => sum + (ec.amount || 0),
    0
  );
  const finalTotal = Math.max(0, subtotal - discountAmount + totalExtraCharges);
  const balance = finalTotal - amountReceived;

  // Auto-update amount received whenever finalTotal changes
  useEffect(() => {
    setAmountReceived(finalTotal);
  }, [finalTotal]);

  // ─── Extra Charges Helpers ─────────────────────────────────────────────────
  const addExtraCharge = () =>
    setExtraCharges((prev) => [...prev, { category: 'other', amount: 0 }]);

  const removeExtraCharge = (idx: number) =>
    setExtraCharges((prev) => prev.filter((_, i) => i !== idx));

  const updateExtraCharge = (
    idx: number,
    field: keyof ExtraCharge,
    value: string | number
  ) =>
    setExtraCharges((prev) =>
      prev.map((ec, i) => (i === idx ? { ...ec, [field]: value } : ec))
    );

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      notifications.show({
        title: 'Missing Info',
        message: 'Customer name and phone number are required.',
        color: 'red',
      });
      return;
    }

    if (selectedSlots.length === 0) {
      notifications.show({
        title: 'No Slots',
        message: 'Please select at least one time slot.',
        color: 'red',
      });
      return;
    }

    // Validate consecutive slots per date
    for (const [date, slots] of Object.entries(selectedByDate)) {
      const sorted = [...slots].sort((a, b) => a.hour - b.hour);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1].hour;
        const curr = sorted[i].hour;
        // Allow consecutive OR midnight crossing (23 → 0)
        if (curr !== prev + 1 && !(prev === 23 && curr === 0)) {
          const displayDate = new Date(date + 'T00:00:00').toLocaleDateString(
            'en-US',
            { month: 'short', day: 'numeric', timeZone: 'Asia/Karachi' }
          );
          notifications.show({
            title: 'Non-Consecutive Slots',
            message: `Slots on ${displayDate} must be consecutive. Please select continuous hours.`,
            color: 'yellow',
          });
          return;
        }
      }
    }

    if (discountAmount > subtotal) {
      notifications.show({
        title: 'Invalid Discount',
        message: 'Discount cannot exceed the slot subtotal.',
        color: 'red',
      });
      return;
    }

    if (amountReceived < 0) {
      notifications.show({
        title: 'Invalid Amount',
        message: 'Amount received cannot be negative.',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);

      const allDates = Object.keys(selectedByDate).sort();
      const firstDate = allDates[0];

      const slotsPayload = selectedSlots.map((s) => ({
        slotDate: s.date,
        slotTime: `${String(s.hour).padStart(2, '0')}:00:00`,
        slotHour: s.hour,
        hourlyRate: isNightHour(s.hour) ? NIGHT_RATE : DAY_RATE,
        isNightRate: isNightHour(s.hour),
        is_night_rate: isNightHour(s.hour),
        hour: s.hour,
        rate: isNightHour(s.hour) ? NIGHT_RATE : DAY_RATE,
      }));

      const validExtras = extraCharges.filter((ec) => ec.amount > 0);

      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          bookingDate: firstDate,
          slots: slotsPayload,
          totalHours: selectedSlots.length,
          totalAmount: finalTotal,
          advancePayment: amountReceived,
          advancePaymentMethod: paymentMethod,
          adminNotes: notes.trim() || null,
          autoApprove: true,
          // Past-booking-specific fields
          discount_amount: discountAmount > 0 ? discountAmount : null,
          discount_reason: discountReason.trim() || null,
          extra_charges: validExtras,
          mark_completed: balance <= 0,
          is_past_booking: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        notifications.show({
          title: 'Past Booking Created',
          message: `Booking ${result.bookingNumber} recorded successfully.`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        onClose();
        onSuccess();
      } else {
        notifications.show({
          title: 'Error',
          message: result.error || 'Failed to create booking.',
          color: 'red',
        });
      }
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err.message || 'Something went wrong.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const daySlots = slotStatuses.filter((s) => !s.isNight); // 7–16
  const nightSlots = slotStatuses.filter((s) => s.isNight); // 17-23, 0-6

  const renderSlotButton = (s: SlotStatus) => {
    const isSelected = selectedSlots.some(
      (sel) => sel.date === currentDateStr && sel.hour === s.hour
    );

    let bg = s.isBooked
      ? '#f1f3f5'
      : isSelected
      ? s.isNight
        ? '#5c5f66'
        : '#228be6'
      : s.isNight
      ? '#fff9db'
      : '#e7f5ff';

    let border = s.isBooked
      ? '#ced4da'
      : isSelected
      ? s.isNight
        ? '#343a40'
        : '#1c7ed6'
      : s.isNight
      ? '#fcc419'
      : '#74c0fc';

    let textColor = s.isBooked
      ? 'dimmed'
      : isSelected
      ? 'white'
      : s.isNight
      ? 'yellow.8'
      : 'blue.7';

    return (
      <Grid.Col span={{ base: 6, xs: 4, sm: 3 }} key={s.hour}>
        <Paper
          withBorder
          p="xs"
          style={{
            cursor: s.isBooked ? 'not-allowed' : 'pointer',
            background: bg,
            borderColor: border,
            opacity: s.isBooked ? 0.6 : 1,
            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            userSelect: 'none',
          }}
          onClick={() => handleSlotToggle(s.hour)}
        >
          <Stack gap={2} align="center">
            <Text
              size="xs"
              fw={700}
              c={s.isBooked ? 'dimmed' : isSelected ? 'white' : 'dark'}
            >
              {String(s.hour).padStart(2, '0')}:00
            </Text>
            <Text size="xs" c={textColor} style={{ fontSize: '0.65rem' }}>
              {s.isBooked
                ? 'Booked'
                : `Rs ${s.rate.toLocaleString()}`}
            </Text>
            {s.isNight && !s.isBooked && (
              <Text size="xs" style={{ fontSize: '0.6rem', lineHeight: 1 }}>
                🌙
              </Text>
            )}
          </Stack>
        </Paper>
      </Grid.Col>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon color="indigo" variant="light" size="md">
            <IconHistory size={16} />
          </ThemeIcon>
          <Text fw={700} size="md">
            Add Past Booking
          </Text>
        </Group>
      }
      size="xl"
      zIndex={300}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Info banner */}
          <Alert
            color="indigo"
            variant="light"
            icon={<IconInfoCircle size={16} />}
          >
            Record a booking for a past date — useful when internet was
            unavailable at the time. All payment details are entered at once.
          </Alert>

          {/* ── Date Selector ── */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Text fw={600} size="sm" mb="sm">
              Select Past Date
            </Text>
            <Group justify="space-between" align="center">
              <Button
                variant="light"
                size="xs"
                leftSection={<IconChevronLeft size={14} />}
                onClick={handlePrevDay}
              >
                Prev Day
              </Button>

              <Group gap={6} align="center">
                <IconCalendar size={16} color="#5c7cfa" />
                <Text size="sm" fw={600}>
                  {viewingDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'Asia/Karachi',
                  })}
                </Text>
              </Group>

              <Button
                variant="light"
                size="xs"
                rightSection={<IconChevronRight size={14} />}
                onClick={handleNextDay}
                disabled={isViewingYesterday}
              >
                Next Day
              </Button>
            </Group>
          </Paper>

          {/* ── Slot Grid ── */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text fw={600} size="sm">
                  Available Slots
                </Text>
                {selectedSlots.filter((s) => s.date === currentDateStr).length >
                  0 && (
                  <Badge color="indigo" variant="filled" size="sm">
                    {
                      selectedSlots.filter((s) => s.date === currentDateStr)
                        .length
                    }{' '}
                    selected on this date
                  </Badge>
                )}
              </Group>

              {/* Legend */}
              <Group gap="md" wrap="wrap">
                {[
                  { color: '#228be6', label: 'Day – Selected' },
                  { color: '#5c5f66', label: 'Night – Selected' },
                  { color: '#e7f5ff', border: '#74c0fc', label: 'Day Available' },
                  { color: '#fff9db', border: '#fcc419', label: 'Night Available' },
                  { color: '#f1f3f5', border: '#ced4da', label: 'Already Booked' },
                ].map((item) => (
                  <Group gap={4} key={item.label}>
                    <Box
                      w={12}
                      h={12}
                      style={{
                        background: item.color,
                        border: `1px solid ${item.border || item.color}`,
                        borderRadius: 3,
                        flexShrink: 0,
                      }}
                    />
                    <Text size="xs" c="dimmed">
                      {item.label}
                    </Text>
                  </Group>
                ))}
              </Group>

              {slotsLoading ? (
                <Group justify="center" py="md">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">
                    Loading slots…
                  </Text>
                </Group>
              ) : slotsError ? (
                <Alert color="red">{slotsError}</Alert>
              ) : (
                <>
                  <Text size="xs" fw={600} c="yellow.8">
                    🌙 Night Slots (5 PM – 6 AM) — Rs {NIGHT_RATE.toLocaleString()}/hr
                  </Text>
                  <Grid gutter={6}>
                    {slotStatuses
                      .filter((s) => s.isNight)
                      .sort((a, b) => {
                        // Sort: 17-23 first, then 0-6
                        const normalize = (h: number) => (h < 7 ? h + 24 : h);
                        return normalize(a.hour) - normalize(b.hour);
                      })
                      .map(renderSlotButton)}
                  </Grid>

                  <Text size="xs" fw={600} c="blue.7" mt="xs">
                    ☀️ Day Slots (7 AM – 4 PM) — Rs {DAY_RATE.toLocaleString()}/hr
                  </Text>
                  <Grid gutter={6}>
                    {slotStatuses
                      .filter((s) => !s.isNight)
                      .sort((a, b) => a.hour - b.hour)
                      .map(renderSlotButton)}
                  </Grid>
                </>
              )}

              {/* Selected Slots Summary */}
              {selectedSlots.length > 0 && (
                <Paper withBorder p="sm" bg="indigo.0">
                  <Text size="xs" fw={600} c="indigo" mb="xs">
                    All Selected Slots ({selectedSlots.length} total):
                  </Text>
                  <Stack gap={6}>
                    {Object.entries(selectedByDate)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, slots]) => (
                        <Group key={date} gap="xs" wrap="wrap">
                          <Text
                            size="xs"
                            fw={600}
                            c="indigo.7"
                            style={{ minWidth: 85 }}
                          >
                            {new Date(
                              date + 'T00:00:00'
                            ).toLocaleDateString('en-US', {
                              timeZone: 'Asia/Karachi',
                              month: 'short',
                              day: 'numeric',
                            })}
                            :
                          </Text>
                          {slots
                            .sort((a, b) => a.hour - b.hour)
                            .map((s) => (
                              <Badge
                                key={`${s.date}-${s.hour}`}
                                size="sm"
                                color={isNightHour(s.hour) ? 'yellow' : 'blue'}
                                variant="filled"
                              >
                                {String(s.hour).padStart(2, '0')}:00
                                {isNightHour(s.hour) ? ' 🌙' : ''}
                              </Badge>
                            ))}
                        </Group>
                      ))}
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Paper>

          {/* ── Customer Info ── */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Text fw={600} size="sm" mb="sm">
              Customer Information
            </Text>
            <Grid gutter={{ base: 'xs', sm: 'md' }}>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Customer Name"
                  placeholder="Enter full name"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  size="sm"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Phone Number"
                  placeholder="03001234567"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  size="sm"
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {/* ── Payment Details ── */}
          <Paper withBorder p={{ base: 'xs', sm: 'md' }}>
            <Text fw={600} size="sm" mb="sm">
              Payment Details
            </Text>
            <Stack gap="sm">
              {/* Slot charges breakdown */}
              <Paper withBorder p="sm" bg="gray.0">
                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Slot Charges ({selectedSlots.length} h):
                    </Text>
                    <Text size="sm" fw={700}>
                      Rs {subtotal.toLocaleString()}
                    </Text>
                  </Group>
                  {selectedSlots.length > 0 && (
                    <Group gap="xs" wrap="wrap">
                      {(() => {
                        const dayCount = selectedSlots.filter(
                          (s) => !isNightHour(s.hour)
                        ).length;
                        const nightCount = selectedSlots.filter((s) =>
                          isNightHour(s.hour)
                        ).length;
                        return (
                          <>
                            {dayCount > 0 && (
                              <Badge size="xs" color="blue" variant="light">
                                ☀️ {dayCount}h × Rs{' '}
                                {DAY_RATE.toLocaleString()} (Day)
                              </Badge>
                            )}
                            {nightCount > 0 && (
                              <Badge size="xs" color="yellow" variant="light">
                                🌙 {nightCount}h × Rs{' '}
                                {NIGHT_RATE.toLocaleString()} (Night)
                              </Badge>
                            )}
                          </>
                        );
                      })()}
                    </Group>
                  )}
                </Stack>
              </Paper>

              {/* Discount */}
              <Grid gutter={{ base: 'xs', sm: 'sm' }}>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <NumberInput
                    label="Discount Amount (Optional)"
                    placeholder="0"
                    min={0}
                    max={subtotal}
                    value={discountAmount}
                    onChange={(v) => setDiscountAmount(Number(v) || 0)}
                    leftSection={<IconDiscount size={14} />}
                    size="sm"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Discount Reason (Optional)"
                    placeholder="e.g. Regular customer"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    size="sm"
                  />
                </Grid.Col>
              </Grid>

              {/* Extra Charges */}
              <Box>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>
                    Extra Charges (Optional)
                  </Text>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlus size={12} />}
                    onClick={addExtraCharge}
                  >
                    Add Charge
                  </Button>
                </Group>
                <Stack gap={6}>
                  {extraCharges.map((ec, idx) => (
                    <Grid gutter="xs" key={idx} align="center">
                      <Grid.Col span={{ base: 5, sm: 5 }}>
                        <Select
                          placeholder="Category"
                          data={[
                            { value: 'mineral water', label: 'Mineral Water' },
                            { value: 'ball', label: 'Ball' },
                            { value: 'tape', label: 'Tape' },
                            { value: 'other', label: 'Other' },
                          ]}
                          value={ec.category}
                          onChange={(v) =>
                            updateExtraCharge(idx, 'category', v || 'other')
                          }
                          size="xs"
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 5, sm: 5 }}>
                        <NumberInput
                          placeholder="Amount (Rs)"
                          min={0}
                          value={ec.amount}
                          onChange={(v) =>
                            updateExtraCharge(idx, 'amount', Number(v) || 0)
                          }
                          size="xs"
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 2, sm: 2 }}>
                        <ActionIcon
                          color="red"
                          variant="light"
                          size="sm"
                          onClick={() => removeExtraCharge(idx)}
                        >
                          <IconTrash size={12} />
                        </ActionIcon>
                      </Grid.Col>
                    </Grid>
                  ))}
                </Stack>
              </Box>

              <Divider />

              {/* Total Summary */}
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Slot Subtotal:
                  </Text>
                  <Text size="sm">Rs {subtotal.toLocaleString()}</Text>
                </Group>
                {discountAmount > 0 && (
                  <Group justify="space-between">
                    <Text size="sm" c="green.7">
                      Discount
                      {discountReason ? ` (${discountReason})` : ''}:
                    </Text>
                    <Text size="sm" c="green.7" fw={500}>
                      − Rs {discountAmount.toLocaleString()}
                    </Text>
                  </Group>
                )}
                {totalExtraCharges > 0 && (
                  <Group justify="space-between">
                    <Text size="sm" c="orange.7">
                      Extra Charges:
                    </Text>
                    <Text size="sm" c="orange.7" fw={500}>
                      + Rs {totalExtraCharges.toLocaleString()}
                    </Text>
                  </Group>
                )}
                <Divider />
                <Group justify="space-between">
                  <Text size="sm" fw={700}>
                    Total Amount:
                  </Text>
                  <Text size="sm" fw={700}>
                    Rs {finalTotal.toLocaleString()}
                  </Text>
                </Group>
              </Stack>

              <Divider />

              {/* Amount Received */}
              <Grid gutter={{ base: 'xs', sm: 'sm' }}>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <NumberInput
                    label="Amount Received"
                    description="How much the customer paid"
                    placeholder="Enter amount received"
                    required
                    min={0}
                    max={finalTotal}
                    value={amountReceived}
                    onChange={(v) => setAmountReceived(Number(v) || 0)}
                    leftSection={<IconCurrencyRupee size={14} />}
                    size="sm"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label="Payment Method"
                    data={[
                      { value: 'cash', label: 'Cash' },
                      { value: 'easypaisa', label: 'Easypaisa' },
                      { value: 'sadapay', label: 'SadaPay' },
                    ]}
                    value={paymentMethod}
                    onChange={(v) => setPaymentMethod(v || 'cash')}
                    size="sm"
                  />
                </Grid.Col>
              </Grid>

              {/* Balance */}
              <Paper
                withBorder
                p="sm"
                bg={
                  balance === 0
                    ? 'green.0'
                    : balance > 0
                    ? 'orange.0'
                    : 'red.0'
                }
              >
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    {balance === 0
                      ? '✅ Fully Paid'
                      : balance > 0
                      ? '⏳ Balance Remaining'
                      : '⚠️ Overpaid'}
                    :
                  </Text>
                  <Text
                    size="sm"
                    fw={700}
                    c={
                      balance === 0 ? 'green' : balance > 0 ? 'orange' : 'red'
                    }
                  >
                    Rs {Math.abs(balance).toLocaleString()}
                    {balance === 0 ? ' (Complete)' : ''}
                  </Text>
                </Group>
                {balance <= 0 && (
                  <Text size="xs" c="green.7" mt={4}>
                    This booking will be marked as Completed.
                  </Text>
                )}
                {balance > 0 && (
                  <Text size="xs" c="orange.7" mt={4}>
                    Remaining Rs {balance.toLocaleString()} to be collected later. Booking will be Approved.
                  </Text>
                )}
              </Paper>
            </Stack>
          </Paper>

          {/* ── Notes ── */}
          <Textarea
            label="Notes (Optional)"
            placeholder="Any additional notes about this past booking…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            minRows={2}
            size="sm"
          />

          {/* ── Actions ── */}
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={selectedSlots.length === 0 || loading}
              leftSection={<IconHistory size={14} />}
              color="indigo"
              size="sm"
            >
              Create Past Booking
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
