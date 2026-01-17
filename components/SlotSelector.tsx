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
    if (selectedSlots.includes(slot.slot_hour)) return 'yellow';
    if (slot.current_status === 'booked') return 'gray';
    if (slot.current_status === 'pending') return 'orange';
    return 'yellow';
  };

  const getSlotVariant = (slot: SlotInfo) => {
    if (selectedSlots.includes(slot.slot_hour)) return 'filled';
    if (slot.is_available) return 'outline';
    return 'light';
  };

  const getSlotLabel = (slot: SlotInfo) => {
    if (slot.current_status === 'booked') return 'Booked';
    if (slot.current_status === 'pending') return 'Under Approval';
    return 'Available';
  };

  const isDisabled = (slot: SlotInfo) => {
    return !slot.is_available && !selectedSlots.includes(slot.slot_hour);
  };

  const isNightSlot = (hour: number) => {
    return isNightRate(hour, nightStart, nightEnd);
  };

  return (
    <Stack gap="md" className="animate-fade-in">
      {/* Header */}
      <Group justify="space-between">
        <Title order={4}>Select Time Slots</Title>
        <Text size="sm" c="dimmed">
          {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
        </Text>
      </Group>

      {/* Pricing Info */}
      <Alert icon={<IconInfoCircle size="1rem" />} color="blue" variant="light">
        <Group gap="xl">
          <Text size="sm">
            <strong>Day Rate:</strong> PKR 1,500/hr
          </Text>
          <Text size="sm">
            <strong>Night Rate:</strong> PKR 2,000/hr (5 PM - 7 AM)
          </Text>
        </Group>
      </Alert>

      {/* Legend */}
      <Group gap="xs" style={{ flexWrap: 'wrap' }}>
        <Badge size="sm" style={{ background: '#F5B800', color: '#1A1A1A', borderWidth: '2px', borderColor: '#F5B800', borderStyle: 'solid' }}>
          Available
        </Badge>
        <Badge size="sm" style={{ background: '#1A1A1A', color: '#F5B800' }}>
          Selected
        </Badge>
        <Badge size="sm" variant="light" color="orange" style={{ borderWidth: '2px', borderStyle: 'dashed' }}>
          Pending Approval
        </Badge>
        <Badge size="sm" variant="light" color="gray">
          Booked
        </Badge>
      </Group>

      {/* Warning Message */}
      <Alert icon={<IconAlertCircle size="1rem" />} color="yellow" variant="light">
        ⚠️ Please select your time slots carefully. Slots marked as "Under Approval" are waiting
        for admin confirmation and cannot be selected by others.
      </Alert>

      {/* Slot Grid */}
      <SimpleGrid
        cols={{ base: 3, xs: 4, sm: 6, md: 8 }}
        spacing="xs"
        verticalSpacing="xs"
      >
        {availableSlots.map((slot) => (
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
              p="xs"
              withBorder
              className="hover-lift"
              style={{
                cursor: isDisabled(slot) ? 'not-allowed' : 'pointer',
                opacity: isDisabled(slot) ? 0.5 : 1,
                borderWidth: selectedSlots.includes(slot.slot_hour) ? 3 : 2,
                borderColor: selectedSlots.includes(slot.slot_hour)
                  ? '#1A1A1A'
                  : slot.current_status === 'pending'
                  ? '#f59e0b'
                  : slot.is_available
                  ? '#F5B800'
                  : '#9E9E9E',
                borderStyle: slot.current_status === 'pending' ? 'dashed' : 'solid',
                backgroundColor: selectedSlots.includes(slot.slot_hour)
                  ? '#F5B800'
                  : slot.is_available
                  ? 'white'
                  : '#F5F5F5',
                transition: 'all 200ms ease',
                transform: selectedSlots.includes(slot.slot_hour) ? 'scale(1.05)' : 'scale(1)',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: selectedSlots.includes(slot.slot_hour) ? '0 4px 12px rgba(245, 184, 0, 0.3)' : 'none',
              }}
              onClick={() => {
                if (!isDisabled(slot)) {
                  onSlotToggle(slot.slot_hour);
                }
              }}
            >
              <Stack gap={4} align="center">
                <Group gap={4} justify="center">
                  <IconClock size={14} color={selectedSlots.includes(slot.slot_hour) ? '#1A1A1A' : '#4A4A4A'} />
                  {isNightSlot(slot.slot_hour) && (
                    <Text size="xs">🌙</Text>
                  )}
                </Group>
                <Text
                  size={{ base: 'xs', sm: 'sm' }}
                  fw={selectedSlots.includes(slot.slot_hour) ? 900 : 600}
                  ta="center"
                  c={selectedSlots.includes(slot.slot_hour) ? '#1A1A1A' : '#1A1A1A'}
                >
                  {formatTimeDisplay(slot.slot_hour)}
                </Text>
                <Badge
                  size="xs"
                  color={getSlotColor(slot)}
                  variant={getSlotVariant(slot)}
                  fullWidth
                  style={{
                    background: selectedSlots.includes(slot.slot_hour) ? '#1A1A1A' : undefined,
                    color: selectedSlots.includes(slot.slot_hour) ? 'white' : undefined,
                  }}
                >
                  {selectedSlots.includes(slot.slot_hour)
                    ? '✓'
                    : slot.is_available
                    ? 'Free'
                    : slot.current_status === 'pending'
                    ? 'Pending'
                    : 'Booked'}
                </Badge>
              </Stack>
            </Paper>
          </Tooltip>
        ))}
      </SimpleGrid>

      {/* Selection Summary */}
      {selectedSlots.length > 0 && (
        <Paper p="md" withBorder style={{ background: '#FFECB3', borderColor: '#F5B800', borderWidth: '2px' }} className="animate-slide-up">
          <Stack gap="xs">
            <Text size="sm" fw={700} c="#1A1A1A">
              ✓ Selected Time Slots:
            </Text>
            <Group gap="xs">
              {selectedSlots
                .sort((a, b) => a - b)
                .map((hour) => {
                  const slot = availableSlots.find((s) => s.slot_hour === hour);
                  return (
                    <Badge
                      key={hour}
                      size="lg"
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
