/**
 * RevenueChart Component
 * Area chart showing daily revenue trends
 */

'use client';

import { Paper, Title, Text, Stack } from '@mantine/core';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
  data: Array<{
    booking_date: string;
    total_revenue: number;
    advance_received: number;
    remaining_payment: number;
  }>;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  // Handle null/undefined data
  if (!data || data.length === 0) {
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <div>
            <Title order={4}>Revenue Trends</Title>
            <Text size="sm" c="dimmed">
              Daily revenue breakdown
            </Text>
          </div>
          <Text c="dimmed" ta="center" py="xl">
            No revenue data available yet
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
    'Total Revenue': parseFloat(item.total_revenue?.toString() || '0'),
    'Advance Received': parseFloat(item.advance_received?.toString() || '0'),
    'Remaining': parseFloat(item.remaining_payment?.toString() || '0'),
  }));

  const formatCurrency = (value: number) => {
    return `Rs ${value.toLocaleString()}`;
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <div>
          <Title order={4}>Revenue Trends</Title>
          <Text size="sm" c="dimmed">
            Daily revenue breakdown
          </Text>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `Rs ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip formatter={(value: number | undefined) => value ? formatCurrency(value) : 'Rs 0'} />
            <Legend />
            <Area
              type="monotone"
              dataKey="Total Revenue"
              stackId="1"
              stroke="#228be6"
              fill="#228be6"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="Advance Received"
              stackId="2"
              stroke="#40c057"
              fill="#40c057"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="Remaining"
              stackId="3"
              stroke="#fd7e14"
              fill="#fd7e14"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Stack>
    </Paper>
  );
}
