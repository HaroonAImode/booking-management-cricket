'use client';

/**
 * Calendar First Booking Page
 * NEW FLOW: Calendar → Slot Selection → Customer Form
 * 
 * Step 1: Show calendar with availability
 * Step 2: Customer selects date and slots
 * Step 3: Show booking form after slot selection
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Stack,
  Title,
  Text,
  Button,
  Group,
  Badge,
  Box,
  Alert,
  SimpleGrid,
  Stepper,
} from '@mantine/core';
import { DatePickerInput, DatePicker } from '@mantine/dates';
import {
  IconCalendar,
  IconClock,
  IconUser,
  IconArrowRight,
  IconArrowLeft,
  IconInfoCircle,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import BookingForm from '@/components/BookingForm';
import SlotSelector from '@/components/SlotSelector';
import { getAvailableSlots, formatDateForSQL } from '@/lib/supabase/bookings';
import { SlotInfo } from '@/types';

export default function CalendarFirstBooking() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [availableSlots, setAvailableSlots] = useState<SlotInfo[] | null>(null);
  const [todaySlots, setTodaySlots] = useState<SlotInfo[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [quickViewDate, setQuickViewDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load today's slots on component mount and when quickViewDate changes
  useEffect(() => {
    loadTodaySlots();
  }, [quickViewDate]);

  const loadTodaySlots = async (viewDate?: Date) => {
    setTodayLoading(true);
    const dateToView = viewDate || quickViewDate;
    const today = new Date();
    const dateStr = formatDateForSQL(dateToView);
    const { data, error } = await getAvailableSlots(dateStr);

    if (!error) {
      // Generate all 24 slots with proper status
      const allSlots: SlotInfo[] = [];
      const currentHour = today.getHours();
      const isToday = dateToView.toDateString() === today.toDateString();

      for (let hour = 0; hour < 24; hour++) {
        const existingSlot = data?.find(s => s.slot_hour === hour);
        const isPast = isToday && hour <= currentHour;
        
        if (existingSlot) {
          allSlots.push({
            ...existingSlot,
            is_available: isPast ? false : existingSlot.is_available,
          });
        } else {
          // Create entry for missing hours
          const isNight = hour >= 17 || hour < 7;
          allSlots.push({
            slot_hour: hour,
            slot_time: `${hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}:00 ${hour < 12 ? 'AM' : 'PM'}`,
            is_available: !isPast,
            is_night_rate: isNight,
            hourly_rate: isNight ? 2000 : 1500,
            current_status: isPast ? 'cancelled' : 'available',
          } as SlotInfo);
        }
      }
      
      setTodaySlots(allSlots);
    }
    setTodayLoading(false);
  };

  // Load slots when date changes
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
      setSelectedSlots([]); // Reset selected slots when date changes
    } else {
      setAvailableSlots(null);
      setSelectedSlots([]);
    }
  }, [selectedDate]);

  const loadAvailableSlots = async () => {
    if (!selectedDate) return;

    setSlotsLoading(true);
    setSlotsError(null);

    const dateStr = formatDateForSQL(selectedDate);
    const { data, error } = await getAvailableSlots(dateStr);

    if (error) {
      setSlotsError(error);
      setAvailableSlots(null);
      notifications.show({
        title: '❌ Error Loading Slots',
        message: error,
        color: 'red',
        autoClose: 5000,
      });
    } else {
      setAvailableSlots(data);
    }

    setSlotsLoading(false);
  };

  const handleSlotToggle = (hour: number) => {
    setSelectedSlots((prev) => {
      // If deselecting, just remove it
      if (prev.includes(hour)) {
        return prev.filter((h) => h !== hour);
      }

      // If selecting, check if it's consecutive with existing selections
      const newSelection = [...prev, hour].sort((a, b) => a - b);
      
      // Check if all slots are consecutive
      if (newSelection.length > 1) {
        for (let i = 1; i < newSelection.length; i++) {
          if (newSelection[i] - newSelection[i - 1] !== 1) {
            // Not consecutive!
            notifications.show({
              title: '⚠️ Non-Consecutive Time Slots',
              message: 'Please select consecutive time slots only. For different time periods, create separate bookings.',
              color: 'orange',
              autoClose: 5000,
              icon: <IconInfoCircle size={18} />,
            });
            return prev; // Don't add the slot
          }
        }
      }

      return newSelection;
    });
  };

  const canProceedToForm = selectedDate && selectedSlots.length > 0;

  const validateConsecutiveSlots = (): boolean => {
    if (selectedSlots.length <= 1) return true;
    
    const sorted = [...selectedSlots].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] !== 1) {
        return false;
      }
    }
    return true;
  };

  const proceedToForm = () => {
    if (!canProceedToForm) return;

    // Final validation check
    if (!validateConsecutiveSlots()) {
      notifications.show({
        title: '⚠️ Invalid Time Selection',
        message: 'Your selected time slots are not consecutive. Please select continuous hours only (e.g., 4 PM, 5 PM, 6 PM).',
        color: 'red',
        autoClose: 6000,
        icon: <IconAlertCircle size={18} />,
      });
      return;
    }

    setActiveStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBackToCalendar = () => {
    setActiveStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box style={{ background: '#FFF9E6', minHeight: '100vh' }}>
      <Container size="lg" py={{ base: 'md', sm: 'xl' }} px={{ base: 'xs', sm: 'md' }}>
        <Stack gap={{ base: 'md', sm: 'xl' }}>
          {/* Header */}
          <Paper
            p={{ base: 'lg', sm: 'xl' }}
            radius="lg"
            style={{
              background: '#1A1A1A',
              border: '2px solid #F5B800',
              boxShadow: '0 4px 16px rgba(245, 184, 0, 0.2)',
            }}
          >
            <Stack gap="sm" align="center">
              <Badge
                size="xl"
                style={{
                  background: '#F5B800',
                  color: '#1A1A1A',
                  fontWeight: 900,
                  letterSpacing: '1px',
                }}
              >
                ⚡ POWERPLAY CRICKET ARENA
              </Badge>
              <Title
                order={1}
                c="white"
                ta="center"
                size={{ base: 'h2', sm: 'h1' }}
                fw={900}
              >
                Book Your Slot
              </Title>
              <Text c="#D1D1D1" ta="center" size={{ base: 'sm', sm: 'md' }}>
                {activeStep === 0
                  ? 'View availability & select your preferred time slots'
                  : 'Complete your booking details'}
              </Text>
            </Stack>
          </Paper>

          {/* Progress Stepper */}
          <Paper p="md" withBorder radius="lg" style={{ borderColor: '#F5B800', borderWidth: '2px' }}>
            <Stepper
              active={activeStep}
              onStepClick={setActiveStep}
              size={{ base: 'xs', sm: 'sm' }}
              color="yellow"
            >
              <Stepper.Step
                label="Select Date & Time"
                description="View availability"
                icon={<IconCalendar size={18} />}
              />
              <Stepper.Step
                label="Your Details"
                description="Complete booking"
                icon={<IconUser size={18} />}
                allowStepSelect={canProceedToForm}
              />
            </Stepper>
          </Paper>

          {/* Step 1: Calendar and Slot Selection */}
          {activeStep === 0 && (
            <Stack gap="lg">
              {/* Today's Availability - Prominent Display */}
              {todaySlots && todaySlots.length > 0 && (
                <Paper
                  p={{ base: 'lg', sm: 'xl' }}
                  withBorder
                  radius="lg"
                  style={{
                    background: 'linear-gradient(135deg, #F5B800 0%, #FFC933 100%)',
                    borderColor: '#1A1A1A',
                    borderWidth: '3px',
                    boxShadow: '0 8px 24px rgba(245, 184, 0, 0.3)',
                  }}
                >
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                      <Group gap="xs" style={{ flexGrow: 1 }}>
                        <IconCheck size={24} color="#1A1A1A" />
                        <Title order={2} style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }} c="#1A1A1A" fw={900}>
                          ⚡ TODAY'S AVAILABILITY
                        </Title>
                      </Group>
                      <Group gap="xs" wrap="wrap" justify={{ base: 'center', sm: 'flex-end' }} style={{ width: '100%', sm: { width: 'auto' } }}>
                        {/* Show Previous Day button only if viewing a future date */}
                        {quickViewDate.toDateString() !== new Date().toDateString() && (
                          <Button
                            size="sm"
                            variant="filled"
                            style={{ background: '#1A1A1A', color: '#F5B800', fontWeight: 700 }}
                            onClick={() => {
                              const prevDay = new Date(quickViewDate);
                              prevDay.setDate(prevDay.getDate() - 1);
                              // Don't go before today
                              if (prevDay >= new Date(new Date().setHours(0, 0, 0, 0))) {
                                setQuickViewDate(prevDay);
                              }
                            }}
                            fullWidth={{ base: true, xs: false }}
                          >
                            ← Previous Day
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="filled"
                          style={{ background: '#1A1A1A', color: '#F5B800', fontWeight: 700 }}
                          onClick={() => {
                            const nextDay = new Date(quickViewDate);
                            nextDay.setDate(nextDay.getDate() + 1);
                            setQuickViewDate(nextDay);
                          }}
                          fullWidth={{ base: true, xs: false }}
                        >
                          Next Day →
                        </Button>
                        <Button
                          size="sm"
                          variant="filled"
                          leftSection={<IconCalendar size={16} />}
                          style={{ background: '#1A1A1A', color: '#F5B800', fontWeight: 700 }}
                          onClick={() => setShowDatePicker(true)}
                          fullWidth={{ base: true, xs: false }}
                        >
                          Select Any Date
                        </Button>
                      </Group>
                    </Group>
                    
                    <Text size="sm" c="#1A1A1A" fw={600}>
                      {(quickViewDate instanceof Date ? quickViewDate : new Date(quickViewDate)).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>

                    {/* Status Legend - Moved to Top */}
                    <Group gap="xs" justify="center" style={{ flexWrap: 'wrap' }}>
                      <Badge size="md" style={{ background: '#1A1A1A', color: 'white', padding: '8px 12px' }}>✓ Available</Badge>
                      <Badge size="md" style={{ background: '#6B7280', color: 'white', padding: '8px 12px' }}>✕ Booked</Badge>
                      <Badge size="md" style={{ background: '#F59E0B', color: 'white', padding: '8px 12px' }}>⏳ Pending</Badge>
                      <Badge size="md" style={{ background: '#DC2626', color: 'white', padding: '8px 12px' }}>⏱️ Past</Badge>
                    </Group>

                    {/* All 24 Slots Grid */}
                    <SimpleGrid cols={{ base: 4, xs: 6, sm: 8 }} spacing="xs">
                      {todaySlots.map((slot) => {
                        const isPast = !slot.is_available && slot.slot_hour <= new Date().getHours();
                        const isBooked = slot.current_status === 'booked';
                        const isPending = slot.current_status === 'pending';
                        const isAvailable = slot.is_available && !isPast;

                        return (
                          <Badge
                            key={slot.slot_hour}
                            size="lg"
                            variant="filled"
                            style={{
                              padding: '10px 8px',
                              cursor: isAvailable ? 'pointer' : 'not-allowed',
                              opacity: isPast ? 0.3 : isBooked || isPending ? 0.6 : 1,
                              background: isAvailable 
                                ? '#1A1A1A' 
                                : isPast 
                                ? '#DC2626' 
                                : isBooked 
                                ? '#6B7280' 
                                : '#F59E0B',
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                            onClick={() => {
                              if (isAvailable) {
                                setSelectedDate(new Date());
                                setActiveStep(0);
                                setTimeout(() => {
                                  const slotsSection = document.getElementById('slots-section');
                                  slotsSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 100);
                              }
                            }}
                          >
                            <Stack gap={2} align="center">
                              <Text size="xs" fw={700}>{slot.slot_time}</Text>
                              <Text size="9px">
                                {isPast ? '⏱️' : isBooked ? '✕' : isPending ? '⏳' : '✓'}
                              </Text>
                            </Stack>
                          </Badge>
                        );
                      })}
                    </SimpleGrid>

                    <Alert 
                      icon={<IconInfoCircle size={18} />}
                      color="dark" 
                      variant="filled"
                      styles={{
                        root: { background: '#2A2A2A' }
                      }}
                    >
                      <Text size="sm" fw={600}>
                        💡 {todaySlots.filter(s => s.is_available && s.current_status === 'available').length} slots available! Click any available time to quick-book.
                      </Text>
                    </Alert>

                    {/* Date Picker Modal */}
                    {showDatePicker && (
                      <Box
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgba(0, 0, 0, 0.8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1000,
                          padding: '16px',
                        }}
                        onClick={() => setShowDatePicker(false)}
                      >
                        <Paper
                          p={{ base: 'md', sm: 'xl' }}
                          radius="lg"
                          style={{
                            background: '#FFFFFF',
                            border: '3px solid #F5B800',
                            maxWidth: '450px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Stack gap="lg">
                            <Title order={3} c="#1A1A1A" ta="center" size="h4">Select Date to View</Title>
                            
                            <Box style={{ display: 'flex', justifyContent: 'center' }}>
                              <DatePicker
                                value={quickViewDate}
                                onChange={(date) => {
                                  if (date) {
                                    const dateObj = date instanceof Date ? date : new Date(date);
                                    setQuickViewDate(dateObj);
                                    setShowDatePicker(false);
                                  }
                                }}
                                minDate={new Date()}
                                size="lg"
                                styles={{
                                  calendar: {
                                    width: '100%',
                                  },
                                  calendarHeader: {
                                    borderBottom: '2px solid #F5B800',
                                    paddingBottom: '12px',
                                    marginBottom: '12px',
                                  },
                                  calendarHeaderControl: {
                                    color: '#1A1A1A',
                                    border: '2px solid #F5B800',
                                    '&:hover': {
                                      background: '#FFF9E6',
                                    },
                                  },
                                  calendarHeaderLevel: {
                                    color: '#1A1A1A',
                                    fontWeight: 900,
                                    fontSize: '18px',
                                    '&:hover': {
                                      background: '#FFF9E6',
                                    },
                                  },
                                  monthCell: {
                                    color: '#1A1A1A',
                                    fontWeight: 700,
                                    '&:hover': {
                                      background: '#FFF9E6',
                                    },
                                  },
                                  yearCell: {
                                    color: '#1A1A1A',
                                    fontWeight: 700,
                                    '&:hover': {
                                      background: '#FFF9E6',
                                    },
                                  },
                                  day: {
                                    color: '#1A1A1A',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    '&:hover': {
                                      background: '#FFF9E6',
                                    },
                                    '&[data-selected]': {
                                      background: '#F5B800',
                                      color: '#1A1A1A',
                                      fontWeight: 900,
                                      border: '2px solid #1A1A1A',
                                    },
                                    '&[data-disabled]': {
                                      color: '#D1D1D1',
                                      textDecoration: 'line-through',
                                    },
                                    '&[data-weekend]': {
                                      color: '#F5B800',
                                      fontWeight: 900,
                                    },
                                  },
                                  weekday: {
                                    color: '#6B7280',
                                    fontWeight: 900,
                                    fontSize: '12px',
                                    textTransform: 'uppercase',
                                  },
                                }}
                              />
                            </Box>

                            <Button
                              fullWidth
                              size="lg"
                              variant="outline"
                              onClick={() => setShowDatePicker(false)}
                              style={{ 
                                borderColor: '#1A1A1A', 
                                color: '#1A1A1A',
                                borderWidth: '2px',
                                fontWeight: 700,
                              }}
                            >
                              Cancel
                            </Button>
                          </Stack>
                        </Paper>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              )}

              {/* Pricing Info */}
              <Paper
                p={{ base: 'md', sm: 'lg' }}
                withBorder
                radius="lg"
                style={{ background: '#FFECB3', borderColor: '#F5B800', borderWidth: '2px' }}
              >
                <Stack gap="sm">
                  <Group gap="xs">
                    <IconInfoCircle size={20} color="#1A1A1A" />
                    <Text fw={700} c="#1A1A1A" size="sm">
                      Pricing Information
                    </Text>
                  </Group>
                  <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
                    <Box>
                      <Text size="xs" c="#4A4A4A" mb={4}>
                        Day Rate (7 AM - 5 PM)
                      </Text>
                      <Text size="xl" fw={900} c="#1A1A1A">
                        Rs 1,500<Text component="span" size="sm" fw={600}>/hour</Text>
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="#4A4A4A" mb={4}>
                        Night Rate (5 PM - 7 AM)
                      </Text>
                      <Text size="xl" fw={900} c="#1A1A1A">
                        Rs 2,000<Text component="span" size="sm" fw={600}>/hour</Text>
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Stack>
              </Paper>

              {/* Date Picker */}
              <Paper 
                p={{ base: 'md', sm: 'lg' }} 
                withBorder 
                radius="lg" 
                style={{ 
                  background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
                  borderColor: '#F5B800', 
                  borderWidth: '3px',
                  boxShadow: '0 4px 16px rgba(245, 184, 0, 0.2)',
                }}
              >
                <Stack gap="md">
                  <Group gap="xs">
                    <IconCalendar size={24} color="#F5B800" />
                    <Title order={3} size={{ base: 'h5', sm: 'h4' }} c="white" fw={900}>
                      1. Select Date
                    </Title>
                  </Group>
                  <DatePickerInput
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="Click to select date"
                    minDate={new Date()}
                    size="xl"
                    radius="md"
                    popoverProps={{
                      styles: {
                        dropdown: {
                          background: '#FFFFFF',
                          border: '3px solid #F5B800',
                          boxShadow: '0 8px 24px rgba(245, 184, 0, 0.3)',
                        },
                      },
                    }}
                    styles={{
                      input: {
                        background: '#FFFFFF',
                        borderWidth: '3px',
                        borderColor: '#F5B800',
                        fontSize: '16px',
                        fontWeight: 600,
                        height: '56px',
                        color: '#1A1A1A',
                        '&:focus': {
                          borderColor: '#F5B800',
                          boxShadow: '0 0 0 3px rgba(245, 184, 0, 0.2)',
                        },
                        '&::placeholder': {
                          color: '#9CA3AF',
                          fontWeight: 500,
                        },
                      },
                      calendar: {
                        background: '#FFFFFF',
                      },
                      calendarHeader: {
                        background: '#FFFFFF',
                        borderBottom: '2px solid #F5B800',
                        paddingBottom: '12px',
                        marginBottom: '12px',
                      },
                      calendarHeaderControl: {
                        color: '#1A1A1A',
                        border: '2px solid #F5B800',
                        '&:hover': {
                          background: '#FFF9E6',
                        },
                      },
                      calendarHeaderLevel: {
                        color: '#1A1A1A',
                        fontWeight: 900,
                        fontSize: '18px',
                        '&:hover': {
                          background: '#FFF9E6',
                        },
                      },
                      monthCell: {
                        color: '#1A1A1A',
                        fontWeight: 700,
                        '&:hover': {
                          background: '#FFF9E6',
                        },
                      },
                      yearCell: {
                        color: '#1A1A1A',
                        fontWeight: 700,
                        '&:hover': {
                          background: '#FFF9E6',
                        },
                      },
                      day: {
                        color: '#1A1A1A',
                        fontWeight: 700,
                        fontSize: '14px',
                        '&:hover': {
                          background: '#FFF9E6',
                        },
                        '&[data-selected]': {
                          background: '#F5B800',
                          color: '#1A1A1A',
                          fontWeight: 900,
                          border: '2px solid #1A1A1A',
                        },
                        '&[data-disabled]': {
                          color: '#D1D1D1',
                          textDecoration: 'line-through',
                        },
                        '&[data-weekend]': {
                          color: '#F5B800',
                          fontWeight: 900,
                        },
                      },
                      weekday: {
                        color: '#6B7280',
                        fontWeight: 900,
                        fontSize: '12px',
                        textTransform: 'uppercase',
                      },
                    }}
                  />
                </Stack>
              </Paper>

              {/* Slot Selector */}
              {selectedDate && (
                <Paper
                  id="slots-section"
                  p={{ base: 'md', sm: 'lg' }}
                  withBorder
                  radius="lg"
                  style={{ borderColor: '#F5B800', borderWidth: '2px' }}
                >
                  <Stack gap="md">
                    <Group justify="space-between" wrap="wrap">
                      <Group gap="xs">
                        <IconClock size={20} color="#F5B800" />
                        <Title order={3} size={{ base: 'h5', sm: 'h4' }}>
                          2. Select Time Slots
                        </Title>
                      </Group>
                      {selectedSlots.length > 0 && (
                        <Badge size="lg" style={{ background: '#F5B800', color: '#1A1A1A' }}>
                          {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
                        </Badge>
                      )}
                    </Group>

                    {/* Important Notice */}
                    <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
                      <Text size="sm" fw={600}>
                        📌 Important: Select consecutive time slots only
                      </Text>
                      <Text size="xs" mt={4}>
                        Example: 4 PM, 5 PM, 6 PM ✓ | 4 AM and 7 PM ✗
                      </Text>
                      <Text size="xs" c="dimmed" mt={4}>
                        For different time periods, please create separate bookings.
                      </Text>
                    </Alert>

                    <SlotSelector
                      selectedDate={selectedDate}
                      selectedSlots={selectedSlots}
                      onSlotToggle={handleSlotToggle}
                      availableSlots={availableSlots}
                      loading={slotsLoading}
                      error={slotsError}
                    />
                  </Stack>
                </Paper>
              )}

              {/* Proceed Button */}
              {canProceedToForm && (
                <Paper
                  p="lg"
                  radius="lg"
                  style={{
                    background: '#1A1A1A',
                    border: '2px solid #F5B800',
                  }}
                >
                  <Stack gap="md" align="center">
                    <Box ta="center">
                      <Text size="lg" fw={700} c="white" mb={4}>
                        Selected: {selectedSlots.length} time slot{selectedSlots.length !== 1 ? 's' : ''}
                      </Text>
                      <Text size="sm" c="#D1D1D1">
                        Click below to proceed with your booking details
                      </Text>
                    </Box>
                    <Button
                      size="xl"
                      rightSection={<IconArrowRight size={20} />}
                      onClick={proceedToForm}
                      style={{
                        background: '#F5B800',
                        color: '#1A1A1A',
                        fontWeight: 700,
                        height: '60px',
                        fontSize: '18px',
                      }}
                      styles={{
                        root: {
                          '&:hover': {
                            background: '#FFDD80',
                          },
                        },
                      }}
                      fullWidth
                    >
                      Continue to Booking Form
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* Help Text */}
              {!selectedDate && (
                <Alert icon={<IconInfoCircle size="1rem" />} color="blue" variant="light">
                  <Text size="sm">
                    👆 Start by selecting a date above to view available time slots
                  </Text>
                </Alert>
              )}

              {selectedDate && selectedSlots.length === 0 && availableSlots && availableSlots.length > 0 && (
                <Alert icon={<IconInfoCircle size="1rem" />} color="yellow" variant="light">
                  <Text size="sm">
                    🕐 Select one or more time slots above to proceed with booking
                  </Text>
                </Alert>
              )}
            </Stack>
          )}

          {/* Step 2: Booking Form */}
          {activeStep === 1 && canProceedToForm && (
            <Stack gap="lg">
              {/* Back Button */}
              <Button
                variant="outline"
                leftSection={<IconArrowLeft size={18} />}
                onClick={goBackToCalendar}
                style={{
                  borderColor: '#F5B800',
                  color: '#1A1A1A',
                }}
              >
                Change Date/Slots
              </Button>

              {/* Selected Summary */}
              <Paper
                p="md"
                withBorder
                radius="lg"
                style={{ background: '#FFECB3', borderColor: '#F5B800', borderWidth: '2px' }}
              >
                <Group justify="space-between" wrap="wrap">
                  <Box>
                    <Text size="xs" c="#4A4A4A" mb={2}>
                      Selected Date
                    </Text>
                    <Text fw={700} size="lg" c="#1A1A1A">
                      {selectedDate?.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="#4A4A4A" mb={2}>
                      Time Slots
                    </Text>
                    <Badge size="lg" style={{ background: '#F5B800', color: '#1A1A1A' }}>
                      {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
                    </Badge>
                  </Box>
                </Group>
              </Paper>

              {/* Pass data to original BookingForm */}
              <BookingForm
                preSelectedDate={selectedDate}
                preSelectedSlots={selectedSlots}
                hideCalendar={true}
              />
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
