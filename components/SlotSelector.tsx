'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Badge,
  Group,
  SimpleGrid,
  Paper,
  Stack,
  Title,
  Loader,
  Alert,
  Tooltip,
} from '@mantine/core';
import { IconClock, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { SlotInfo } from '@/types';
import { formatTimeDisplay, isNightRate } from '@/lib/supabase/bookings';
import { SlotsSkeleton } from './ui/LoadingSkeleton';

interface SlotSelectorProps {
  selectedDate: Date | null;
  selectedSlots: number[];
  onSlotToggle: (hour: number) => void;
  availableSlots: SlotInfo[] | null;
  loading: boolean;
  error: string | null;
}

export default function SlotSelector({
  selectedDate,
  selectedSlots,
  onSlotToggle,
  availableSlots,
  loading,
  error,
}: SlotSelectorProps) {
  const [nightStart, setNightStart] = useState(17);
  const [nightEnd, setNightEnd] = useState(7);
  const [processedSlots, setProcessedSlots] = useState<SlotInfo[]>([]);

  // DEBUG: Log what we receive
  useEffect(() => {
    console.log('🔍 SlotSelector DEBUG - Props received:', {
      selectedDate: selectedDate?.toISOString(),
      availableSlotsCount: availableSlots?.length,
      loading,
      error,
      sampleSlots: availableSlots?.slice(0, 5)
    });
    
    if (availableSlots && availableSlots.length > 0) {
      console.log('📊 ALL SLOTS from API:', availableSlots);
      
      // Check how many are available vs pending vs booked
      const availableCount = availableSlots.filter(s => s.is_available).length;
      const pendingCount = availableSlots.filter(s => s.current_status === 'pending').length;
      const bookedCount = availableSlots.filter(s => s.current_status === 'booked').length;
      
      console.log('📊 Slot Status Summary from API:', {
        total: availableSlots.length,
        available: availableCount,
        pending: pendingCount,
        booked: bookedCount
      });
      
      // Log specific slots for today
      if (selectedDate) {
        const today = new Date();
        const isToday = selectedDate.getDate() === today.getDate() &&
                       selectedDate.getMonth() === today.getMonth() &&
                       selectedDate.getFullYear() === today.getFullYear();
        
        if (isToday) {
          const todaySlots = availableSlots
            .filter(s => s.slot_hour >= 17 && s.slot_hour <= 22)
            .map(s => ({
              hour: s.slot_hour,
              status: s.current_status,
              is_available: s.is_available,
              hourly_rate: s.hourly_rate
            }));
          console.log('📅 Today\'s slots (17-22):', todaySlots);
        }
      }
    }
    
    // Process slots for display
    if (availableSlots && availableSlots.length > 0) {
      const slots = generateDisplaySlots(availableSlots);
      setProcessedSlots(slots);
      console.log('✅ Processed display slots:', slots.length);
    } else {
      setProcessedSlots([]);
    }
  }, [availableSlots, loading, error, selectedDate]);

  // Ensure selectedSlots is always an array
  const safeSelectedSlots = Array.isArray(selectedSlots) ? selectedSlots : [];

  // Generate display slots from API data
  const generateDisplaySlots = (apiSlots: SlotInfo[]): SlotInfo[] => {
    const now = new Date();
    const dateObj = selectedDate instanceof Date ? selectedDate : selectedDate ? new Date(selectedDate) : null;
    
    const isToday = dateObj && 
      dateObj.getDate() === now.getDate() &&
      dateObj.getMonth() === now.getMonth() &&
      dateObj.getFullYear() === now.getFullYear();
    const currentHour = now.getHours();

    // Create a map of all 24 hours with default values
    const allSlotsMap = new Map<number, SlotInfo>();
    
    // Initialize all 24 hours with default values
    for (let hour = 0; hour < 24; hour++) {
      const isPast = isToday && hour <= currentHour;
      const nightRate = isNightRate(hour, nightStart, nightEnd);
      
      allSlotsMap.set(hour, {
        slot_hour: hour,
        slot_time: `${hour.toString().padStart(2, '0')}:00`,
        is_available: !isPast, // Default to available unless past
        current_status: 'available', // Default status
        hourly_rate: nightRate ? 2000 : 1500,
        is_past: isPast,
      } as any);
    }
    
    // Override with actual API data
    apiSlots.forEach(apiSlot => {
      const hour = apiSlot.slot_hour;
      const isPast = isToday && hour <= currentHour;
      
      // Use the API data exactly as it comes
      allSlotsMap.set(hour, {
        ...apiSlot,
        is_available: isPast ? false : apiSlot.is_available,
        is_past: isPast,
      });
    });
    
    return Array.from(allSlotsMap.values()).sort((a, b) => a.slot_hour - b.slot_hour);
  };

  // Update night times if available from slots data
  useEffect(() => {
    if (availableSlots && availableSlots.length > 0) {
      setNightStart(17);
      setNightEnd(7);
    }
  }, [availableSlots]);

  if (!selectedDate) {
    return (
      <Paper p="md" withBorder>
        <Alert icon={<IconInfoCircle size="1rem" />} color="blue" variant="light">
          Please select a date first to view available time slots
        </Alert>
      </Paper>
    );
  }

  if (loading) {
    return <SlotsSkeleton />;
  }

  if (error) {
    return (
      <Paper p="md" withBorder>
        <Alert icon={<IconAlertCircle size="1rem" />} color="red" title="Error">
          {error}
        </Alert>
      </Paper>
    );
  }

  if (!availableSlots || availableSlots.length === 0 || processedSlots.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Alert icon={<IconInfoCircle size="1rem" />} color="yellow">
          No slots available for this date
        </Alert>
      </Paper>
    );
  }

  const getSlotColor = (slot: SlotInfo) => {
    if (safeSelectedSlots.includes(slot.slot_hour)) return 'yellow';
    if (slot.current_status === 'booked') return 'gray';
    if (slot.current_status === 'pending') return 'orange';
    return 'yellow';
  };

  const getSlotVariant = (slot: SlotInfo) => {
    if (safeSelectedSlots.includes(slot.slot_hour)) return 'filled';
    if (slot.is_available) return 'outline';
    return 'light';
  };

  const getSlotLabel = (slot: SlotInfo) => {
    if ((slot as any).is_past) return 'Past';
    if (slot.current_status === 'booked') return 'Booked';
    if (slot.current_status === 'pending') return 'Under Approval';
    return 'Available';
  };

  const isDisabled = (slot: SlotInfo) => {
    // Disable if it's in the past (for today)
    if ((slot as any).is_past) return true;
    // Disable if not available and not selected
    return !slot.is_available && !safeSelectedSlots.includes(slot.slot_hour);
  };

  const isNightSlot = (hour: number) => {
    return isNightRate(hour, nightStart, nightEnd);
  };

  console.log('🎯 Final processed slots to display:', processedSlots.slice(17, 23));

  return (
    <Stack gap={{ base: "sm", sm: "md" }} className="animate-fade-in">
      {/* Header */}
      <Group justify="space-between">
        <Title 
          order={4}
          size={{ base: 'h5', sm: 'h4' }}
          style={{ fontSize: 'clamp(0.875rem, 3vw, 1.25rem)' }}
        >
          Select Time Slots
        </Title>
        <Text size={{ base: 'xs', sm: 'sm' }} c="dimmed">
          {safeSelectedSlots.length} slot{safeSelectedSlots.length !== 1 ? 's' : ''}
        </Text>
      </Group>

      {/* Pricing Info */}
      <Alert icon={<IconInfoCircle size="1rem" />} color="blue" variant="light">
        <Stack gap={{ base: 4, sm: 'xs' }}>
          <Text size={{ base: 'xs', sm: 'sm' }}>
            <strong>Day Rate:</strong> PKR 1,500/hr
          </Text>
          <Text size={{ base: 'xs', sm: 'sm' }}>
            <strong>Night Rate:</strong> PKR 2,000/hr (5 PM - 7 AM)
          </Text>
        </Stack>
      </Alert>

      {/* Legend */}
      <Group gap="xs" style={{ flexWrap: 'wrap' }}>
        <Badge size={{ base: 'xs', sm: 'sm' }} style={{ background: '#F5B800', color: '#1A1A1A', borderWidth: '2px', borderColor: '#F5B800', borderStyle: 'solid' }}>
          Available
        </Badge>
        <Badge size={{ base: 'xs', sm: 'sm' }} style={{ background: '#1A1A1A', color: '#F5B800' }}>
          Selected
        </Badge>
        <Badge size={{ base: 'xs', sm: 'sm' }} variant="light" color="orange" style={{ borderWidth: '2px', borderStyle: 'dashed' }}>
          Pending
        </Badge>
        <Badge size={{ base: 'xs', sm: 'sm' }} variant="light" color="gray">
          Booked
        </Badge>
        <Badge size={{ base: 'xs', sm: 'sm' }} variant="light" color="red" style={{ opacity: 0.6 }}>
          Past
        </Badge>
      </Group>

      {/* Warning Message */}
      <Alert icon={<IconAlertCircle size="1rem" />} color="yellow" variant="light">
        <Text size={{ base: 'xs', sm: 'sm' }}>
          ⚠️ Please select carefully. Slots marked "Pending" are awaiting admin confirmation.
        </Text>
      </Alert>

      {/* Slot Grid */}
      <SimpleGrid
        cols={{ base: 2, xs: 3, sm: 4, md: 6, lg: 8 }}
        spacing={{ base: 'xs', sm: 'sm' }}
        verticalSpacing={{ base: 'xs', sm: 'sm' }}
      >
        {processedSlots.map((slot) => {
          const isPastSlot = (slot as any).is_past;
          
          return (
          <Tooltip
            key={slot.slot_hour}
            label={
              <Stack gap={4}>
                <Text size="xs">{formatTimeDisplay(slot.slot_hour)}</Text>
                <Text size="xs">
                  PKR {slot.hourly_rate.toLocaleString()}/hr
                </Text>
                <Text size="xs" fw={500}>
                  Status: {slot.current_status}
                </Text>
                <Text size="xs" fw={500}>
                  Available: {slot.is_available ? 'Yes' : 'No'}
                </Text>
              </Stack>
            }
            withArrow
            disabled={isDisabled(slot)}
          >
            <Paper
              p={{ base: 'xs', sm: 'sm' }}
              withBorder
              className="hover-lift"
              style={{
                cursor: isDisabled(slot) ? 'not-allowed' : 'pointer',
                opacity: isPastSlot ? 0.3 : isDisabled(slot) ? 0.6 : 1,
                borderWidth: safeSelectedSlots.includes(slot.slot_hour) ? 3 : 2,
                borderColor: safeSelectedSlots.includes(slot.slot_hour)
                  ? '#1A1A1A'
                  : isPastSlot
                  ? '#EF4444'
                  : slot.current_status === 'pending'
                  ? '#f59e0b'
                  : slot.is_available
                  ? '#F5B800'
                  : '#9E9E9E',
                borderStyle: slot.current_status === 'pending' ? 'dashed' : 'solid',
                backgroundColor: safeSelectedSlots.includes(slot.slot_hour)
                  ? '#F5B800'
                  : slot.is_available && !isPastSlot
                  ? 'white'
                  : '#F5F5F5',
                transition: 'all 200ms ease',
                transform: safeSelectedSlots.includes(slot.slot_hour) ? 'scale(1.05)' : 'scale(1)',
                minHeight: 'clamp(72px, 15vw, 88px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: safeSelectedSlots.includes(slot.slot_hour) ? '0 4px 12px rgba(245, 184, 0, 0.3)' : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
              onClick={() => {
                if (!isDisabled(slot)) {
                  onSlotToggle(slot.slot_hour);
                }
              }}
            >
              <Stack gap={4} align="center">
                <Group gap={4} justify="center">
                  <IconClock size={14} color={safeSelectedSlots.includes(slot.slot_hour) ? '#1A1A1A' : '#4A4A4A'} />
                  {isNightSlot(slot.slot_hour) && (
                    <Text size="xs">🌙</Text>
                  )}
                </Group>
                <Text
                  size={{ base: 'xs', sm: 'sm' }}
                  fw={safeSelectedSlots.includes(slot.slot_hour) ? 900 : 600}
                  ta="center"
                  c={safeSelectedSlots.includes(slot.slot_hour) ? '#1A1A1A' : '#1A1A1A'}
                  style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)' }}
                >
                  {formatTimeDisplay(slot.slot_hour)}
                </Text>
                <Badge
                  size="xs"
                  color={getSlotColor(slot)}
                  variant={getSlotVariant(slot)}
                  fullWidth
                  style={{
                    background: safeSelectedSlots.includes(slot.slot_hour) 
                      ? '#1A1A1A' 
                      : isPastSlot 
                      ? '#FEE2E2' 
                      : undefined,
                    color: safeSelectedSlots.includes(slot.slot_hour) 
                      ? 'white' 
                      : isPastSlot 
                      ? '#7F1D1D' 
                      : undefined,
                  }}
                >
                  {safeSelectedSlots.includes(slot.slot_hour)
                    ? '✓'
                    : isPastSlot
                    ? 'Past'
                    : slot.is_available
                    ? 'Free'
                    : slot.current_status === 'pending'
                    ? 'Pending'
                    : 'Booked'}
                </Badge>
              </Stack>
            </Paper>
          </Tooltip>
        );})}
      </SimpleGrid>

      {/* Selection Summary */}
      {safeSelectedSlots.length > 0 && (
        <Paper 
          p={{ base: "sm", sm: "md" }} 
          withBorder 
          style={{ background: '#FFECB3', borderColor: '#F5B800', borderWidth: '2px' }} 
          className="animate-slide-up"
        >
          <Stack gap="xs">
            <Text size={{ base: 'xs', sm: 'sm' }} fw={700} c="#1A1A1A">
              ✓ Selected Time Slots:
            </Text>
            <Group gap="xs">
              {safeSelectedSlots
                .sort((a, b) => a - b)
                .map((hour) => {
                  const slot = processedSlots.find((s) => s.slot_hour === hour);
                  return (
                    <Badge
                      key={hour}
                      size={{ base: 'md', sm: 'lg' }}
                      style={{ background: '#1A1A1A', color: '#F5B800', cursor: 'pointer' }}
                      onClick={() => onSlotToggle(hour)}
                    >
                      {formatTimeDisplay(hour)}
                      {isNightSlot(hour) && ' 🌙'}
                      <Text component="span" ml={4} size="xs">
                        ✕
                      </Text>
                    </Badge>
                  );
                })}
            </Group>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
