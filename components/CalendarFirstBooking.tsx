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
  // Track slots with their dates for multi-day booking
  const [selectedSlots, setSelectedSlots] = useState<{date: string, hour: number}[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [conflictDetected, setConflictDetected] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Helper: Get unique dates from selected slots
  const getSelectedDates = () => {
    const dates = new Set(selectedSlots.map(s => s.date));
    return Array.from(dates).sort();
  };

  // Helper: Check if date is consecutive to existing selections
  const isConsecutiveDate = (dateStr: string): boolean => {
    if (selectedSlots.length === 0) return true;
    
    const dates = getSelectedDates();
    const newDate = new Date(dateStr);
    
    for (const existingDateStr of dates) {
      const existingDate = new Date(existingDateStr);
      const diffDays = Math.abs((newDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) return true; // Allow same day or next/prev day
    }
    
    return false;
  };

  // Helper: Get slots for current viewing date
  const getCurrentDateSlots = (): number[] => {
    const currentDateStr = quickViewDate.toISOString().split('T')[0];
    return selectedSlots
      .filter(s => s.date === currentDateStr)
      .map(s => s.hour)
      .sort((a, b) => a - b);
  };

  const safeSelectedSlots = Array.isArray(selectedSlots) ? selectedSlots : [];
  const canProceedToForm = safeSelectedSlots.length > 0 && selectedDate;

  // Helper function to process slot data
  const processSlotData = (apiSlots: any[], date: Date): any[] => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const currentHour = isToday ? now.getHours() : -1;
    
    // Create map of all 24 hours with defaults
    const slotsMap = new Map();
    
    for (let hour = 0; hour < 24; hour++) {
      const isPast = isToday && hour < currentHour;
      slotsMap.set(hour, {
        slot_hour: hour,
        is_available: !isPast, // Default to available unless past
        current_status: isPast ? 'past' : 'available', // Default to available
      });
    }
    
    // Update with actual API data - TRUST THE API!
    apiSlots.forEach((slot: any) => {
      const hour = slot.slot_hour;
      const isPast = isToday && hour < currentHour;
      
      // Use API's current_status directly
      let finalStatus = slot.current_status || 'available';
      
      // Override with 'past' only if it's today and hour has passed
      if (isPast && finalStatus === 'available') {
        finalStatus = 'past';
      }
      
      // Determine availability based on status
      const isAvailable = finalStatus === 'available';
      
      slotsMap.set(hour, {
        slot_hour: hour,
        is_available: isAvailable,
        current_status: finalStatus,
      });
    });
    
    return Array.from(slotsMap.values());
  };

  // Fallback function for direct RPC call
  const fallbackDirectRPC = async (dateStr: string) => {
    try {
      // Import supabase client
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_date: dateStr
      });
      
      if (error) throw error;
      
      return processSlotData(data || [], new Date(dateStr));
    } catch (err) {
      console.error('Fallback RPC failed:', err);
      throw err;
    }
  };

  // Main fetch slots function with conflict detection
  const fetchSlots = async (silent: boolean = false) => {
    if (!silent) setSlotsLoading(true);
    setSlotsError(null);
    const dateStr = quickViewDate.toISOString().split('T')[0];
    
    console.log('🔍 Fetching slots for date:', dateStr, silent ? '(silent refresh)' : '');
    
    try {
      // Add timestamp to prevent caching
      const cacheBuster = new Date().getTime();
      const response = await fetch(`/api/public/slots?date=${dateStr}&_t=${cacheBuster}`);
      console.log('📡 API Response status:', response.status);
      
      let processedSlots;
      
      if (!response.ok) {
        console.log('🔄 Trying direct RPC fallback...');
        processedSlots = await fallbackDirectRPC(dateStr);
      } else {
        const data = await response.json();
        console.log('✅ Public API response:', data);
        
        if (!data.success) {
          throw new Error(data.error || 'API error');
        }
        
        processedSlots = processSlotData(data.slots || [], quickViewDate);
      }
      
      // Check for conflicts with selected slots for current viewing date
      if (selectedSlots.length > 0 && processedSlots.length > 0) {
        const currentDateStr = quickViewDate.toISOString().split('T')[0];
        const currentDateSlots = selectedSlots.filter(s => s.date === currentDateStr);
        
        const hasConflict = currentDateSlots.some(selectedSlot => {
          const slot = processedSlots.find(s => s.slot_hour === selectedSlot.hour);
          return slot && !slot.is_available;
        });
        
        if (hasConflict) {
          console.warn('⚠️ CONFLICT DETECTED: Selected slots are no longer available!');
          setConflictDetected(true);
          // Clear conflicting selections
          const validSlots = selectedSlots.filter(selectedSlot => {
            if (selectedSlot.date !== currentDateStr) return true; // Keep slots from other dates
            const slot = processedSlots.find(s => s.slot_hour === selectedSlot.hour);
            return slot && slot.is_available;
          });
          setSelectedSlots(validSlots);
        }
      }
      
      console.log('🎯 Processed slots:', processedSlots);
      setTodaySlots(processedSlots);
      setLastRefreshed(new Date());
      if (!silent) setSlotsLoading(false);
      setConflictDetected(false);
    } catch (err: any) {
      console.error('❌ Slot fetch error:', err);
      setSlotsError('Failed to load slots');
      if (!silent) setSlotsLoading(false);
      setTodaySlots([]);
    }
  };

  // Initial fetch and date change
  useEffect(() => {
    fetchSlots();
  }, [quickViewDate]);

  // Auto-refresh every 10 seconds when viewing slots
  useEffect(() => {
    if (!autoRefreshEnabled || activeStep !== 0) {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      return;
    }

    // Set up auto-refresh
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing slots...');
      fetchSlots(true); // Silent refresh
    }, 10000); // Refresh every 10 seconds

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefreshEnabled, activeStep, quickViewDate]);

  const handleSlotToggle = (hour: number) => {
    const currentDateStr = quickViewDate.toISOString().split('T')[0];
    
    // Check if this date is consecutive to existing selections
    if (!isConsecutiveDate(currentDateStr)) {
      alert('⚠️ You can only select slots from consecutive days!\n\nPlease select slots from adjacent dates only (e.g., Feb 5 + Feb 6).\n\nUse "Clear Selection" to start over.');
      return;
    }

    setSelectedSlots((prev) => {
      const slotKey = `${currentDateStr}-${hour}`;
      const exists = prev.some(s => s.date === currentDateStr && s.hour === hour);
      
      if (exists) {
        // Remove this slot
        return prev.filter(s => !(s.date === currentDateStr && s.hour === hour));
      } else {
        // Add this slot
        const newSlots = [...prev, { date: currentDateStr, hour }];
        
        // Sort by date then hour
        newSlots.sort((a, b) => {
          if (a.date === b.date) return a.hour - b.hour;
          return a.date.localeCompare(b.date);
        });
        
        // Validate consecutive hours across dates
        for (let i = 1; i < newSlots.length; i++) {
          const prevSlot = newSlots[i - 1];
          const currSlot = newSlots[i];
          
          const prevDate = new Date(prevSlot.date);
          const currDate = new Date(currSlot.date);
          const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (dayDiff === 0) {
            // Same day - hours must be consecutive
            if (currSlot.hour - prevSlot.hour !== 1) {
              alert('⚠️ Slots must be consecutive!\n\nYou can only select continuous time slots (e.g., 10 PM, 11 PM, 12 AM).');
              return prev;
            }
          } else if (dayDiff === 1) {
            // Next day - previous must be 23, current must be 0
            if (prevSlot.hour !== 23 || currSlot.hour !== 0) {
              alert('⚠️ Slots must be consecutive!\n\nFor overnight bookings, last slot of first day must be 11 PM (23:00), and first slot of next day must be 12 AM (00:00).');
              return prev;
            }
          } else {
            // Non-consecutive days
            alert('⚠️ You can only select slots from consecutive days!');
            return prev;
          }
        }
        
        return newSlots;
      }
    });
    
    // Set selected date to the first date in selection
    if (selectedSlots.length === 0) {
      setSelectedDate(quickViewDate);
    }
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
                          // Only clear if NOT consecutive
                          const prevDayStr = prevDay.toISOString().split('T')[0];
                          if (!isConsecutiveDate(prevDayStr)) {
                            setSelectedSlots([]);
                            setSelectedDate(null);
                          }
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
                        // Only clear if NOT consecutive
                        const nextDayStr = nextDay.toISOString().split('T')[0];
                        if (!isConsecutiveDate(nextDayStr)) {
                          setSelectedSlots([]);
                          setSelectedDate(null);
                        }
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
                  
                  {/* Caleendar Button - Added clear date info */}
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

              {/* Conflict Warning */}
              {conflictDetected && (
                <Alert 
                  color="red" 
                  title="⚠️ Booking Conflict Detected"
                  variant="filled"
                  styles={{
                    root: { border: '2px solid #DC2626' }
                  }}
                >
                  <Text size="sm" fw={600}>
                    One or more of your selected slots were just booked by another customer. 
                    Your selection has been updated to show only available slots.
                  </Text>
                </Alert>
              )}

              {/* Auto-refresh indicator */}
              {lastRefreshed && autoRefreshEnabled && (
                <Box style={{
                  background: '#1A1A1A',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '2px solid #F5B800',
                  textAlign: 'center'
                }}>
                  <Text size="xs" c="#F5B800" fw={600}>
                    🔄 Live Status • Auto-refreshing every 10s • Last updated: {lastRefreshed.toLocaleTimeString()}
                  </Text>
                </Box>
              )}

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
                    
                    {/* Selected Slots Display & Clear Button */}
                    {safeSelectedSlots.length > 0 && (
                      <Paper 
                        p="md" 
                        radius="md"
                        style={{
                          background: '#F5B800',
                          border: '3px solid #1A1A1A',
                          boxShadow: '0 4px 12px rgba(245, 184, 0, 0.3)',
                        }}
                      >
                        <Group justify="space-between" align="center" wrap="wrap" gap="md">
                          <Box style={{ flex: 1, minWidth: '200px' }}>
                            <Text fw={700} size="sm" c="#1A1A1A" mb={4}>
                              SELECTED SLOTS ({safeSelectedSlots.length})
                            </Text>
                            <Stack gap={4}>
                              {getSelectedDates().map(dateStr => {
                                const dateSlots = safeSelectedSlots.filter(s => s.date === dateStr);
                                const displayDate = new Date(dateStr).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                });
                                return (
                                  <Text key={dateStr} fw={600} size="md" c="#1A1A1A">
                                    {displayDate}: {dateSlots.map(s => `${formatTime(s.hour)} ${formatAmPm(s.hour)}`).join(', ')}
                                  </Text>
                                );
                              })}
                            </Stack>
                          </Box>
                          <Button
                            variant="filled"
                            color="red"
                            size="sm"
                            onClick={() => {
                              setSelectedSlots([]);
                              setSelectedDate(null);
                            }}
                            style={{
                              fontWeight: 700,
                              minWidth: '120px',
                            }}
                          >
                            Clear Selection
                          </Button>
                        </Group>
                      </Paper>
                    )}
                    
                    {/* Status Legend */}
                    <Group gap="xs" justify="center" style={{ flexWrap: 'wrap' }}>
                      <Badge size="md" style={{ background: '#F5B800', color: '#1A1A1A', padding: '8px 12px', fontWeight: 700, border: '2px solid #1A1A1A' }}>★ Selected</Badge>
                      <Badge size="md" style={{ background: '#1A1A1A', color: 'white', padding: '8px 12px', fontWeight: 600 }}>✓ Available</Badge>
                      <Badge size="md" style={{ background: '#6B7280', color: 'white', padding: '8px 12px', fontWeight: 600 }}>✕ Booked</Badge>
                      <Badge size="md" style={{ background: '#F59E0B', color: 'white', padding: '8px 12px', fontWeight: 600 }}>⏳ Pending</Badge>
                      <Badge size="md" style={{ background: '#DC2626', color: 'white', padding: '8px 12px', fontWeight: 600 }}>⏱️ Past</Badge>
                    </Group>
                    
                    {/* All 24 Slots Grid */}
                    <Box style={{ transition: 'opacity 0.3s', opacity: slotsLoading ? 0.3 : 1 }}>
                      <SimpleGrid cols={{ base: 3, xs: 4, sm: 6, md: 8 }} spacing={{ base: 'xs', sm: 'sm' }}>
                        {todaySlots.map((slot) => {
                          // Use the slot's actual status from the API response
                          const isBooked = slot.current_status === 'booked';
                          const isPending = slot.current_status === 'pending';
                          const isPast = slot.current_status === 'past';
                          const isAvailable = slot.current_status === 'available';
                          
                          // Check if this slot is selected for the current viewing date
                          const currentDateStr = quickViewDate.toISOString().split('T')[0];
                          const isSelected = safeSelectedSlots.some(s => 
                            s.date === currentDateStr && s.hour === slot.slot_hour
                          );

                          return (
                            <Paper
                              key={slot.slot_hour}
                              p="md"
                              radius="md"
                              style={{
                                cursor: isAvailable ? 'pointer' : 'not-allowed',
                                opacity: isPast ? 0.4 : isBooked || isPending ? 0.65 : 1,
                                background: isSelected && isAvailable
                                  ? '#F5B800'
                                  : isAvailable 
                                  ? '#1A1A1A' 
                                  : isPast 
                                  ? '#DC2626' 
                                  : isBooked 
                                  ? '#6B7280' 
                                  : '#F59E0B',
                                color: isSelected && isAvailable ? '#1A1A1A' : 'white',
                                minHeight: '75px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                border: isSelected && isAvailable 
                                  ? '3px solid #1A1A1A' 
                                  : isAvailable 
                                  ? '2px solid #F5B800' 
                                  : 'none',
                                transition: 'all 0.2s ease',
                                transform: isSelected ? 'scale(1.05)' : isAvailable ? 'scale(1)' : 'scale(0.95)',
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
                                if (isAvailable && !isSelected) {
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 184, 0, 0.4)';
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
                              <Datconst newDate = date ? new Date(date) : new Date();
                                  setQuickViewDate(newDate);
                                  // Only clear if NOT consecutive
                                  const newDateStr = newDate.toISOString().split('T')[0];
                                  if (!isConsecutiveDate(newDateStr)) {
                                    setSelectedSlots([]);
                                    setSelectedDate(null);
                                  }
                                  setSlotsLoading(true);
                                  setQuickViewDate(date ? new Date(date) : new Date());
                                  setSelectedSlots([]); // Clear selected slots when picking new date
                                  setSelectedDate(null); // Clear selected date
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
                preSelectedSlots={safeSelectedSlots.map(s => s.hour)}
                hideCalendar={true}
              />
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}