/**
 * Admin Calendar Page
 * 
 * Purpose: Interactive calendar view of all bookings
 * Features:
 * - Month, week, day views
 * - Color-coded by status
 * - Click to view booking details
 * - Filter by status
 * - Auto-refresh on approval/rejection
 * - High performance with optimized queries
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Title,
  Stack,
  Group,
  Paper,
  Select,
  Badge,
  Button,
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import { IconCalendar, IconFilter, IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core';
import BookingDetailsModal from '@/components/BookingDetailsModal';

export default function AdminCalendarPage() {
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchCalendarEvents();
  }, [statusFilter, dateRange]);

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/calendar?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar data');
      }

      const result = await response.json();
      setEvents(result.events || []);
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setError('Failed to load calendar data');
      notifications.show({
        title: 'Error',
        message: 'Failed to load calendar data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const bookingId = clickInfo.event.extendedProps.bookingId;
    setSelectedBookingId(bookingId);
    setModalOpened(true);
  };

  const handleDatesSet = (dateInfo: DatesSetArg) => {
    // Update date range when calendar view changes
    setDateRange({
      start: dateInfo.startStr.split('T')[0],
      end: dateInfo.endStr.split('T')[0],
    });
  };

  const handleModalSuccess = () => {
    // Refresh calendar after approval/rejection
    fetchCalendarEvents();
  };

  const handleRefresh = () => {
    fetchCalendarEvents();
    notifications.show({
      title: 'Refreshed',
      message: 'Calendar data updated',
      color: 'blue',
    });
  };

  const eventContent = (eventInfo: any) => {
    const props = eventInfo.event.extendedProps;
    return (
      <div style={{ padding: '2px 4px', overflow: 'hidden' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {props.customerName}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.9 }}>
          {eventInfo.timeText}
          {props.isNightRate && ' 🌙'}
        </div>
      </div>
    );
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Calendar</Title>
            <Group gap="xs" mt="xs">
              <IconCalendar size={16} />
              <Badge size="lg" variant="light">
                {events.length} bookings
              </Badge>
            </Group>
          </div>

          <Group gap="md">
            <Select
              placeholder="Filter by status"
              leftSection={<IconFilter size={18} />}
              data={[
                { value: '', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'completed', label: 'Completed' },
              ]}
              value={statusFilter || ''}
              onChange={(value) => setStatusFilter(value || null)}
              clearable
              w={200}
            />
            <Button
              variant="light"
              leftSection={<IconRefresh size={18} />}
              onClick={handleRefresh}
              loading={loading}
            >
              Refresh
            </Button>
          </Group>
        </Group>

        {/* Legend */}
        <Paper withBorder p="sm">
          <Group gap="lg">
            <Group gap="xs">
              <div
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#fd7e14',
                  borderRadius: 4,
                }}
              />
              <Badge color="orange" variant="light">
                Pending
              </Badge>
            </Group>
            <Group gap="xs">
              <div
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#40c057',
                  borderRadius: 4,
                }}
              />
              <Badge color="green" variant="light">
                Approved
              </Badge>
            </Group>
            <Group gap="xs">
              <div
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#228be6',
                  borderRadius: 4,
                }}
              />
              <Badge color="blue" variant="light">
                Completed
              </Badge>
            </Group>
            <Badge variant="light">🌙 Night Rate</Badge>
          </Group>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {/* Calendar */}
        <Paper withBorder p="md" radius="md" pos="relative" style={{ minHeight: '600px' }}>
          <LoadingOverlay visible={loading} />
          
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={events}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            eventContent={eventContent}
            height="auto"
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            allDaySlot={false}
            nowIndicator={true}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }}
            slotLabelFormat={{
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }}
            eventDisplay="block"
            displayEventTime={true}
            displayEventEnd={false}
            eventMaxStack={3}
            dayMaxEvents={true}
            moreLinkClick="popover"
            navLinks={true}
            selectable={false}
            selectMirror={true}
            weekends={true}
            editable={false}
            droppable={false}
          />
        </Paper>
      </Stack>

      {/* Booking Details Modal */}
      {selectedBookingId && (
        <BookingDetailsModal
          bookingId={selectedBookingId}
          opened={modalOpened}
          onClose={() => {
            setModalOpened(false);
            setSelectedBookingId(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </Container>
  );
}
