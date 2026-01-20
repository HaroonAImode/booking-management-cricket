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
} from '@mantine/core';
import {
  IconCurrencyRupee,
  IconClockHour4,
  IconCalendarEvent,
  IconAlertCircle,
  IconTrendingUp,
  IconUsers,
  IconClock,
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
  }>;
}

export default function AdminDashboardPage() {
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

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString()}`;
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
      <Container size="xl" py={{ base: 'md', sm: 'xl' }} px={{ base: 'xs', sm: 'md' }} className="animate-fade-in">
      <Stack gap={{ base: 'md', sm: 'xl' }}>
        {/* Header */}
        <Paper
          p={{ base: 'md', sm: 'xl' }}
          radius="lg"
          style={{
            background: '#1A1A1A',
            border: '2px solid #F5B800',
            boxShadow: '0 4px 16px rgba(245, 184, 0, 0.2)',
          }}
        >
          <Group justify="space-between" align="center">
            <div>
              <Title order={1} c="white" size={{ base: 'h2', sm: 'h1' }} fw={900}>
                Dashboard
              </Title>
              <Text c="#D1D1D1" size={{ base: 'sm', sm: 'md' }} mt={4}>
                PowerPlay Cricket Arena - Live Business Overview
              </Text>
            </div>
            <Badge 
              size="lg" 
              style={{ 
                background: '#F5B800', 
                color: '#1A1A1A',
                fontWeight: 900,
              }}
            >
              LIVE
            </Badge>
          </Group>
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
          p={{ base: 'md', sm: 'lg' }}
          radius="lg"
          style={{
            background: '#FFFBF0',
            borderColor: '#F5B800',
            borderWidth: '2px',
          }}
        >
          <Title order={3} mb="md" size={{ base: 'h4', sm: 'h3' }}>
            Last 7 Days Performance
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing={{ base: 'md', sm: 'lg' }}>
            <div>
              <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={5}>
                Total Bookings
              </Text>
              <Text fw={700} size="xl">
                {data.last_7_days.total_bookings}
              </Text>
              <Text size="xs" c="dimmed" mt={5}>
                {data.last_7_days.total_hours} total hours
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={5}>
                Revenue
              </Text>
              <Text fw={700} size="xl">
                {formatCurrency(data.last_7_days.total_revenue)}
              </Text>
              <Text size="xs" c="dimmed" mt={5}>
                Avg: {formatCurrency(data.last_7_days.average_booking_value)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={5}>
                Approved
              </Text>
              <Text fw={700} size="xl" c="green">
                {data.last_7_days.approved_bookings}
              </Text>
              <Text size="xs" c="dimmed" mt={5}>
                Successfully confirmed
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={5}>
                Cancelled
              </Text>
              <Text fw={700} size="xl" c="red">
                {data.last_7_days.cancelled_bookings}
              </Text>
              <Text size="xs" c="dimmed" mt={5}>
                Cancellation rate: {((data.last_7_days.cancelled_bookings / data.last_7_days.total_bookings) * 100).toFixed(1)}%
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
            withBorder
            p={{ base: 'md', sm: 'lg' }}
            radius="lg"
            style={{ background: 'white' }}
          >
            <Title order={3} mb="md" size={{ base: 'h4', sm: 'h3' }}>
              Monthly Summary
            </Title>
            <Box style={{ overflowX: 'auto' }}>
              <Table highlightOnHover striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Month</Table.Th>
                    <Table.Th>Bookings</Table.Th>
                    <Table.Th>Hours</Table.Th>
                    <Table.Th>Revenue</Table.Th>
                    <Table.Th>Avg. Value</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.monthly_summary.map((month, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>{month.month_name}</Table.Td>
                      <Table.Td>{month.total_bookings}</Table.Td>
                      <Table.Td>{month.total_hours}</Table.Td>
                      <Table.Td>{formatCurrency(month.total_revenue)}</Table.Td>
                      <Table.Td>{formatCurrency(month.average_booking_value)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          </Paper>
        )}

        {/* Recent Bookings */}
        <Paper
          withBorder
          p={{ base: 'md', sm: 'lg' }}
          radius="lg"
          style={{ background: 'white' }}
        >
          <Title order={3} mb="md" size={{ base: 'h4', sm: 'h3' }}>
            Recent Bookings
          </Title>
          <Box style={{ overflowX: 'auto' }}>
            <Table highlightOnHover striped>
              <Table.Thead>
                <Table.Tr>
                <Table.Th>Booking #</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Hours</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.recent_bookings.slice(0, 10).map((booking) => (
                <Table.Tr key={booking.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {booking.booking_number}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text size="sm">{booking.customer_name}</Text>
                      <Text size="xs" c="dimmed">
                        {booking.customer_phone}
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{booking.total_hours}h</Text>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text size="sm" fw={500}>
                        {formatCurrency(booking.total_amount)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Advance: {formatCurrency(booking.advance_payment)}
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
          </Box>
        </Paper>
      </Stack>
    </Container>
    </Box>
  );
}
