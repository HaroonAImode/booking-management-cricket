"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Box, Container, Stack, Paper, Badge, Title, Text, Group, Button, Loader } from "@mantine/core";
import { IconCheck, IconInfoCircle, IconAlertCircle, IconArrowLeft, IconCalendar, IconArrowRight, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import BookingForm from "./BookingForm";
import { Alert, SimpleGrid } from "@mantine/core";
import { DatePicker } from "@mantine/dates";

export default function CalendarFirstBooking() {
  // State variables
  const [quickViewDate, setQuickViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [todaySlots, setTodaySlots] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile screen on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Helper: always use array for selected slots
  const safeSelectedSlots = Array.isArray(selectedSlots) ? selectedSlots : [];

  // Helper: can proceed if at least one slot is selected
  const canProceedToForm = safeSelectedSlots.length > 0 && selectedDate;

  // --- Fetch real slot status from backend ---
  useEffect(() => {
    setSlotsLoading(true);
    setSlotsError(null);
    const dateStr = quickViewDate.toISOString().split('T')[0];
    fetch(`/api/admin/bookings/check-slots?date=${dateStr}`)
      .then(res => res.json())
      .then(data => {
        const availableHours = data.availableSlots || [];
        const bookedHours = data.bookedSlots || [];
        const now = new Date();
        const isToday = quickViewDate.toDateString() === now.toDateString();
        const currentHour = isToday ? now.getHours() : -1;
        const slots = Array.from({ length: 24 }, (_, hour) => {
          const isPast = isToday && hour <= currentHour;
          const isAvailable = availableHours.includes(hour) && !isPast;
          const isBooked = bookedHours.includes(hour);
          let status = 'available';
          if (isBooked) status = 'booked';
          else if (!isAvailable) status = isPast ? 'past' : 'pending';
          return {
            slot_hour: hour,
            is_available: isAvailable,
            current_status: status,
          };
        });
        setTodaySlots(slots);
        setSlotsLoading(false);
      })
      .catch(err => {
        setSlotsError('Failed to load slots');
        setSlotsLoading(false);
      });
  }, [quickViewDate]);

  // --- Slot selection handler ---
  const handleSlotToggle = (hour: number) => {
    setSelectedSlots((prev) => {
      if (prev.includes(hour)) {
        return prev.filter((h) => h !== hour);
      } else {
        // Only allow consecutive selection
        const newSelection = [...prev, hour].sort((a, b) => a - b);
        for (let i = 1; i < newSelection.length; i++) {
          if (newSelection[i] - newSelection[i - 1] !== 1) {
            return prev;
          }
        }
        return newSelection;
      }
    });
  };

  // --- Proceed to booking form ---
  const proceedToForm = () => {
    if (canProceedToForm) {
      setActiveStep(1);
      // On mobile, scroll to the booking form heading
      setTimeout(() => {
        const formSection = document.getElementById('booking-form-section');
        if (formSection && isMobile) {
          formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  // --- Go back to slot selection ---
  const goBackToCalendar = () => {
    setActiveStep(0);
  };

  // Format time display
  const formatTime = (hour: number) => {
    if (hour === 0) return '12:00';
    if (hour > 12) return `${hour - 12}:00`;
    return `${hour}:00`;
  };

  // Format AM/PM
  const formatAmPm = (hour: number) => hour < 12 ? 'AM' : 'PM';

  return (
    <Box style={{ 
      background: 'linear-gradient(135deg, #FFF9E6 0%, #FFF0CC 100%)',
      minHeight: '100vh',
      padding: isMobile ? '12px 8px' : '24px 0'
    }}>
      <Container size="lg" px={isMobile ? 8 : 'md'}>
        <Stack gap={isMobile ? 'md' : 'xl'}>

          {/* Header Card - Premium Design */}
          <Paper
            p={isMobile ? 'md' : 'xl'}
            radius="lg"
            style={{
              background: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)',
              border: '3px solid #F5B800',
              boxShadow: '0 8px 32px rgba(245, 184, 0, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Gold accent line */}
            <Box style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #F5B800, #FFD95E, #F5B800)'
            }} />
            
            <Stack gap={isMobile ? 'sm' : 'md'} align="center">
              <Badge
                size={isMobile ? 'lg' : 'xl'}
                style={{
                  background: '#F5B800',
                  color: '#1A1A1A',
                  fontWeight: 900,
                  letterSpacing: '0.5px',
                  padding: isMobile ? '6px 12px' : '8px 20px',
                  fontSize: isMobile ? '0.75rem' : '1rem',
                  whiteSpace: 'nowrap',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px'
                }}
              >
                ⚡ POWERPLAY CRICKET ARENA
              </Badge>
              
              <Title
                order={isMobile ? 2 : 1}
                c="white"
                ta="center"
                fw={900}
                style={{
                  fontSize: isMobile ? '1.5rem' : '2.25rem',
                  lineHeight: 1.2,
                  marginTop: isMobile ? '4px' : '8px'
                }}
              >
                Professional Ground Booking
              </Title>
              
              <Text 
                c="#D1D1D1" 
                ta="center" 
                size={isMobile ? 'xs' : 'sm'}
                style={{ maxWidth: '600px' }}
              >
                {activeStep === 0
                  ? 'Select your preferred time slots from the availability calendar'
                  : 'Complete your booking details to secure your slot'
                }
              </Text>
              
              <Group gap={isMobile ? 'sm' : 'md'} justify="center" wrap="wrap">
                <Box style={{
                  background: 'rgba(245, 184, 0, 0.1)',
                  padding: isMobile ? '6px 12px' : '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 184, 0, 0.3)'
                }}>
                  <Text size={isMobile ? 'xs' : 'sm'} c="#F5B800" fw={600}>
                    💰 Day (7AM-5PM): <Text component="span" fw={700}>Rs 1,500/hr</Text>
                  </Text>
                </Box>
                <Box style={{
                  background: 'rgba(245, 184, 0, 0.1)',
                  padding: isMobile ? '6px 12px' : '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 184, 0, 0.3)'
                }}>
                  <Text size={isMobile ? 'xs' : 'sm'} c="#F5B800" fw={600}>
                    🌙 Night (5PM-7AM): <Text component="span" fw={700}>Rs 2,000/hr</Text>
                  </Text>
                </Box>
              </Group>
            </Stack>
          </Paper>

          {/* Step 1: Calendar and Slot Selection */}
          {activeStep === 0 && (
            <Stack gap={isMobile ? 'md' : 'lg'}>

              {/* Date Navigation - Premium Design */}
              <Paper
                p={isMobile ? 'md' : 'lg'}
                radius="lg"
                style={{
                  background: '#FFFFFF',
                  border: '2px solid #F5B800',
                  boxShadow: '0 4px 16px rgba(26, 26, 26, 0.1)',
                }}
              >
                <Stack gap="md">
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Button
                      size={isMobile ? 'sm' : 'md'}
                      variant="subtle"
                      leftSection={<IconChevronLeft size={isMobile ? 16 : 20} />}
                      onClick={() => {
                        setSlotsLoading(true);
                        const prevDay = new Date(quickViewDate);
                        prevDay.setDate(prevDay.getDate() - 1);
                        if (prevDay >= new Date(new Date().setHours(0, 0, 0, 0))) {
                          setQuickViewDate(prevDay);
                        }
                      }}
                      disabled={quickViewDate.toDateString() === new Date().toDateString()}
                      style={{
                        color: '#1A1A1A',
                        fontWeight: 600,
                        minWidth: isMobile ? 'auto' : '120px'
                      }}
                    >
                      {isMobile ? 'Prev' : 'Previous'}
                    </Button>
                    
                    <Box style={{ 
                      textAlign: 'center',
                      flex: 1,
                      padding: isMobile ? '0 8px' : '0 16px'
                    }}>
                      <Text 
                        fw={800} 
                        c="#1A1A1A"
                        size={isMobile ? 'sm' : 'md'}
                        style={{ 
                          marginBottom: '4px',
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        {quickViewDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                      <Text 
                        size={isMobile ? 'xs' : 'sm'} 
                        c="#666666"
                        style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                      >
                        {quickViewDate.toDateString() === new Date().toDateString() ? 'Today' : 'Selected Date'}
                      </Text>
                    </Box>
                    
                    <Button
                      size={isMobile ? 'sm' : 'md'}
                      variant="subtle"
                      rightSection={<IconChevronRight size={isMobile ? 16 : 20} />}
                      onClick={() => {
                        setSlotsLoading(true);
                        const nextDay = new Date(quickViewDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        setQuickViewDate(nextDay);
                      }}
                      style={{
                        color: '#1A1A1A',
                        fontWeight: 600,
                        minWidth: isMobile ? 'auto' : '100px'
                      }}
                    >
                      {isMobile ? 'Next' : 'Next Day'}
                    </Button>
                  </Group>
                  
                  <Group justify="center">
                    <Button
                      size={isMobile ? 'sm' : 'md'}
                      variant="filled"
                      leftSection={<IconCalendar size={isMobile ? 14 : 16} />}
                      onClick={() => setShowDatePicker(true)}
                      style={{
                        background: '#F5B800',
                        color: '#1A1A1A',
                        fontWeight: 700,
                        borderRadius: '8px',
                        padding: isMobile ? '6px 16px' : '8px 24px',
                        fontSize: isMobile ? '0.75rem' : '0.875rem'
                      }}
                    >
                      {isMobile ? 'Pick Date' : 'Select Specific Date'}
                    </Button>
                  </Group>
                </Stack>
              </Paper>

              {/* Slots Grid - Premium Design */}
              <Paper
                p={isMobile ? 'md' : 'xl'}
                radius="lg"
                style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%)',
                  border: '2px solid #F5B800',
                  boxShadow: '0 6px 24px rgba(26, 26, 26, 0.15)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {slotsLoading && (
                  <Box style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255, 255, 255, 0.95)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'inherit',
                  }}>
                    <Stack align="center" gap="md">
                      <Loader color="#F5B800" size="lg" />
                      <Text fw={700} c="#1A1A1A" size="sm">Loading availability...</Text>
                    </Stack>
                  </Box>
                )}
                
                <Stack gap={isMobile ? 'sm' : 'md'}>
                  {/* Status Legend */}
                  <Group gap={isMobile ? 'xs' : 'sm'} justify="center" wrap="wrap">
                    <Badge 
                      size={isMobile ? 'xs' : 'sm'} 
                      style={{ 
                        background: '#10B981', 
                        color: 'white',
                        padding: isMobile ? '4px 8px' : '6px 12px',
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      ✓ Available
                    </Badge>
                    <Badge 
                      size={isMobile ? 'xs' : 'sm'} 
                      style={{ 
                        background: '#6B7280', 
                        color: 'white',
                        padding: isMobile ? '4px 8px' : '6px 12px',
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      ✕ Booked
                    </Badge>
                    <Badge 
                      size={isMobile ? 'xs' : 'sm'} 
                      style={{ 
                        background: '#F59E0B', 
                        color: 'white',
                        padding: isMobile ? '4px 8px' : '6px 12px',
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      ⏳ Pending
                    </Badge>
                    <Badge 
                      size={isMobile ? 'xs' : 'sm'} 
                      style={{ 
                        background: '#EF4444', 
                        color: 'white',
                        padding: isMobile ? '4px 8px' : '6px 12px',
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      ⏱️ Past
                    </Badge>
                  </Group>

                  {/* Slots Grid */}
                  <Box style={{ 
                    transition: 'opacity 0.3s', 
                    opacity: slotsLoading ? 0.5 : 1,
                    maxHeight: isMobile ? 'calc(100vh - 400px)' : '500px',
                    overflowY: 'auto',
                    padding: isMobile ? '4px' : '8px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#F5B800 #F1F1F1'
                  }}>
                    <SimpleGrid 
                      cols={{ base: 3, xs: 4, sm: 6, md: 8 }} 
                      spacing={isMobile ? 'xs' : 'sm'}
                    >
                      {todaySlots.map((slot) => {
                        const isPast = !slot.is_available && slot.slot_hour <= new Date().getHours();
                        const isBooked = slot.current_status === 'booked';
                        const isPending = slot.current_status === 'pending';
                        const isAvailable = slot.is_available && !isPast;
                        const isSelected = safeSelectedSlots.includes(slot.slot_hour);

                        return (
                          <Paper
                            key={slot.slot_hour}
                            p={isMobile ? 'xs' : 'sm'}
                            radius="md"
                            style={{
                              cursor: isAvailable ? 'pointer' : 'not-allowed',
                              opacity: isPast ? 0.4 : isBooked || isPending ? 0.7 : 1,
                              background: isSelected && isAvailable
                                ? '#F5B800'
                                : isAvailable 
                                ? '#1A1A1A' 
                                : isPast 
                                ? '#EF4444' 
                                : isBooked 
                                ? '#6B7280' 
                                : '#F59E0B',
                              color: isSelected && isAvailable ? '#1A1A1A' : 'white',
                              minHeight: isMobile ? '70px' : '85px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              border: isSelected && isAvailable 
                                ? '2px solid #1A1A1A' 
                                : isAvailable 
                                ? '1px solid #F5B800' 
                                : 'none',
                              transition: 'all 0.2s ease',
                              transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                              boxShadow: isSelected ? '0 4px 12px rgba(245, 184, 0, 0.4)' : 'none',
                            }}
                            onClick={() => {
                              if (isAvailable) {
                                setSelectedDate(quickViewDate);
                                setTimeout(() => {
                                  handleSlotToggle(slot.slot_hour);
                                }, 50);
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (isAvailable && !isSelected) {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 184, 0, 0.2)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (isAvailable && !isSelected) {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }
                            }}
                          >
                            <Text 
                              fw={700} 
                              style={{ 
                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                lineHeight: 1.1,
                                textAlign: 'center',
                              }}
                            >
                              {formatTime(slot.slot_hour)}
                            </Text>
                            <Text 
                              size="xs" 
                              fw={600}
                              style={{ 
                                fontSize: isMobile ? '0.65rem' : '0.75rem',
                                opacity: 0.9,
                              }}
                            >
                              {formatAmPm(slot.slot_hour)}
                            </Text>
                            {isBooked ? (
                              <Text 
                                size="xs" 
                                fw={700}
                                style={{ 
                                  color: 'white',
                                  fontSize: isMobile ? '0.6rem' : '0.7rem',
                                  marginTop: '-2px',
                                  background: '#DC2626',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  letterSpacing: '0.5px'
                                }}
                              >
                                BOOKED
                              </Text>
                            ) : (
                              <Text style={{ 
                                fontSize: isMobile ? '0.8rem' : '1rem',
                                marginTop: '-2px',
                                opacity: isSelected ? 1 : 0.8
                              }}>
                                {isSelected && isAvailable 
                                  ? '✅' 
                                  : isPast 
                                  ? '⏱️' 
                                  : isPending 
                                  ? '⏳' 
                                  : '✓'
                                }
                              </Text>
                            )}
                          </Paper>
                        );
                      })}
                    </SimpleGrid>
                  </Box>

                  {/* Selection Info */}
                  {safeSelectedSlots.length > 0 ? (
                    <Box style={{
                      background: 'linear-gradient(135deg, #F5B800 0%, #FFD95E 100%)',
                      padding: isMobile ? '12px' : '16px',
                      borderRadius: '12px',
                      border: '2px solid #1A1A1A'
                    }}>
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Box>
                          <Text fw={800} c="#1A1A1A" size={isMobile ? 'sm' : 'md'}>
                            {safeSelectedSlots.length} slot{safeSelectedSlots.length !== 1 ? 's' : ''} selected
                          </Text>
                          <Text size={isMobile ? 'xs' : 'sm'} c="#1A1A1A" opacity={0.8}>
                            {safeSelectedSlots.map(h => formatTime(h) + formatAmPm(h)).join(', ')}
                          </Text>
                        </Box>
                        <Button
                          size={isMobile ? 'sm' : 'md'}
                          rightSection={<IconArrowRight size={isMobile ? 14 : 16} />}
                          onClick={proceedToForm}
                          style={{
                            background: '#1A1A1A',
                            color: '#F5B800',
                            fontWeight: 700,
                            borderRadius: '8px',
                            padding: isMobile ? '6px 16px' : '8px 20px',
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Continue
                        </Button>
                      </Group>
                    </Box>
                  ) : (
                    <Alert 
                      icon={<IconInfoCircle size={isMobile ? 14 : 16} />}
                      color="blue" 
                      variant="light"
                      radius="md"
                    >
                      <Text size={isMobile ? 'xs' : 'sm'} fw={600}>
                        💡 {todaySlots.filter(s => s.is_available && s.current_status === 'available').length} slots available today. Click any green slot to select.
                      </Text>
                    </Alert>
                  )}
                </Stack>
              </Paper>

              {/* Date Picker Modal */}
              {showDatePicker && (
                <Box
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: isMobile ? '16px' : '24px',
                  }}
                  onClick={() => setShowDatePicker(false)}
                >
                  <Paper
                    p={isMobile ? 'md' : 'xl'}
                    radius="lg"
                    style={{
                      background: '#FFFFFF',
                      border: '3px solid #F5B800',
                      maxWidth: '500px',
                      width: '100%',
                      maxHeight: '90vh',
                      overflow: 'auto',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Stack gap="lg">
                      <Title order={3} c="#1A1A1A" ta="center" size={isMobile ? 'h4' : 'h3'}>
                        Select Date
                      </Title>
                      <Box style={{ display: 'flex', justifyContent: 'center' }}>
                        <DatePicker
                          value={quickViewDate}
                          onChange={(date) => {
                            setSlotsLoading(true);
                            setQuickViewDate(date ? new Date(date) : new Date());
                            setShowDatePicker(false);
                          }}
                          minDate={new Date()}
                          size={isMobile ? 'md' : 'lg'}
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
                        size={isMobile ? 'md' : 'lg'}
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
          )}

          {/* Step 2: Booking Form */}
          {activeStep === 1 && canProceedToForm && (
            <Stack gap={isMobile ? 'md' : 'lg'} id="booking-form-section">
              {/* Back Button */}
              <Paper
                p="md"
                radius="lg"
                style={{
                  background: '#FFFFFF',
                  border: '2px solid #F5B800',
                  boxShadow: '0 4px 16px rgba(26, 26, 26, 0.1)',
                }}
              >
                <Button
                  variant="subtle"
                  leftSection={<IconArrowLeft size={isMobile ? 14 : 16} />}
                  onClick={goBackToCalendar}
                  style={{
                    color: '#1A1A1A',
                    fontWeight: 600,
                    padding: 0
                  }}
                >
                  Back to Slot Selection
                </Button>
              </Paper>

              {/* Selected Summary */}
              <Paper
                p={isMobile ? 'md' : 'lg'}
                radius="lg"
                style={{ 
                  background: 'linear-gradient(135deg, #FFF9E6 0%, #FFECB3 100%)',
                  border: '2px solid #F5B800',
                  boxShadow: '0 4px 16px rgba(245, 184, 0, 0.15)',
                }}
              >
                <Stack gap={isMobile ? 'sm' : 'md'}>
                  <Group justify="space-between" wrap="wrap">
                    <Box>
                      <Text size={isMobile ? 'xs' : 'sm'} c="#666666" mb={2} fw={600}>
                        SELECTED DATE
                      </Text>
                      <Text fw={700} size={isMobile ? 'sm' : 'lg'} c="#1A1A1A">
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
                      <Text size={isMobile ? 'xs' : 'sm'} c="#666666" mb={2} fw={600}>
                        TIME SLOTS
                      </Text>
                      <Badge 
                        size={isMobile ? 'md' : 'lg'} 
                        style={{ 
                          background: '#F5B800', 
                          color: '#1A1A1A',
                          padding: isMobile ? '8px 16px' : '10px 20px',
                          fontWeight: 700,
                          fontSize: isMobile ? '0.75rem' : '0.875rem'
                        }}
                      >
                        {safeSelectedSlots.length} slot{safeSelectedSlots.length !== 1 ? 's' : ''} selected
                      </Badge>
                    </Box>
                  </Group>
                  <Box style={{
                    background: '#1A1A1A',
                    padding: isMobile ? '8px 12px' : '12px 16px',
                    borderRadius: '8px',
                  }}>
                    <Text size={isMobile ? 'xs' : 'sm'} c="#F5B800" fw={600}>
                      Selected times: {safeSelectedSlots.map(h => formatTime(h) + formatAmPm(h)).join(', ')}
                    </Text>
                  </Box>
                </Stack>
              </Paper>

              {/* Pass data to original BookingForm */}
              <BookingForm
                preSelectedDate={selectedDate ? new Date(selectedDate) : new Date()}
                preSelectedSlots={[...safeSelectedSlots]}
                hideCalendar={true}
              />
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}