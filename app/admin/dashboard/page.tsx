/**
 * Admin Dashboard Page
 * 
 * Purpose: Comprehensive admin dashboard with statistics, charts, and insights
 * Features:
 * - Revenue statistics
 * - Pending approvals count
 * - Today's bookings
 * - Last 7 days performance
 * - Monthly summary
 * - Interactive charts (bookings, revenue, slot usage)
 * - Recent bookings list
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Stack,
  Paper,
  Badge,
  Table,
  Group,
  LoadingOverlay,
  Alert,
  Divider,
  Box,
  Button,
} from '@mantine/core';
import {
  IconCurrencyRupee,
  IconClockHour4,
  IconCalendarEvent,
  IconAlertCircle,
  IconTrendingUp,
  IconUsers,
  IconClock,
  IconArrowRight,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import StatCard from '@/components/dashboard/StatCard';
import DailyBookingsChart from '@/components/dashboard/DailyBookingsChart';
import RevenueChart from '@/components/dashboard/RevenueChart';
import SlotUsageChart from '@/components/dashboard/SlotUsageChart';
import { CardGridSkeleton, ChartSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import PushNotificationToggle from '@/components/PushNotificationToggle';
import { getAdminProfile } from '@/lib/supabase/auth';

interface DashboardData {
  revenue: {
    total_revenue: number;
    total_advance_received: number;
    total_remaining_payment: number;
    pending_revenue: number;
    confirmed_revenue: number;
  };
  pending_approvals: number;
  today_bookings: {
    total_bookings: number;
    total_hours: number;
    total_amount: number;
    pending_count: number;
    approved_count: number;
  };
  last_7_days: {
    total_bookings: number;
    total_revenue: number;
    total_hours: number;
    average_booking_value: number;
    approved_bookings: number;
    cancelled_bookings: number;
  };
  monthly_summary: Array<{
    month_name: string;
    total_bookings: number;
    total_revenue: number;
    total_hours: number;
    average_booking_value: number;
  }>;
  daily_bookings_chart: Array<{
    booking_date: string;
    total_bookings: number;
    pending_bookings: number;
    approved_bookings: number;
    cancelled_bookings: number;
  }>;
  daily_revenue_chart: Array<{
    booking_date: string;
    total_revenue: number;
    advance_received: number;
    remaining_payment: number;
  }>;
  slot_usage: Array<{
    slot_hour: number;
    total_bookings: number;
    is_night_slot: boolean;
    usage_percentage: number;
  }>;
  recent_bookings: Array<{
    id: string;
    booking_number: string;
    customer_name: string;
    customer_phone: string;
    booking_date: string;
    total_hours: number;
    total_amount: number;
    advance_payment: number;
    status: string;
    created_at: string;
    pending_expires_at: string | null;
    slots?: Array<{
      slot_hour: number;
      is_night_rate: boolean;
    }>;
  }>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminUser();
    fetchDashboardData();
  }, []);

  const fetchAdminUser = async () => {
    try {
      const profile = await getAdminProfile();
      if (profile) {
        setUserId(profile.id);
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
      notifications.show({
        title: '❌ Error Loading Dashboard',
        message: 'Could not load dashboard data. Please refresh the page.',
        color: 'red',
        autoClose: 5000,
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    return `Rs ${(amount ?? 0).toLocaleString()}`;
  };

  const formatSlotTime = (slot_hour: number) => {
    const hour = slot_hour % 12 || 12;
    const ampm = slot_hour < 12 ? 'AM' : 'PM';
    return `${hour}${ampm}`;
  };

  const formatSlotRange = (slots: Array<{ slot_hour: number; is_night_rate: boolean }>) => {
    if (!slots || slots.length === 0) return '';
    
    const sortedSlots = [...slots].sort((a, b) => a.slot_hour - b.slot_hour);
    const firstSlot = sortedSlots[0].slot_hour;
    const lastSlot = sortedSlots[sortedSlots.length - 1].slot_hour;
    
    return `${formatSlotTime(firstSlot)} - ${formatSlotTime(lastSlot + 1)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'approved':
        return 'green';
      case 'completed':
        return 'blue';
      case 'cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl" className="animate-fade-in">
        <Stack gap="xl">
          <div>
            <Title order={1}>Dashboard</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Loading your business overview...
            </Text>
          </div>
          <CardGridSkeleton count={4} />
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <ChartSkeleton />
            <ChartSkeleton />
          </SimpleGrid>
          <ChartSkeleton height={250} />
        </Stack>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container size="xl" py="xl">
        <EmptyState
          icon={<IconAlertCircle size={64} />}
          title="Failed to Load Dashboard"
          description={error || 'No data available. Please try refreshing the page.'}
          action={{
            label: 'Refresh Page',
            onClick: () => fetchDashboardData(),
          }}
        />
      </Container>
    );
  }

  return (
    <Box style={{ background: '#FFF9E6', minHeight: '100vh', paddingTop: '1px' }}>
      <Container size="xl" py={{ base: 'sm', sm: 'md', md: 'xl' }} px={{ base: 'xs', sm: 'sm', md: 'md' }} className="animate-fade-in">
      <Stack gap="xl">
        {/* Header */}
        <Paper
          p="xl"
          radius="lg"
          style={{
            background: '#1A1A1A',
            border: '2px solid #F5B800',
            boxShadow: '0 4px 16px rgba(245, 184, 0, 0.2)',
          }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <div style={{ flex: 1, minWidth: 0 }}>
              <Title 
                order={1} 
                c="white" 
                size="h1"
                fw={900}
                style={{ 
                  fontSize: 'clamp(1.25rem, 5vw, 2.5rem)',
                  lineHeight: 1.2
                }}
              >
                Dashboard
              </Title>
              <Text 
                c="#D1D1D1" 
                size="md"
                mt={4}
                lineClamp={1}
              >
                PowerPlay Cricket Arena
              </Text>
            </div>
            <Badge 
              size="lg"
              style={{ 
                background: '#F5B800', 
                color: '#1A1A1A',
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              LIVE
            </Badge>
          </Group>
        </Paper>

        {/* Payment Summary Section */}
        <Paper
          p={{ base: 'md', sm: 'lg' }}
          radius="lg"
          withBorder
          style={{
            background: '#F8FAFF',
            border: '2px solid #E3EAFD',
            boxShadow: '0 2px 8px rgba(34,139,230,0.07)',
            marginTop: '-12px',
          }}
        >
          <Title order={4} size="h4" mb={8} c="#227be6" style={{ fontWeight: 800, letterSpacing: 0.2 }}>Payment Summary</Title>
          {(() => {
            let totalCash = 0, totalOnline = 0, totalEasypaisa = 0, totalSadaPay = 0;
            if (data && data.recent_bookings) {
              data.recent_bookings.forEach((b) => {
                if (b.status === 'pending') return;
                // Only count if payment method fields exist, else skip
                if ('advance_payment_method' in b && 'remaining_payment_method' in b && 'remaining_payment_amount' in b) {
                  // Advance
                  if (b.advance_payment_method === 'cash') {
                    totalCash += Number(b.advance_payment) || 0;
                  } else if (b.advance_payment_method === 'easypaisa') {
                    totalOnline += Number(b.advance_payment) || 0;
                    totalEasypaisa += Number(b.advance_payment) || 0;
                  } else if (b.advance_payment_method === 'sadapay') {
                    totalOnline += Number(b.advance_payment) || 0;
                    totalSadaPay += Number(b.advance_payment) || 0;
                  }
                  // Remaining (only if paid)
                  if ((b.status === 'completed' || b.status === 'approved') && b.remaining_payment_method && b.remaining_payment_amount) {
                    const rem = Number(b.remaining_payment_amount) || 0;
                    if (b.remaining_payment_method === 'cash') {
                      totalCash += rem;
                    } else if (b.remaining_payment_method === 'easypaisa') {
                      totalOnline += rem;
                      totalEasypaisa += rem;
                    } else if (b.remaining_payment_method === 'sadapay') {
                      totalOnline += rem;
                      totalSadaPay += rem;
                    }
                  }
                }
              });
            }
            return (
              <Group gap={32} wrap="wrap" mt={4}>
                <Box>
                  <Text size="sm" c="#888" fw={600}>Total Cash</Text>
                  <Text size="lg" fw={800} c="green">Rs {totalCash.toLocaleString()}</Text>
                </Box>
                <Box>
                  <Text size="sm" c="#888" fw={600}>Total Online</Text>
                  <Text size="lg" fw={800} c="#227be6">Rs {totalOnline.toLocaleString()} <Text span size="sm" c="#888" fw={500} style={{ marginLeft: 4 }}>(Easypaisa: Rs {totalEasypaisa.toLocaleString()}, SadaPay: Rs {totalSadaPay.toLocaleString()})</Text></Text>
                </Box>
              </Group>
            );
          })()}
        </Paper>

        {/* Push Notifications */}
        {userId && (
          <PushNotificationToggle userId={userId} />
        )}

        {/* Key Metrics - Row 1 */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing={{ base: 'sm', sm: 'lg' }}>
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.revenue.total_revenue)}
            icon={<IconCurrencyRupee size={24} />}
            color="yellow"
            description={`Advance: ${formatCurrency(data.revenue.total_advance_received)}`}
          />
          <StatCard
            title="Pending Approvals"
            value={data.pending_approvals}
            icon={<IconClockHour4 size={24} />}
            color="warning"
            description="Awaiting approval"
            onClick={() => router.push('/admin/bookings?status=pending')}
            clickable
          />
          <StatCard
            title="Today's Bookings"
            value={data.today_bookings.total_bookings}
            icon={<IconCalendarEvent size={24} />}
            color="success"
            description={`${data.today_bookings.total_hours} hours booked`}
          />
          <StatCard
            title="Remaining Payments"
            value={formatCurrency(data.revenue.total_remaining_payment)}
            icon={<IconAlertCircle size={24} />}
            color="danger"
            description="To be collected"
          />
        </SimpleGrid>

        {/* Last 7 Days Stats */}
        <Paper
          withBorder
          p="lg"
          radius="lg"
          style={{
            background: '#FFFBF0',
            borderColor: '#F5B800',
            borderWidth: '2px',
          }}
        >
          <Title 
            order={3} 
            mb="md"
            size="h3"
            style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}
          >
            Last 7 Days Performance
          </Title>
          <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing={{ base: 'sm', sm: 'md', md: 'lg' }}>
            <div>
              <Text size={{ base: '10px', sm: 'xs' }} c="dimmed" fw={500} tt="uppercase" mb={5}>
                Total Bookings
              </Text>
              <Text fw={700} size={{ base: 'lg', sm: 'xl' }} style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
                {data.last_7_days.total_bookings}
              </Text>
              <Text size={{ base: '10px', sm: 'xs' }} c="dimmed" mt={5}>
                {data.last_7_days.total_hours} total hours
              </Text>
            </div>
            <div>
              <Text size={{ base: '10px', sm: 'xs' }} c="dimmed" fw={500} tt="uppercase" mb={5}>
                Revenue
              </Text>
              <Text fw={700} size={{ base: 'lg', sm: 'xl' }} style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
                {formatCurrency(data.last_7_days.total_revenue)}
              </Text>
              <Text size={{ base: '10px', sm: 'xs' }} c="dimmed" mt={5}>
                Avg: {formatCurrency(data.last_7_days.average_booking_value)}
              </Text>
            </div>
            <div>
              <Text size={{ base: '10px', sm: 'xs' }} c="dimmed" fw={500} tt="uppercase" mb={5}>
                Approved
              </Text>
              <Text fw={700} size={{ base: 'lg', sm: 'xl' }} c="green" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
                {data.last_7_days.approved_bookings}
              </Text>
              <Text size={{ base: '10px', sm: 'xs' }} c="dimmed" mt={5}>
                Successfully confirmed
              </Text>
            </div>
            <div>
              <Text size={{ base: '10px', sm: 'xs' }} c="dimmed" fw={500} tt="uppercase" mb={5}>
                Cancelled
              </Text>
              <Text fw={700} size={{ base: 'lg', sm: 'xl' }} c="red" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
                {data.last_7_days.cancelled_bookings}
              </Text>
              <Text size={{ base: '10px', sm: 'xs' }} c="dimmed" mt={5}>
                Cancel rate: {((data.last_7_days.cancelled_bookings / data.last_7_days.total_bookings) * 100).toFixed(1)}%
              </Text>
            </div>
          </SimpleGrid>
        </Paper>

        {/* Charts Row 1 */}
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={{ base: 'sm', sm: 'lg' }}>
          <DailyBookingsChart data={data.daily_bookings_chart || []} />
          <RevenueChart data={data.daily_revenue_chart || []} />
        </SimpleGrid>

        {/* Slot Usage Chart */}
        <SlotUsageChart data={data.slot_usage || []} />

        {/* Monthly Summary */}
        {data.monthly_summary && data.monthly_summary.length > 0 && (
          <Paper 
            p="md"
            radius="lg"
            style={{ background: 'white' }}
          >
            <Title 
              order={3} 
              mb="md"
              size="h3"
              style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}
            >
              Monthly Summary
            </Title>
            <Box style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table highlightOnHover striped style={{ minWidth: 600 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Month</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Bookings</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Hours</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Revenue</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Avg. Value</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.monthly_summary.map((month, index) => (
                    <Table.Tr key={index}>
                      <Table.Td><Text size="sm">{month.month_name}</Text></Table.Td>
                      <Table.Td><Text size="sm">{month.total_bookings}</Text></Table.Td>
                      <Table.Td><Text size="sm">{month.total_hours}</Text></Table.Td>
                      <Table.Td><Text size="sm" fw={600}>{formatCurrency(month.total_revenue)}</Text></Table.Td>
                      <Table.Td><Text size="sm">{formatCurrency(month.average_booking_value)}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          </Paper>
        )}

        {/* Recent Bookings */}
        <Paper 
          p="md"
          radius="lg"
          style={{ background: 'white' }}
        >
          <Title 
            order={3} 
            mb="md"
            size="h4"
            style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}
          >
            Recent Bookings
          </Title>
          <Box style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table highlightOnHover striped style={{ minWidth: 700 }}>
              <Table.Thead>
                <Table.Tr>
                <Table.Th style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Booking #</Table.Th>
                <Table.Th style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Customer</Table.Th>
                <Table.Th style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Date</Table.Th>
                <Table.Th style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Timings</Table.Th>
                <Table.Th style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Amount</Table.Th>
                <Table.Th style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.recent_bookings.slice(0, 10).map((booking) => (
                <Table.Tr key={booking.id}>
                  <Table.Td>
                    <Text size={{ base: 'xs', sm: 'sm' }} fw={500}>
                      {booking.booking_number}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text size={{ base: 'xs', sm: 'sm' }}>{booking.customer_name}</Text>
                      <Text size="xs" c="dimmed">
                        {booking.customer_phone}
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Text size={{ base: 'xs', sm: 'sm' }}>
                      {new Date(booking.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size={{ base: 'xs', sm: 'sm' }}>
                      {booking.slots ? formatSlotRange(booking.slots) : `${booking.total_hours}h`}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text size={{ base: 'xs', sm: 'sm' }} fw={500}>
                        {formatCurrency(booking.total_amount)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Adv: {formatCurrency(booking.advance_payment)}
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        booking.status === 'approved'
                          ? 'green'
                          : booking.status === 'pending'
                          ? 'orange'
                          : booking.status === 'completed'
                          ? 'teal'
                          : 'red'
                      }
                      variant="light"
                      size="sm"
                    >
                      {booking.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          
          {/* See All Bookings Button */}
          <Group justify="center" mt="md">
            <Button
              variant="light"
              color="yellow"
              rightSection={<IconArrowRight size={16} />}
              onClick={() => router.push('/admin/bookings')}
              fullWidth
              size="md"
              style={{
                background: '#FFF9E6',
                border: '2px solid #F5B800',
                color: '#1A1A1A',
                fontWeight: 700,
              }}
            >
              See All Bookings
            </Button>
          </Group>
          </Box>
        </Paper>
      </Stack>
    </Container>
    </Box>
  );
}
