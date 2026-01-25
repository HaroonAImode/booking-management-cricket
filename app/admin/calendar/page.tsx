/**
 * Admin Calendar Page - Mobile Optimized
 * 
 * Purpose: Interactive calendar view of all bookings with mobile-first design
 * Features:
 * - Responsive calendar with mobile-optimized views
 * - Collapsible booking cards for multiple bookings per day
 * - Touch-friendly interactions
 * - Color-coded by status
 * - Click to view booking details
 * - Filter by status
 * - Auto-refresh on approval/rejection
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
  Text,
  Box,
  Collapse,
  ActionIcon,
  ScrollArea,
  Card,
  Divider,
} from '@mantine/core';
import { 
  IconCalendar, 
  IconFilter, 
  IconRefresh, 
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconUser,
  IconCurrencyRupee,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useMediaQuery } from '@mantine/hooks';
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
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [mobileView, setMobileView] = useState<'list' | 'calendar'>('list');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

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
    setDateRange({
      start: dateInfo.startStr.split('T')[0],
      end: dateInfo.endStr.split('T')[0],
    });
  };

  const handleModalSuccess = () => {
    fetchCalendarEvents();
  };

  const handleRefresh = () => {
    fetchCalendarEvents();
    notifications.show({
      title: '✅ Refreshed',
      message: 'Calendar data updated',
      color: 'green',
    });
  };

  const toggleDateExpansion = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  // Mobile-optimized event content
  const eventContent = (eventInfo: any) => {
    const props = eventInfo.event.extendedProps;
    
    if (isMobile) {
      return (
        <Box 
          p={4}
          style={{ 
            overflow: 'hidden',
            fontSize: '11px',
            lineHeight: 1.2,
          }}
        >
          <Text size="xs" fw={600} lineClamp={1} style={{ color: 'white' }}>
            {props.customerName}
          </Text>
          <Text size="xs" fw={500} style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
            {eventInfo.timeText} {props.isNightRate && '🌙'}
          </Text>
        </Box>
      );
    }

    return (
      <Box p={6} style={{ overflow: 'hidden' }}>
        <Text size="sm" fw={600} lineClamp={1} style={{ color: 'white' }}>
          {props.customerName}
        </Text>
        <Text size="xs" fw={500} style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          {eventInfo.timeText}
          {props.isNightRate && ' 🌙'}
        </Text>
      </Box>
    );
  };

  // Group events by date for mobile list view
  const getEventsByDate = () => {
    const grouped: Record<string, any[]> = {};
    
    events.forEach(event => {
      const dateKey = event.start.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    // Sort each date's events by start time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.start.localeCompare(b.start));
    });

    return grouped;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'completed': return 'blue';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const eventsByDate = getEventsByDate();
  const sortedDates = Object.keys(eventsByDate).sort();

  return (
    <Container 
      size={isMobile ? "xs" : isTablet ? "md" : "xl"} 
      py={{ base: 'sm', sm: 'md', md: 'xl' }}
      px={{ base: 'xs', sm: 'sm', md: 'md' }}
    >
      <Stack gap={{ base: 'sm', sm: 'md', md: 'xl' }}>
        {/* Header */}
        <Stack gap="xs">
          <Group justify="space-between" wrap="wrap">
            <div>
              <Title order={isMobile ? 2 : 1} size={isMobile ? 'h2' : 'h1'}>
                Calendar
              </Title>
              <Group gap="xs" mt="xs">
                <IconCalendar size={isMobile ? 14 : 16} />
                <Badge size={isMobile ? "sm" : "md"} variant="light">
                  {events.length} bookings
                </Badge>
              </Group>
            </div>

            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={handleRefresh}
              loading={loading}
              size={isMobile ? "sm" : "md"}
            >
              {isMobile ? '' : 'Refresh'}
            </Button>
          </Group>

          {/* Filters */}
          <Group gap="xs">
            <Select
              placeholder="Filter by status"
              leftSection={<IconFilter size={16} />}
              data={[
                { value: '', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'completed', label: 'Completed' },
              ]}
              value={statusFilter || ''}
              onChange={(value) => setStatusFilter(value || null)}
              clearable
              size={isMobile ? "sm" : "md"}
              style={{ flex: 1 }}
            />
            
            {/* Mobile View Toggle */}
            {isMobile && (
              <Button
                variant={mobileView === 'calendar' ? 'filled' : 'light'}
                size="sm"
                onClick={() => setMobileView(mobileView === 'list' ? 'calendar' : 'list')}
                leftSection={<IconCalendar size={16} />}
              >
                {mobileView === 'list' ? 'Calendar' : 'List'}
              </Button>
            )}
          </Group>
        </Stack>

        {/* Legend - Compact on mobile */}
        <Paper withBorder p={isMobile ? "xs" : "sm"}>
          <ScrollArea>
            <Group gap={isMobile ? "xs" : "md"} wrap="nowrap">
              <Group gap={4}>
                <div style={{ width: 16, height: 16, backgroundColor: '#fd7e14', borderRadius: 4 }} />
                <Text size={isMobile ? "xs" : "sm"}>Pending</Text>
              </Group>
              <Group gap={4}>
                <div style={{ width: 16, height: 16, backgroundColor: '#40c057', borderRadius: 4 }} />
                <Text size={isMobile ? "xs" : "sm"}>Approved</Text>
              </Group>
              <Group gap={4}>
                <div style={{ width: 16, height: 16, backgroundColor: '#228be6', borderRadius: 4 }} />
                <Text size={isMobile ? "xs" : "sm"}>Completed</Text>
              </Group>
              <Text size={isMobile ? "xs" : "sm"}>🌙 Night</Text>
            </Group>
          </ScrollArea>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {/* Mobile List View or Desktop Calendar */}
        {isMobile && mobileView === 'list' ? (
          <Stack gap="xs">
            {sortedDates.length === 0 && !loading && (
              <Paper p="xl" withBorder>
                <Text ta="center" c="dimmed">
                  No bookings found
                </Text>
              </Paper>
            )}
            
            {sortedDates.map(dateKey => {
              const dateEvents = eventsByDate[dateKey];
              const isExpanded = expandedDates.has(dateKey);
              const displayCount = isExpanded ? dateEvents.length : 3;
              const hasMore = dateEvents.length > 3;

              return (
                <Card key={dateKey} withBorder shadow="sm">
                  {/* Date Header */}
                  <Group justify="space-between" mb="xs">
                    <div>
                      <Text fw={700} size="sm">
                        {formatDate(dateKey)}
                      </Text>
                      <Badge size="xs" variant="light">
                        {dateEvents.length} booking{dateEvents.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    {hasMore && (
                      <ActionIcon
                        variant="subtle"
                        onClick={() => toggleDateExpansion(dateKey)}
                      >
                        {isExpanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                      </ActionIcon>
                    )}
                  </Group>

                  <Divider mb="xs" />

                  {/* Bookings List */}
                  <Stack gap="xs">
                    {dateEvents.slice(0, displayCount).map((event, idx) => (
                      <Paper
                        key={idx}
                        p="xs"
                        withBorder
                        style={{
                          borderLeft: `4px solid ${event.backgroundColor}`,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setSelectedBookingId(event.extendedProps.bookingId);
                          setModalOpened(true);
                        }}
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                            <Group gap="xs">
                              <IconUser size={14} />
                              <Text size="sm" fw={600} lineClamp={1}>
                                {event.extendedProps.customerName}
                              </Text>
                            </Group>
                            
                            <Group gap="xs">
                              <IconClock size={12} />
                              <Text size="xs" c="dimmed">
                                {new Date(event.start).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                                {event.extendedProps.isNightRate && ' 🌙'}
                              </Text>
                            </Group>

                            {event.extendedProps.totalAmount && (
                              <Group gap="xs">
                                <IconCurrencyRupee size={12} />
                                <Text size="xs" c="dimmed">
                                  ₹{event.extendedProps.totalAmount}
                                </Text>
                              </Group>
                            )}
                          </Stack>

                          <Badge
                            size="sm"
                            color={getStatusColor(event.extendedProps.status)}
                            variant="light"
                          >
                            {event.extendedProps.status}
                          </Badge>
                        </Group>
                      </Paper>
                    ))}

                    {hasMore && !isExpanded && (
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => toggleDateExpansion(dateKey)}
                        fullWidth
                      >
                        Show {dateEvents.length - 3} more booking{dateEvents.length - 3 !== 1 ? 's' : ''}
                      </Button>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        ) : (
          // Calendar View (Desktop or Mobile Calendar Mode)
          <Paper 
            withBorder 
            p={isMobile ? "xs" : isTablet ? "sm" : "md"} 
            radius="md" 
            pos="relative" 
            style={{ minHeight: isMobile ? '400px' : '600px' }}
          >
            <LoadingOverlay visible={loading} />
            
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={isMobile ? "listWeek" : "dayGridMonth"}
              headerToolbar={{
                left: isMobile ? 'prev,next' : 'prev,next today',
                center: 'title',
                right: isMobile ? '' : isTablet ? 'dayGridMonth,listWeek' : 'dayGridMonth,timeGridWeek,timeGridDay',
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
              eventMaxStack={isMobile ? 1 : isTablet ? 2 : 3}
              dayMaxEvents={true}
              moreLinkClick="popover"
              navLinks={!isMobile}
              selectable={false}
              selectMirror={true}
              weekends={true}
              editable={false}
              droppable={false}
            />
          </Paper>
        )}
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
