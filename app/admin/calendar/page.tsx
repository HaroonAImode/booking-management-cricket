/**
 * Admin Calendar Page - Mobile Optimized
 * 
 * Purpose: Interactive calendar view of all bookings with mobile-first design
 * Features:
 * - Calendar view first (default on mobile)
 * - Professional, compact event display with full names and times
 * - Month/Week/Day view buttons on mobile
 * - Improved week view with proper time slots
 * - Proper start and end times for each booking
 * - Collapsible list view option
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
  SegmentedControl,
  Modal,
  useMantineTheme,
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
  IconList,
  IconCalendarMonth,
  IconCalendarWeek,
  IconCalendarEvent,
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
  const [mobileView, setMobileView] = useState<'calendar' | 'list'>('calendar');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [eventModalOpened, setEventModalOpened] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const theme = useMantineTheme();

  useEffect(() => {
    fetchCalendarEvents();
  }, [statusFilter, dateRange]);

  useEffect(() => {
    if (calendarRef.current && calendarRef.current.getApi) {
      const calendarApi = calendarRef.current.getApi();
      
      switch (calendarView) {
        case 'month':
          calendarApi.changeView('dayGridMonth');
          break;
        case 'week':
          calendarApi.changeView('timeGridWeek');
          break;
        case 'day':
          calendarApi.changeView('timeGridDay');
          break;
      }
    }
  }, [calendarView]);

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
      
      // Update quick filters based on fetched events
      const statuses = new Set<string>();
      result.events?.forEach((event: any) => {
        statuses.add(event.extendedProps.status);
      });
      setQuickFilters(Array.from(statuses));
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
    const eventData = clickInfo.event;
    if (isMobile) {
      // On mobile, show a modal with full details
      setSelectedEvent({
        id: eventData.id,
        title: eventData.title,
        start: eventData.start,
        end: eventData.end,
        extendedProps: eventData.extendedProps,
      });
      setEventModalOpened(true);
    } else {
      // On desktop, show the full booking details modal
      const bookingId = eventData.extendedProps.bookingId;
      setSelectedBookingId(bookingId);
      setModalOpened(true);
    }
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

  // Format time range for display
  const formatTimeRange = (start: Date, end: Date) => {
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };
    
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  // Mobile-optimized event content - COMPACT AND PROFESSIONAL
  const eventContent = (eventInfo: any) => {
    const props = eventInfo.event.extendedProps;
    const startTime = eventInfo.event.start;
    const endTime = eventInfo.event.end;
    const timeRange = formatTimeRange(startTime, endTime);
    const isNightRate = props.isNightRate || props.nightRate;
    
    if (isMobile && calendarView === 'month') {
      // Ultra-compact month view for mobile
      return (
        <Box 
          p={1}
          style={{ 
            overflow: 'hidden',
            fontSize: '9px',
            lineHeight: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '1px 2px',
          }}
        >
          <Text 
            size="9px" 
            fw={600} 
            lineClamp={1} 
            style={{ 
              color: 'white',
              letterSpacing: '-0.1px',
            }}
          >
            {props.customerName?.split(' ')[0] || 'Customer'}
          </Text>
          <Text 
            size="8px" 
            fw={500} 
            lineClamp={1}
            style={{ 
              color: 'rgba(255, 255, 255, 0.95)',
              letterSpacing: '-0.1px',
            }}
          >
            {timeRange.split(' - ')[0]}
            {isNightRate && ' 🌙'}
          </Text>
        </Box>
      );
    }

    if (isMobile && (calendarView === 'week' || calendarView === 'day')) {
      // More detailed view for week/day on mobile
      return (
        <Box 
          p={2}
          style={{ 
            overflow: 'hidden',
            fontSize: '10px',
            lineHeight: 1.1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            padding: '2px 3px',
          }}
        >
          <Text 
            size="10px" 
            fw={700} 
            lineClamp={1}
            style={{ 
              color: 'white',
              letterSpacing: '-0.1px',
            }}
          >
            {props.customerName || 'Customer'}
          </Text>
          <Group gap={1} wrap="nowrap">
            <IconClock size={8} style={{ minWidth: '8px', color: 'rgba(255, 255, 255, 0.9)' }} />
            <Text 
              size="9px" 
              fw={500} 
              lineClamp={1}
              style={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: '-0.1px',
              }}
            >
              {timeRange}
              {isNightRate && ' 🌙'}
            </Text>
          </Group>
        </Box>
      );
    }

    // Desktop view
    return (
      <Box 
        p={4} 
        style={{ 
          overflow: 'hidden',
          fontSize: '12px',
          lineHeight: 1.2,
          padding: '4px 6px',
        }}
      >
        <Text 
          size="sm" 
          fw={600} 
          lineClamp={1} 
          style={{ 
            color: 'white',
            marginBottom: '2px',
            fontSize: '12px',
          }}
        >
          {props.customerName || 'Customer'}
        </Text>
        <Text 
          size="xs" 
          fw={500} 
          lineClamp={1}
          style={{ 
            color: 'rgba(255, 255, 255, 0.95)',
            marginBottom: '2px',
            fontSize: '10px',
          }}
        >
          {timeRange}
          {isNightRate && ' 🌙'}
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

  const handleQuickFilter = (status: string) => {
    setStatusFilter(statusFilter === status ? null : status);
  };

  const eventsByDate = getEventsByDate();
  const sortedDates = Object.keys(eventsByDate).sort();

  return (
    <Container 
      size={isMobile ? "xs" : isTablet ? "md" : "xl"} 
      py={{ base: 'xs', sm: 'md', md: 'xl' }}
      px={{ base: 'xs', sm: 'xs', md: 'md' }}
      style={{ paddingTop: '0px' }}
    >
      <Stack gap={{ base: 'xs', sm: 'sm', md: 'md' }}>
        {/* Header - Compact on mobile */}
        <Stack gap="xs">
          <Group justify="space-between" wrap="wrap" gap="xs">
            <div style={{ flex: 1, minWidth: 0 }}>
              <Title order={isMobile ? 3 : 2} size={isMobile ? 'h3' : 'h2'}>
                Calendar
              </Title>
              <Group gap="xs" mt={4}>
                <IconCalendar size={isMobile ? 14 : 16} />
                <Badge size={isMobile ? "xs" : "sm"} variant="light" color="yellow">
                  {events.length} bookings
                </Badge>
              </Group>
            </div>

            <Group gap="xs">
              <Button
                variant="light"
                size={isMobile ? "xs" : "sm"}
                leftSection={<IconRefresh size={14} />}
                onClick={handleRefresh}
                loading={loading}
              >
                {!isMobile && 'Refresh'}
              </Button>
              
              {/* Mobile View Toggle */}
              {isMobile && (
                <Button
                  variant={mobileView === 'list' ? 'filled' : 'light'}
                  size="xs"
                  onClick={() => setMobileView(mobileView === 'list' ? 'calendar' : 'list')}
                  leftSection={mobileView === 'list' ? <IconCalendar size={14} /> : <IconList size={14} />}
                >
                  {mobileView === 'list' ? 'Calendar' : 'List'}
                </Button>
              )}
            </Group>
          </Group>

          {/* Quick Status Filters */}
          {quickFilters.length > 0 && (
            <ScrollArea type="hover" scrollbars="x">
              <Group gap="xs" wrap="nowrap" style={{ padding: '2px 0' }}>
                <Text size="xs" fw={500} c="dimmed">Filters:</Text>
                <Button
                  size="xs"
                  variant={statusFilter === null ? 'filled' : 'light'}
                  onClick={() => setStatusFilter(null)}
                >
                  All
                </Button>
                {quickFilters.map((status) => (
                  <Button
                    key={status}
                    size="xs"
                    variant={statusFilter === status ? 'filled' : 'light'}
                    color={getStatusColor(status)}
                    onClick={() => handleQuickFilter(status)}
                  >
                    {status}
                  </Button>
                ))}
              </Group>
            </ScrollArea>
          )}

          {/* Calendar View Controls - ALWAYS VISIBLE ON MOBILE */}
          {isMobile && mobileView === 'calendar' && (
            <SegmentedControl
              size="xs"
              fullWidth
              value={calendarView}
              onChange={(value: 'month' | 'week' | 'day') => setCalendarView(value)}
              data={[
                {
                  value: 'month',
                  label: (
                    <Group gap={4}>
                      <IconCalendarMonth size={14} />
                      <Text size="xs">Month</Text>
                    </Group>
                  ),
                },
                {
                  value: 'week',
                  label: (
                    <Group gap={4}>
                      <IconCalendarWeek size={14} />
                      <Text size="xs">Week</Text>
                    </Group>
                  ),
                },
                {
                  value: 'day',
                  label: (
                    <Group gap={4}>
                      <IconCalendarEvent size={14} />
                      <Text size="xs">Day</Text>
                    </Group>
                  ),
                },
              ]}
            />
          )}

          {/* Status Filter Select */}
          {!isMobile && (
            <Select
              placeholder="Filter by status"
              leftSection={<IconFilter size={16} />}
              data={[
                { value: '', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter || ''}
              onChange={(value) => setStatusFilter(value || null)}
              clearable
              size="sm"
              style={{ maxWidth: '200px' }}
            />
          )}
        </Stack>

        {/* Legend - Ultra Compact on Mobile */}
        <Paper withBorder p={isMobile ? "xs" : "sm"} radius="md">
          <Group gap={isMobile ? "xs" : "sm"} wrap="nowrap">
            <Text size={isMobile ? "xs" : "sm"} fw={500}>Legend:</Text>
            <Group gap={4}>
              <div style={{ width: 12, height: 12, backgroundColor: '#fd7e14', borderRadius: 3 }} />
              <Text size={isMobile ? "xs" : "sm"}>Pending</Text>
            </Group>
            <Group gap={4}>
              <div style={{ width: 12, height: 12, backgroundColor: '#40c057', borderRadius: 3 }} />
              <Text size={isMobile ? "xs" : "sm"}>Approved</Text>
            </Group>
            <Group gap={4}>
              <div style={{ width: 12, height: 12, backgroundColor: '#228be6', borderRadius: 3 }} />
              <Text size={isMobile ? "xs" : "sm"}>Completed</Text>
            </Group>
            <Text size={isMobile ? "xs" : "sm"}>🌙 Night</Text>
          </Group>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" size="sm">
            {error}
          </Alert>
        )}

        {/* Mobile List View or Calendar View */}
        {isMobile && mobileView === 'list' ? (
          <Stack gap="xs">
            {sortedDates.length === 0 && !loading && (
              <Paper p="xl" withBorder radius="md">
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
                <Card key={dateKey} withBorder radius="md" shadow="xs">
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
                        size="sm"
                        onClick={() => toggleDateExpansion(dateKey)}
                      >
                        {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                      </ActionIcon>
                    )}
                  </Group>

                  <Divider mb="xs" />

                  {/* Bookings List */}
                  <Stack gap="xs">
                    {dateEvents.slice(0, displayCount).map((event, idx) => {
                      const timeRange = formatTimeRange(new Date(event.start), new Date(event.end));
                      
                      return (
                        <Paper
                          key={idx}
                          p="xs"
                          withBorder
                          radius="sm"
                          style={{
                            borderLeft: `4px solid ${event.backgroundColor}`,
                            cursor: 'pointer',
                            backgroundColor: theme.colors.gray[0],
                          }}
                          onClick={() => {
                            setSelectedEvent({
                              id: event.id,
                              title: event.title,
                              start: event.start,
                              end: event.end,
                              extendedProps: event.extendedProps,
                            });
                            setEventModalOpened(true);
                          }}
                        >
                          <Group justify="space-between" wrap="nowrap">
                            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                              <Group gap="xs" wrap="nowrap">
                                <IconUser size={14} />
                                <Text size="sm" fw={600} lineClamp={1}>
                                  {event.extendedProps.customerName}
                                </Text>
                              </Group>
                              
                              <Group gap="xs" wrap="nowrap">
                                <IconClock size={12} />
                                <Text size="xs" c="dimmed" lineClamp={1}>
                                  {timeRange}
                                  {event.extendedProps.nightRate && ' 🌙'}
                                </Text>
                              </Group>
                            </Stack>

                            <Badge
                              size="xs"
                              color={getStatusColor(event.extendedProps.status)}
                              variant="light"
                            >
                              {event.extendedProps.status}
                            </Badge>
                          </Group>
                        </Paper>
                      );
                    })}

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
          // Calendar View (Default on mobile)
          <Paper 
            withBorder 
            p={isMobile ? "xs" : isTablet ? "sm" : "md"} 
            radius="md" 
            pos="relative" 
            style={{ 
              minHeight: isMobile ? '450px' : '600px',
              backgroundColor: 'white',
              overflow: 'hidden',
            }}
          >
            <LoadingOverlay visible={loading} />
            
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={isMobile ? "dayGridMonth" : "dayGridMonth"}
              headerToolbar={{
                left: isMobile ? 'prev,next' : 'prev,next today',
                center: 'title',
                right: isMobile ? '' : 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={events}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              eventContent={eventContent}
              height="auto"
              slotMinTime="06:00:00"
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
                omitZeroMinute: false,
              }}
              slotLabelInterval="01:00"
              slotDuration="01:00:00"
              slotEventOverlap={false}
              eventDisplay="block"
              displayEventTime={true}
              displayEventEnd={true}
              eventMaxStack={isMobile ? 2 : isTablet ? 3 : 4}
              dayMaxEvents={isMobile ? 4 : true}
              moreLinkText={isMobile ? "+more" : "more"}
              moreLinkClick="popover"
              navLinks={!isMobile}
              selectable={false}
              selectMirror={true}
              weekends={true}
              editable={false}
              droppable={false}
              dayHeaderFormat={isMobile ? { weekday: 'short' } : { weekday: 'long' }}
              dayCellContent={(args) => {
                // Compact day numbers on mobile
                return (
                  <div style={{ 
                    fontSize: isMobile ? '11px' : '14px',
                    fontWeight: 600,
                    padding: isMobile ? '2px' : '4px',
                  }}>
                    {args.dayNumberText}
                  </div>
                );
              }}
              eventClassNames="calendar-event"
              eventBorderColor="transparent"
              // Improved week view settings
              slotLabelClassNames="calendar-slot-label"
              dayHeaderClassNames="calendar-day-header"
              // Set scroll time to 8 AM
              scrollTime="08:00:00"
            />
          </Paper>
        )}
      </Stack>

      {/* Event Details Modal for Mobile */}
      <Modal
        opened={eventModalOpened}
        onClose={() => setEventModalOpened(false)}
        title="Booking Details"
        size="md"
        centered
        padding="md"
      >
        {selectedEvent && (
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text fw={700} size="lg">
                  {selectedEvent.extendedProps.customerName}
                </Text>
                <Text size="sm" c="dimmed">
                  {selectedEvent.extendedProps.customerPhone}
                </Text>
              </div>
              <Badge
                size="lg"
                color={getStatusColor(selectedEvent.extendedProps.status)}
              >
                {selectedEvent.extendedProps.status}
              </Badge>
            </Group>
            
            <Divider />
            
            <Stack gap="xs">
              <Group>
                <IconCalendar size={16} />
                <Text size="sm">
                  {new Date(selectedEvent.start).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </Group>
              
              <Group>
                <IconClock size={16} />
                <Text size="sm">
                  {formatTimeRange(new Date(selectedEvent.start), new Date(selectedEvent.end))}
                  {selectedEvent.extendedProps.nightRate && ' 🌙 (Night Rate)'}
                </Text>
              </Group>
              
              <Group>
                <Badge variant="light" color="green">
                  Booking #: {selectedEvent.extendedProps.bookingNumber}
                </Badge>
              </Group>
            </Stack>
            
            <Divider />
            
            <Group justify="right">
              <Button
                variant="light"
                color="blue"
                onClick={() => {
                  setSelectedBookingId(selectedEvent.extendedProps.bookingId);
                  setEventModalOpened(false);
                  setModalOpened(true);
                }}
              >
                Full Details & Actions
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Full Booking Details Modal */}
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