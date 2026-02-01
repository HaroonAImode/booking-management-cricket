"use client";

import React, { useState, useEffect } from "react";
import { Box, Container, Stack, Paper, Badge, Title, Text, Group, Button, Loader } from "@mantine/core";
import { IconCheck, IconInfoCircle, IconArrowLeft, IconCalendar, IconArrowRight, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import BookingForm from "./BookingForm";
import { Alert, SimpleGrid } from "@mantine/core";
import { DatePicker } from "@mantine/dates";

export default function CalendarFirstBooking() {
  const [todayLoading, setTodayLoading] = useState(false);
  const [quickViewDate, setQuickViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [todaySlots, setTodaySlots] = useState<any[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const safeSelectedSlots = Array.isArray(selectedSlots) ? selectedSlots : [];
  const canProceedToForm = safeSelectedSlots.length > 0 && selectedDate;

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
        
        // FIX: Only calculate current hour for today, not for future dates
        const currentHour = isToday ? now.getHours() : -1;
        
        const slots = Array.from({ length: 24 }, (_, hour) => {
          // FIX: Only mark as past if it's today AND hour has passed
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

  const handleSlotToggle = (hour: number) => {
    setSelectedSlots((prev) => {
      if (prev.includes(hour)) {
        return prev.filter((h) => h !== hour);
      } else {
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

  const proceedToForm = () => {
    if (canProceedToForm) {
      setActiveStep(1);
      setTimeout(() => {
        const formSection = document.getElementById('booking-form-section');
        if (formSection && isMobile) {
          formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const goBackToCalendar = () => {
    setActiveStep(0);
  };

  const formatTime = (hour: number) => {
    if (hour === 0) return '12:00';
    if (hour > 12) return `${hour - 12}:00`;
    return `${hour}:00`;
  };

  const formatAmPm = (hour: number) => hour < 12 ? 'AM' : 'PM';

  return (
    <Box style={{ background: '#FFF9E6', minHeight: '100vh', padding: isMobile ? '12px 8px' : '24px 0' }}>
      <Container size="lg" py={{ base: 'md', sm: 'xl' }} px={{ base: isMobile ? 4 : 'xs', sm: 'md' }}>
        <Stack gap={isMobile ? 'md' : 'xl'}>

          {/* Updated Header Section */}
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

          {activeStep === 0 && (
            <Stack gap={isMobile ? 'md' : 'lg'}>
              {/* Fixed Date Navigation Section */}
              <Paper
                p={isMobile ? 'md' : 'lg'}
                radius="lg"
                style={{
                  background: '#FFFFFF',
                  border: '2px solid #F5B800',
                  boxShadow: '0 4px 16px rgba(26, 26, 26, 0.1)',
                  width: '100%',
                  overflow: 'hidden',
                }}
              >
                <Stack gap="md">
                  <Group justify="space-between" align="center" wrap="nowrap">
                    {/* Previous Button */}
                    <Button
                      size={isMobile ? 'sm' : 'md'}
                      variant="filled"
                      leftSection={<IconChevronLeft size={isMobile ? 14 : 18} />}
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
                        background: '#1A1A1A',
                        color: '#F5B800',
                        fontWeight: 700,
                        padding: isMobile ? '6px 8px' : '8px 14px',
                        borderRadius: '8px',
                        fontSize: isMobile ? '0.7rem' : '0.875rem',
                        minWidth: isMobile ? 'auto' : '110px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isMobile ? 'Prev' : 'Previous'}
                    </Button>
                    
                    {/* Date Display - Improved for mobile */}
                    <Box 
                      style={{ 
                        textAlign: 'center',
                        flex: 1,
                        padding: isMobile ? '0 4px' : '0 12px',
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* Full Day Name - Always visible */}
                      <Text 
                        fw={800} 
                        c="#1A1A1A"
                        size={isMobile ? 'xs' : 'sm'}
                        style={{ 
                          marginBottom: '2px',
                          fontSize: isMobile ? '0.75rem' : '0.95rem',
                          whiteSpace: 'nowrap',
                          overflow: 'visible',
                          textOverflow: 'clip',
                          letterSpacing: '0.3px',
                          lineHeight: 1.2,
                        }}
                      >
                        {quickViewDate.toLocaleDateString('en-US', {
                          weekday: 'long'
                        })}
                      </Text>
                      
                      {/* Full Date - Always visible */}
                      <Text 
                        fw={700} 
                        c="#1A1A1A"
                        size={isMobile ? 'sm' : 'md'}
                        style={{ 
                          fontSize: isMobile ? '0.9rem' : '1.1rem',
                          whiteSpace: 'nowrap',
                          overflow: 'visible',
                          textOverflow: 'clip',
                          lineHeight: 1.2,
                        }}
                      >
                        {quickViewDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                      
                      {/* Today indicator */}
                      <Text 
                        size={isMobile ? 'xs' : 'sm'} 
                        c="#666666"
                        style={{ 
                          fontSize: isMobile ? '0.65rem' : '0.8rem',
                          whiteSpace: 'nowrap',
                          marginTop: '2px',
                          fontWeight: 600,
                        }}
                      >
                        {quickViewDate.toDateString() === new Date().toDateString() ? 'TODAY' : 'SELECTED DATE'}
                      </Text>
                    </Box>
                    
                    {/* Next Button */}
                    <Button
                      size={isMobile ? 'sm' : 'md'}
                      variant="filled"
                      rightSection={<IconChevronRight size={isMobile ? 14 : 18} />}
                      onClick={() => {
                        setSlotsLoading(true);
                        const nextDay = new Date(quickViewDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        setQuickViewDate(nextDay);
                      }}
                      style={{
                        background: '#1A1A1A',
                        color: '#F5B800',
                        fontWeight: 700,
                        padding: isMobile ? '6px 8px' : '8px 14px',
                        borderRadius: '8px',
                        fontSize: isMobile ? '0.7rem' : '0.875rem',
                        minWidth: isMobile ? 'auto' : '110px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isMobile ? 'Next' : 'Next'}
                    </Button>
                  </Group>
                  
                  {/* Calendar Button - Added clear date info */}
                  <Group justify="center" gap="sm">
                    <Box style={{ 
                      textAlign: 'center',
                      flex: 1,
                      padding: '4px',
                      background: 'rgba(245, 184, 0, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(245, 184, 0, 0.2)',
                    }}>
                      <Text size="xs" fw={600} c="#1A1A1A">
                        Viewing: {quickViewDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                    </Box>
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
                        padding: isMobile ? '6px 12px' : '8px 20px',
                        fontSize: isMobile ? '0.7rem' : '0.875rem',
                        flexShrink: 0,
                      }}
                    >
                      {isMobile ? 'Pick Date' : 'Select Date'}
                    </Button>
                  </Group>
                </Stack>
              </Paper>

              {/* Slots Grid */}
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
                      background: 'rgba(255, 249, 230, 0.85)',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Group gap="md" align="center">
                        <Loader color="#F5B800" size="xl" />
                        <Text fw={700} c="#1A1A1A" size="lg">Loading slots...</Text>
                      </Group>
                    </Box>
                  )}
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                      <Group gap="xs" style={{ flexGrow: 1 }}>
                        <IconCheck size={24} color="#1A1A1A" />
                        <Title order={2} style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }} c="#1A1A1A" fw={900}>
                          AVAILABILITY CALENDAR
                        </Title>
                      </Group>
                      {/* Current Date Display */}
                      <Box style={{
                        background: '#1A1A1A',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '2px solid #F5B800',
                      }}>
                        <Text size="sm" fw={700} c="#F5B800">
                          {quickViewDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </Box>
                    </Group>
                    
                    {/* Status Legend */}
                    <Group gap="xs" justify="center" style={{ flexWrap: 'wrap' }}>
                      <Badge size="md" style={{ background: '#1A1A1A', color: 'white', padding: '8px 12px', fontWeight: 600 }}>✓ Available</Badge>
                      <Badge size="md" style={{ background: '#6B7280', color: 'white', padding: '8px 12px', fontWeight: 600 }}>✕ Booked</Badge>
                      <Badge size="md" style={{ background: '#F59E0B', color: 'white', padding: '8px 12px', fontWeight: 600 }}>⏳ Pending</Badge>
                      <Badge size="md" style={{ background: '#DC2626', color: 'white', padding: '8px 12px', fontWeight: 600 }}>⏱️ Past</Badge>
                    </Group>
                    
                    {/* All 24 Slots Grid */}
                    <Box style={{ transition: 'opacity 0.3s', opacity: slotsLoading ? 0.3 : 1 }}>
                      <SimpleGrid cols={{ base: 3, xs: 4, sm: 6, md: 8 }} spacing={{ base: 'xs', sm: 'sm' }}>
                        {todaySlots.map((slot) => {
                          // FIXED: Use the slot's actual status from the API response
                          const isBooked = slot.current_status === 'booked';
                          const isPending = slot.current_status === 'pending';
                          const isPast = slot.current_status === 'past';
                          const isAvailable = slot.current_status === 'available';

                          return (
                            <Paper
                              key={slot.slot_hour}
                              p="md"
                              radius="md"
                              style={{
                                cursor: isAvailable ? 'pointer' : 'not-allowed',
                                opacity: isPast ? 0.4 : isBooked || isPending ? 0.65 : 1,
                                background: safeSelectedSlots.includes(slot.slot_hour) && isAvailable
                                  ? '#F5B800'
                                  : isAvailable 
                                  ? '#1A1A1A' 
                                  : isPast 
                                  ? '#DC2626' 
                                  : isBooked 
                                  ? '#6B7280' 
                                  : '#F59E0B',
                                color: safeSelectedSlots.includes(slot.slot_hour) && isAvailable ? '#1A1A1A' : 'white',
                                minHeight: '75px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                border: safeSelectedSlots.includes(slot.slot_hour) && isAvailable 
                                  ? '3px solid #1A1A1A' 
                                  : isAvailable 
                                  ? '2px solid #F5B800' 
                                  : 'none',
                                transition: 'all 0.2s ease',
                                transform: safeSelectedSlots.includes(slot.slot_hour) ? 'scale(1.05)' : isAvailable ? 'scale(1)' : 'scale(0.95)',
                              }}
                              onClick={() => {
                                if (isAvailable) {
                                  setSelectedDate(quickViewDate);
                                  setTimeout(() => {
                                    handleSlotToggle(slot.slot_hour);
                                  }, 100);
                                }
                              }}
                              onMouseEnter={(e) => {
                                if (isAvailable && !safeSelectedSlots.includes(slot.slot_hour)) {
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 184, 0, 0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isAvailable && !safeSelectedSlots.includes(slot.slot_hour)) {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }
                              }}
                            >
                              <Text 
                                fw={700} 
                                style={{ 
                                  fontSize: isMobile ? '0.8rem' : '1rem',
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
                                  fontSize: isMobile ? '0.7rem' : '0.8rem',
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
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    letterSpacing: '0.5px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  BOOKED
                                </Text>
                              ) : (
                                <Text style={{ 
                                  fontSize: isMobile ? '0.9rem' : '1.1rem',
                                  marginTop: '-2px'
                                }}>
                                  {safeSelectedSlots.includes(slot.slot_hour) && isAvailable 
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
                    
                    {/* UPDATED: Selection Info Bar with fixed Continue button */}
                    {safeSelectedSlots.length > 0 ? (
                      <Box style={{
                        background: 'linear-gradient(135deg, #F5B800 0%, #FFD95E 100%)',
                        padding: isMobile ? '12px' : '16px',
                        borderRadius: '12px',
                        border: '2px solid #1A1A1A'
                      }}>
                        <Group justify="space-between" align="center" wrap="nowrap">
                          <Box style={{ 
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden'
                          }}>
                            <Text fw={800} c="#1A1A1A" size={isMobile ? 'sm' : 'md'}>
                              {safeSelectedSlots.length} slot{safeSelectedSlots.length !== 1 ? 's' : ''} selected
                            </Text>
                            <Text 
                              size={isMobile ? 'xs' : 'sm'} 
                              c="#1A1A1A" 
                              opacity={0.8}
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
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
                              padding: isMobile ? '8px 12px' : '8px 20px',
                              fontSize: isMobile ? '0.75rem' : '0.875rem',
                              whiteSpace: 'nowrap',
                              minWidth: isMobile ? '90px' : 'auto',
                              flexShrink: 0,
                            }}
                            styles={{
                              label: {
                                overflow: 'visible',
                                whiteSpace: 'nowrap',
                                textOverflow: 'clip',
                              }
                            }}
                          >
                            Continue
                          </Button>
                        </Group>
                      </Box>
                    ) : (
                      <Alert 
                        icon={<IconInfoCircle size={18} />}
                        color="dark" 
                        variant="filled"
                        styles={{
                          root: { background: '#2A2A2A' }
                        }}
                      >
                        <Text size="sm" fw={600}>
                          {safeSelectedSlots.length > 0 
                            ? `✓ ${safeSelectedSlots.length} slot${safeSelectedSlots.length > 1 ? 's' : ''} selected! Click "Continue" above.`
                            : `💡 ${todaySlots.filter(s => s.current_status === 'available').length} slots available! Click any green slot to select.`
                          }
                        </Text>
                      </Alert>
                    )}
                    
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
                                  setSlotsLoading(true);
                                  setQuickViewDate(date ? new Date(date) : new Date());
                                  setShowDatePicker(false);
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
              {canProceedToForm && !safeSelectedSlots.length && (
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
                        Selected: {safeSelectedSlots.length} time slot{safeSelectedSlots.length !== 1 ? 's' : ''}
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
                style={{ 
                  background: 'linear-gradient(135deg, #FFF9E6 0%, #FFECB3 100%)',
                  border: '2px solid #F5B800',
                  boxShadow: '0 4px 16px rgba(245, 184, 0, 0.15)',
                }}
              >
                <Group justify="space-between" wrap="wrap">
                  <Box>
                    <Text size="xs" c="#666666" mb={2} fw={600}>
                      SELECTED DATE
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
                    <Text size="xs" c="#666666" mb={2} fw={600}>
                      TIME SLOTS
                    </Text>
                    <Badge size="lg" style={{ 
                      background: '#F5B800', 
                      color: '#1A1A1A',
                      padding: '8px 16px',
                      fontWeight: 700
                    }}>
                      {safeSelectedSlots.length} slot{safeSelectedSlots.length !== 1 ? 's' : ''} selected
                    </Badge>
                  </Box>
                </Group>
                <Box style={{
                  background: '#1A1A1A',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginTop: '12px'
                }}>
                  <Text size="sm" c="#F5B800" fw={600}>
                    Selected times: {safeSelectedSlots.map(h => formatTime(h) + formatAmPm(h)).join(', ')}
                  </Text>
                </Box>
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