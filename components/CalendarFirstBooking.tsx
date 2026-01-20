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
    // Ensure dateToView is a Date object
    const dateObj = dateToView instanceof Date ? dateToView : new Date(dateToView);
    const today = new Date();
    const dateStr = formatDateForSQL(dateObj);
    const { data, error } = await getAvailableSlots(dateStr);

    if (!error) {
      // Generate all 24 slots with proper status
      const allSlots: SlotInfo[] = [];
      const currentHour = today.getHours();
      const isToday = dateObj.toDateString() === today.toDateString();

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
    // Check if the slot is actually available
    const slotsToCheck = selectedDate ? availableSlots : todaySlots;
    const slotInfo = slotsToCheck?.find(s => s.slot_hour === hour);
    
    if (!slotInfo || !slotInfo.is_available) {
      notifications.show({
        title: '⚠️ Slot Not Available',
        message: 'This time slot is not available for booking.',
        color: 'orange',
        autoClose: 3000,
        icon: <IconInfoCircle size={18} />,
      });
      return;
    }

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
              title: '⚠️ Select Consecutive Slots Only',
              message: 'You must select continuous time slots (e.g., 4 PM, 5 PM, 6 PM). For different times, create separate bookings.',
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
    // Scroll to the booking form section after a brief delay to let it render
    setTimeout(() => {
      const formSection = document.getElementById('booking-form-section');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const goBackToCalendar = () => {
    setActiveStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // TEST BUTTON - Send test notification
  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🏏 TEST: New Booking Request',
          message: 'Ahmed Khan booked for Mon, Jan 20 - 2 hour(s) [TEST]',
          bookingId: 'test-123',
          customerName: 'Ahmed Khan [TEST]',
        }),
      });

      if (response.ok) {
        notifications.show({
          title: '✅ Test Notification Sent!',
          message: 'Check your mobile phone for the push notification',
          color: 'green',
          autoClose: 5000,
        });
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      notifications.show({
        title: '❌ Test Failed',
        message: 'Could not send test notification. Check console for errors.',
        color: 'red',
        autoClose: 5000,
      });
      console.error('Test notification error:', error);
    }
  };

  return (
    <Box style={{ background: '#FFF9E6', minHeight: '100vh' }}>
      <Container size="lg" py={{ base: 'md', sm: 'xl' }} px={{ base: 'xs', sm: 'md' }}>
        <Stack gap="xl">
          {/* TEST BUTTON - Remove after testing */}
          <Paper p="md" withBorder style={{ background: '#FEF3C7', borderColor: '#F59E0B' }}>
            <Group justify="space-between" align="center">
              <div>
                <Text fw={600} size="sm" c="orange.9">
                  🧪 Test Mode - Admin Push Notification
                </Text>
                <Text size="xs" c="dimmed">
                  Send test notification to admin without filling form
                </Text>
              </div>
              <Button
                color="orange"
                onClick={sendTestNotification}
                size="sm"
              >
                Send Test Notification
              </Button>
            </Group>
          </Paper>

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
                  letterSpacing: '0.5px',
                  padding: '8px 16px',
                  fontSize: 'clamp(10px, 3vw, 16px)',
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  textOverflow: 'clip',
                }}
              >
                ⚡ POWERPLAY CRICKET ARENA
              </Badge>
              <Title
                order={1}
                c="white"
                ta="center"
                size='md'
                fw={900}
              >
                Book Your Slot
              </Title>
              <Text c="#D1D1D1" ta="center" size='md'>
                {activeStep === 0
                  ? 'View availability & select your preferred time slots'
                  : 'Complete your booking details'}
              </Text>
              <Group gap={{ base: 'xs', sm: 'md' }} justify="center" style={{ flexWrap: 'wrap' }}>
                <Text size={{ base: 'xs', sm: 'sm' }} c="#D1D1D1" ta="center" style={{ whiteSpace: 'nowrap' }}>
                  💰 Day Rate (7 AM - 5 PM): <Text component="span" fw={700} c="#F5B800">Rs 1,500/hr</Text>
                </Text>
                <Text size={{ base: 'xs', sm: 'sm' }} c="#D1D1D1" ta="center" style={{ whiteSpace: 'nowrap' }}>
                  🌙 Night Rate (5 PM - 7 AM): <Text component="span" fw={700} c="#F5B800">Rs 2,000/hr</Text>
                </Text>
              </Group>
            </Stack>
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
                      <Group gap="xs" wrap="wrap" justify="flex-end" style={{ width: '100%' }}>
                        {/* Show Previous Day button only if viewing a future date */}
                        {(quickViewDate instanceof Date ? quickViewDate : new Date(quickViewDate)).toDateString() !== new Date().toDateString() && (
                          <Button
                            size="sm"
                            variant="filled"
                            style={{ background: '#1A1A1A', color: '#F5B800', fontWeight: 700 }}
                            onClick={() => {
                              const currentDate = quickViewDate instanceof Date ? quickViewDate : new Date(quickViewDate);
                              const prevDay = new Date(currentDate);
                              prevDay.setDate(prevDay.getDate() - 1);
                              // Don't go before today
                              if (prevDay >= new Date(new Date().setHours(0, 0, 0, 0))) {
                                setQuickViewDate(prevDay);
                              }
                            }}
                            fullWidth
                          >
                            ← Previous Day
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="filled"
                          style={{ background: '#1A1A1A', color: '#F5B800', fontWeight: 700 }}
                          onClick={() => {
                            const currentDate = quickViewDate instanceof Date ? quickViewDate : new Date(quickViewDate);
                            const nextDay = new Date(currentDate);
                            nextDay.setDate(nextDay.getDate() + 1);
                            setQuickViewDate(nextDay);
                          }}
                        >
                          Next Day →
                        </Button>
                        <Button
                          size="sm"
                          variant="filled"
                          leftSection={<IconCalendar size={16} />}
                          style={{ background: '#1A1A1A', color: '#F5B800', fontWeight: 700 }}
                          onClick={() => setShowDatePicker(true)}
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
                    <SimpleGrid cols={{ base: 3, xs: 4, sm: 6, md: 8 }} spacing={{ base: 'xs', sm: 'sm' }}>
                      {todaySlots.map((slot) => {
                        const isPast = !slot.is_available && slot.slot_hour <= new Date().getHours();
                        const isBooked = slot.current_status === 'booked';
                        const isPending = slot.current_status === 'pending';
                        const isAvailable = slot.is_available && !isPast;

                        return (
                          <Paper
                            key={slot.slot_hour}
                            p="md"
                            radius="md"
                            style={{
                              cursor: isAvailable ? 'pointer' : 'not-allowed',
                              opacity: isPast ? 0.4 : isBooked || isPending ? 0.65 : 1,
                              background: selectedSlots.includes(slot.slot_hour) && isAvailable
                                ? '#F5B800'
                                : isAvailable 
                                ? '#1A1A1A' 
                                : isPast 
                                ? '#DC2626' 
                                : isBooked 
                                ? '#6B7280' 
                                : '#F59E0B',
                              color: selectedSlots.includes(slot.slot_hour) && isAvailable ? '#1A1A1A' : 'white',
                              minHeight: '75px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              border: selectedSlots.includes(slot.slot_hour) && isAvailable 
                                ? '3px solid #1A1A1A' 
                                : isAvailable 
                                ? '2px solid #F5B800' 
                                : 'none',
                              transition: 'all 0.2s ease',
                              transform: selectedSlots.includes(slot.slot_hour) ? 'scale(1.05)' : isAvailable ? 'scale(1)' : 'scale(0.95)',
                            }}
                            onClick={() => {
                              if (isAvailable) {
                                // Set the date first
                                const dateToSet = quickViewDate instanceof Date ? quickViewDate : new Date(quickViewDate);
                                setSelectedDate(dateToSet);
                                
                                // Small delay to ensure state updates, then toggle slot
                                setTimeout(() => {
                                  handleSlotToggle(slot.slot_hour);
                                }, 100);
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (isAvailable && !selectedSlots.includes(slot.slot_hour)) {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 184, 0, 0.4)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (isAvailable && !selectedSlots.includes(slot.slot_hour)) {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }
                            }}
                          >
                            <Text 
                              fw={700} 
                              style={{ 
                                fontSize: 'clamp(12px, 3vw, 15px)',
                                lineHeight: 1.1,
                                textAlign: 'center',
                                letterSpacing: '-0.5px',
                              }}
                            >
                              {slot.slot_hour === 0 ? '12:00' : slot.slot_hour > 12 ? `${slot.slot_hour - 12}:00` : `${slot.slot_hour}:00`}
                            </Text>
                            <Text 
                              size="xs" 
                              fw={600}
                              style={{ 
                                fontSize: '10px',
                                opacity: 0.9,
                              }}
                            >
                              {slot.slot_hour < 12 ? 'AM' : 'PM'}
                            </Text>
                            <Text style={{ fontSize: '14px', marginTop: '-2px' }}>
                              {selectedSlots.includes(slot.slot_hour) && isAvailable 
                                ? '✅' 
                                : isPast 
                                ? '⏱️' 
                                : isBooked 
                                ? '✕' 
                                : isPending 
                                ? '⏳' 
                                : '✓'
                              }
                            </Text>
                          </Paper>
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
                        {selectedSlots.length > 0 
                          ? `✓ ${selectedSlots.length} slot${selectedSlots.length > 1 ? 's' : ''} selected! Click "Continue to Booking Form" below.`
                          : `💡 ${todaySlots.filter(s => s.is_available && s.current_status === 'available').length} slots available! Click any to select.`
                        }
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
                                    setQuickViewDate(new Date(date));
                                    setShowDatePicker(false);
                                  }
                                }}
                                minDate={new Date()}
                                size="lg"
                                styles={{
                                  calendarHeader: {
                                    borderBottom: '2px solid #F5B800',
                                    paddingBottom: '12px',
                                    marginBottom: '12px',
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
                        fontSize: 'clamp(14px, 4vw, 18px)',
                        padding: '0 20px',
                      }}
                      styles={{
                        root: {
                          '&:hover': {
                            background: '#FFDD80',
                          },
                        },
                        label: {
                          overflow: 'visible',
                          whiteSpace: 'normal',
                          textAlign: 'center',
                        },
                      }}
                      fullWidth
                    >
                      Continue to Booking Form
                    </Button>
                  </Stack>
                </Paper>
              )}


            </Stack>
          )}

          {/* Step 2: Booking Form */}
          {activeStep === 1 && canProceedToForm && (
            <Stack gap="lg" id="booking-form-section">
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
                      {selectedDate 
                        ? (selectedDate instanceof Date ? selectedDate : new Date(selectedDate)).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'No date selected'
                      }
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
