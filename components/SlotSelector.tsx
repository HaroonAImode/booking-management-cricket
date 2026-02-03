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

  // DEBUG: Log what we receive
  useEffect(() => {
    console.log('🔍 SlotSelector DEBUG:', {
      selectedDate,
      availableSlotsCount: availableSlots?.length,
      loading,
      error,
      sampleSlots: availableSlots?.slice(0, 5)
    });
    
    if (availableSlots && availableSlots.length > 0) {
      // Check how many are available vs pending vs booked
      const availableCount = availableSlots.filter(s => s.is_available).length;
      const pendingCount = availableSlots.filter(s => s.current_status === 'pending').length;
      const bookedCount = availableSlots.filter(s => s.current_status === 'booked').length;
      
      console.log('📊 Slot Status Summary:', {
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
          console.log('📅 Today\'s slots (17-22):', 
            availableSlots
              .filter(s => s.slot_hour >= 17 && s.slot_hour <= 22)
              .map(s => `${s.slot_hour}: ${s.current_status} (available: ${s.is_available})`)
          );
        }
      }
    }
  }, [availableSlots, loading, error, selectedDate]);

  // Ensure selectedSlots is always an array
  const safeSelectedSlots = Array.isArray(selectedSlots) ? selectedSlots : [];

  // Generate all 24 slots (0-23)
  const generateAllSlots = (): SlotInfo[] => {
    const allSlots: SlotInfo[] = [];
    const now = new Date();
    
    // Ensure selectedDate is a valid Date object
    const dateObj = selectedDate instanceof Date ? selectedDate : selectedDate ? new Date(selectedDate) : null;
    
    const isToday = dateObj && 
      dateObj.getDate() === now.getDate() &&
      dateObj.getMonth() === now.getMonth() &&
      dateObj.getFullYear() === now.getFullYear();
    const currentHour = now.getHours();

    for (let hour = 0; hour < 24; hour++) {
      // Find if this slot exists in available slots data
      const existingSlot = availableSlots?.find(s => s.slot_hour === hour);
      
      // For today, check if this hour has passed
      const isPast = isToday && hour < currentHour;
      
      if (existingSlot) {
        // Use existing slot data but override availability if it's in the past
        allSlots.push({
          ...existingSlot,
          is_available: isPast ? false : existingSlot.is_available,
          is_past: isPast || undefined,
        });
      } else {
        // Create a slot entry for hours not returned by the API
        const nightRate = isNightRate(hour, nightStart, nightEnd);
        allSlots.push({
          slot_hour: hour,
          slot_time: `${hour}:00`, // Add required slot_time field
          time_display: formatTimeDisplay(hour),
          is_available: !isPast, // Available unless it's in the past
          is_night_rate: nightRate,
          hourly_rate: nightRate ? 2000 : 1500,
          current_status: 'available',
          is_past: isPast,
        } as SlotInfo);
      }
    }
    
    return allSlots;
  };

  const allSlots = generateAllSlots();

  // Update night times if available from slots data
  useEffect(() => {
    if (availableSlots && availableSlots.length > 0) {
      // Night times are embedded in the slot data logic
      // We'll use 17:00 - 07:00 as default
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

  if (!availableSlots || availableSlots.length === 0) {
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
        {allSlots.map((slot) => {
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
                  {getSlotLabel(slot)}
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
                  const slot = allSlots.find((s) => s.slot_hour === hour);
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