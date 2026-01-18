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
import { DatePickerInput } from '@mantine/dates';
import {
  IconCalendar,
  IconClock,
  IconUser,
  IconArrowRight,
  IconArrowLeft,
  IconInfoCircle,
  IconCheck,
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

  // Load today's slots on component mount
  useEffect(() => {
    loadTodaySlots();
  }, []);

  const loadTodaySlots = async () => {
    setTodayLoading(true);
    const today = new Date();
    const dateStr = formatDateForSQL(today);
    const { data, error } = await getAvailableSlots(dateStr);

    if (!error) {
      // Generate all 24 slots with proper status
      const allSlots: SlotInfo[] = [];
      const currentHour = today.getHours();

      for (let hour = 0; hour < 24; hour++) {
        const existingSlot = data?.find(s => s.slot_hour === hour);
        const isPast = hour <= currentHour;
        
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
            time_display: `${hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}:00 ${hour < 12 ? 'AM' : 'PM'}`,
            is_available: !isPast,
            is_night_rate: isNight,
            hourly_rate: isNight ? 2000 : 1500,
            current_status: isPast ? 'past' : 'available',
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
    setSelectedSlots((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour].sort((a, b) => a - b)
    );
  };

  const canProceedToForm = selectedDate && selectedSlots.length > 0;

  const proceedToForm = () => {
    if (canProceedToForm) {
      setActiveStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
                    <Group gap="xs">
                      <IconCheck size={24} color="#1A1A1A" />
                      <Title order={2} size={{ base: 'h4', sm: 'h3' }} c="#1A1A1A" fw={900}>
                        ⚡ TODAY'S AVAILABILITY
                      </Title>
                    </Group>
                    
                    <Text size="sm" c="#1A1A1A" fw={600}>
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>

                    {/* All 24 Slots Grid */}
                    <SimpleGrid cols={{ base: 4, xs: 6, sm: 8 }} spacing="xs">
                      {todaySlots.map((slot) => {
                        const isPast = slot.current_status === 'past' || !slot.is_available && slot.slot_hour <= new Date().getHours();
                        const isBooked = slot.current_status === 'booked';
                        const isPending = slot.current_status === 'pending';
                        const isAvailable = slot.is_available && !isPast;

                        return (
                          <Badge
                            key={slot.hour}
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
                              <Text size="xs" fw={700}>{slot.time_display}</Text>
                              <Text size="9px">
                                {isPast ? '⏱️' : isBooked ? '✕' : isPending ? '⏳' : '✓'}
                              </Text>
                            </Stack>
                          </Badge>
                        );
                      })}
                    </SimpleGrid>

                    {/* Status Legend */}
                    <Group gap="xs" justify="center" style={{ flexWrap: 'wrap' }}>
                      <Badge size="sm" style={{ background: '#1A1A1A', color: 'white' }}>✓ Available</Badge>
                      <Badge size="sm" style={{ background: '#6B7280', color: 'white' }}>✕ Booked</Badge>
                      <Badge size="sm" style={{ background: '#F59E0B', color: 'white' }}>⏳ Pending</Badge>
                      <Badge size="sm" style={{ background: '#DC2626', color: 'white' }}>⏱️ Past</Badge>
                    </Group>

                    <Alert color="dark" variant="filled">
                      <Text size="sm" fw={600}>
                        💡 {todaySlots.filter(s => s.is_available && s.current_status !== 'past').length} slots available today! Click any green time above to quick-book.
                      </Text>
                    </Alert>
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
              <Paper p={{ base: 'md', sm: 'lg' }} withBorder radius="lg" style={{ borderColor: '#F5B800', borderWidth: '2px' }}>
                <Stack gap="md">
                  <Group gap="xs">
                    <IconCalendar size={20} color="#F5B800" />
                    <Title order={3} size={{ base: 'h5', sm: 'h4' }}>
                      1. Select Date
                    </Title>
                  </Group>
                  <DatePickerInput
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="Click to select date"
                    minDate={new Date()}
                    size="lg"
                    radius="md"
                    styles={{
                      input: {
                        borderWidth: '2px',
                        borderColor: '#F5B800',
                        '&:focus': {
                          borderColor: '#1A1A1A',
                        },
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
