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

import { useEffect, useState, useMemo } from 'react';
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
    advance_payment_method?: string;
    remaining_payment_amount?: number;
    remaining_payment_method?: string;
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
    
    const sortedSlots = [...slots].sort((slotA, slotB) => slotA.slot_hour - slotB.slot_hour);
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

  /** ✅ ACTUAL TOTAL REVENUE (from backend SQL) */
  const totalRevenue = useMemo(() => {
    return data?.revenue?.total_revenue || 0;
  }, [data]);

  /** ✅ TOTAL CASH & ONLINE PAYMENTS (current month) */
  const currentMonthName = useMemo(() => {
    if (!data?.monthly_summary || data.monthly_summary.length === 0) return '';
    return data.monthly_summary[0]?.month_name || '';
  }, [data]);
  const totalCashOnline = useMemo(() => {
    if (!currentMonthName) return { totalCash: 0, totalOnline: 0 };
    const result = calculatePaymentSummaryForMonth(currentMonthName);
    return {
      totalCash: result?.totalCash ?? 0,
      totalOnline: result?.totalOnline ?? 0,
    };
  }, [currentMonthName, data]) || { totalCash: 0, totalOnline: 0 };
  const totalCash = totalCashOnline.totalCash;
  const totalOnline = totalCashOnline.totalOnline;

  /** ✅ LAST 7 DAYS REVENUE */
  const last7DaysRevenue = useMemo(() => {
    if (!data?.daily_revenue_chart) return 0;

    return data.daily_revenue_chart.reduce(
      (sum, d) => sum + d.advance_received + d.remaining_payment,
      0
    );
  }, [data]);

  /** ✅ PENDING APPROVALS COUNT */
  const pendingApprovalsCount = useMemo(() => {
    if (!data?.recent_bookings) return 0;
    return data.recent_bookings.filter(booking => booking && booking.status === 'pending').length;
  }, [data]);

  // Helper function to calculate payment summary for a month
  const calculatePaymentSummaryForMonth = (monthName: string) => {
    if (!data || !Array.isArray(data.recent_bookings)) {
      return { totalCash: 0, totalOnline: 0, totalEasypaisa: 0, totalSadaPay: 0 };
    }

    let totalCash = 0, totalOnline = 0, totalEasypaisa = 0, totalSadaPay = 0;

    // Extract just the month name (remove year if present)
    const targetMonth = typeof monthName === 'string' ? monthName.split(' ')[0] : '';

    data.recent_bookings.forEach((bookingItem) => {
      if (!bookingItem || typeof bookingItem !== 'object') return;
      const {
        status,
        booking_date,
        advance_payment,
        advance_payment_method,
        remaining_payment_amount,
        remaining_payment_method
      } = bookingItem || {};
      if (!status || !booking_date) return;
      // Skip pending bookings
      if (status === 'pending') return;

      // Extract month from booking date
      let bookingMonth = '';
      try {
        const bookingDateObj = new Date(booking_date);
        bookingMonth = bookingDateObj.toLocaleString('en-US', { month: 'long' });
      } catch (e) {
        return;
      }

      // Match month (without year)
      if (bookingMonth !== targetMonth) return;

      // Calculate advance payment
      const advanceAmount = Number(advance_payment) || 0;

      if (advance_payment_method) {
        if (advance_payment_method === 'cash') {
          totalCash += advanceAmount;
        } else if (advance_payment_method === 'easypaisa') {
          totalOnline += advanceAmount;
          totalEasypaisa += advanceAmount;
        } else if (advance_payment_method === 'sadapay') {
          totalOnline += advanceAmount;
          totalSadaPay += advanceAmount;
        }
      }

      // Calculate remaining payment if paid (completed or approved with remaining payment)
      const isCompleted = status === 'completed';
      const isApprovedWithRemaining = status === 'approved' && remaining_payment_amount && remaining_payment_amount > 0;

      if ((isCompleted || isApprovedWithRemaining) && remaining_payment_method && remaining_payment_amount) {
        const remainingAmount = Number(remaining_payment_amount) || 0;

        if (remaining_payment_method === 'cash') {
          totalCash += remainingAmount;
        } else if (remaining_payment_method === 'easypaisa') {
          totalOnline += remainingAmount;
          totalEasypaisa += remainingAmount;
        } else if (remaining_payment_method === 'sadapay') {
          totalOnline += remainingAmount;
          totalSadaPay += remainingAmount;
        }
      }
    });

    // Always return a valid object
    return {
      totalCash: typeof totalCash === 'number' ? totalCash : 0,
      totalOnline: typeof totalOnline === 'number' ? totalOnline : 0,
      totalEasypaisa: typeof totalEasypaisa === 'number' ? totalEasypaisa : 0,
      totalSadaPay: typeof totalSadaPay === 'number' ? totalSadaPay : 0,
    };
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

        {/* Payment Summary By Month Section */}
        {data && data.monthly_summary && data.monthly_summary.length > 0 && (
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
            <Title order={4} size="h4" mb={8} c="#227be6" style={{ fontWeight: 800, letterSpacing: 0.2 }}>Payment Summary By Month</Title>
            <Box style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table highlightOnHover striped style={{ minWidth: 700 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Month</Table.Th>
                    <Table.Th>Total Cash</Table.Th>
                    <Table.Th>Total Online</Table.Th>
                    <Table.Th>Easypaisa</Table.Th>
                    <Table.Th>SadaPay</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.monthly_summary.map((month, idx) => {
                    const { totalCash, totalOnline, totalEasypaisa, totalSadaPay } = calculatePaymentSummaryForMonth(month.month_name);
                    
                    return (
                      <Table.Tr key={idx}>
                        <Table.Td><Text size="sm">{month.month_name}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="green" fw={700}>Rs {totalCash.toLocaleString()}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="#227be6" fw={700}>Rs {totalOnline.toLocaleString()}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="#1976d2">Rs {totalEasypaisa.toLocaleString()}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="#00bcd4">Rs {totalSadaPay.toLocaleString()}</Text></Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Box>
            <Text size="xs" c="dimmed" mt="sm">
              Note: Based on recent bookings data. For complete payment history, check detailed reports.
            </Text>
          </Paper>
        )}

        {/* Push Notifications */}
        {userId && (
          <PushNotificationToggle userId={userId} />
        )}

        {/* Key Metrics - Row 1 */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 6 }} spacing={{ base: 'sm', sm: 'lg' }}>
          <StatCard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            icon={<IconCurrencyRupee size={24} />}
            color="yellow"
            description="Only received payments"
          />
          <StatCard
            title="Pending Approvals"
            value={pendingApprovalsCount}
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
            title="Last 7 Days Revenue"
            value={formatCurrency(last7DaysRevenue)}
            icon={<IconAlertCircle size={24} />}
            color="blue"
            description="Total revenue collected"
          />
          <StatCard
            title="Total Cash Payments"
            value={formatCurrency(totalCash)}
            icon={<IconCurrencyRupee size={24} />}
            color="green"
            description="Cash received this month"
          />
          <StatCard
            title="Total Online Payments"
            value={formatCurrency(totalOnline)}
            icon={<IconCurrencyRupee size={24} />}
            color="blue"
            description="Easypaisa + SadaPay this month"
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
              <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={5}>
                Total Bookings
              </Text>
              <Text fw={700} size="xl" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
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
              <Text fw={700} size="xl" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
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
              <Text fw={700} size="xl" c="green" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
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
              <Text fw={700} size="xl" c="red" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
                {data.last_7_days.cancelled_bookings}
              </Text>
              <Text size="xs" c="dimmed" mt={5}>
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
          {(!data.recent_bookings || data.recent_bookings.length === 0) ? (
            <EmptyState
              title="No recent bookings"
              description="Bookings will appear here once available"
            />
          ) : (
            <>
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
                  {data.recent_bookings.slice(0, 10).map((booking) => {
                    const received =
                      booking.advance_payment +
                      (booking.status === 'completed' ? booking.remaining_payment_amount || 0 : 0);
                    
                    return (
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
                            {new Date(booking.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {booking.slots ? formatSlotRange(booking.slots) : `${booking.total_hours}h`}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <div>
                            <Text size="sm" fw={500}>
                              {formatCurrency(received)}
                            </Text>
                            <Text size="xs" c="dimmed">
                              Paid only
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
                    );
                  })}
                </Table.Tbody>
              </Table>
              </Box>
            </>
          )}
          
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
        </Paper>
      </Stack>
    </Container>
    </Box>
  );
}