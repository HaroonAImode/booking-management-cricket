/**
 * DailyBookingsChart Component
 * Line chart showing daily booking trends
 */

'use client';

import { Paper, Title, Text, Stack } from '@mantine/core';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DailyBookingsChartProps {
  data: Array<{
    booking_date: string;
    total_bookings: number;
    pending_bookings: number;
    approved_bookings: number;
    cancelled_bookings: number;
  }>;
}

export default function DailyBookingsChart({ data }: DailyBookingsChartProps) {
  // Handle null/undefined data
  if (!data || data.length === 0) {
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <div>
            <Title order={4}>Daily Bookings</Title>
            <Text size="sm" c="dimmed">
              Last 7 days booking trends
            </Text>
          </div>
          <Text c="dimmed" ta="center" py="xl">
            No booking data available yet
          </Text>
        </Stack>
      </Paper>
    );
  }

  // Format data for chart
  const chartData = data.map((item) => ({
    date: new Date(item.booking_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    Total: item.total_bookings,
    Pending: item.pending_bookings,
    Approved: item.approved_bookings,
    Cancelled: item.cancelled_bookings,
  }));

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <div>
          <Title order={4}>Daily Bookings</Title>
          <Text size="sm" c="dimmed">
            Last 7 days booking trends
          </Text>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              style={{ fontSize: '12px' }}
            />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Total"
              stroke="#228be6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Approved"
              stroke="#40c057"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="Pending"
              stroke="#fd7e14"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="Cancelled"
              stroke="#fa5252"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Stack>
    </Paper>
  );
}
