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

  // Format data for chart - Show only actual received payments
  const chartData = data.map((item) => ({
    date: new Date(item.booking_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    'Received': (item.advance_received || 0) + (item.remaining_payment || 0),
    'Advance': item.advance_received || 0,
    'Remaining': item.remaining_payment || 0,
  }));

  const formatCurrency = (value: number) => {
    return `Rs ${value.toLocaleString()}`;
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <div>
          <Title order={4}>Revenue Trends (Received Only)</Title>
          <Text size="sm" c="dimmed">
            Daily revenue breakdown - Showing actual payments received
          </Text>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#666' }}
              axisLine={{ stroke: '#ddd' }}
            />
            <YAxis
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `Rs ${(value / 1000).toFixed(0)}k`}
              tick={{ fill: '#666' }}
              axisLine={{ stroke: '#ddd' }}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{ 
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            <Legend 
              verticalAlign="top"
              height={36}
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="Received"
              stackId="1"
              stroke="#40c057"
              fill="#40c057"
              fillOpacity={0.7}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Advance"
              stackId="2"
              stroke="#228be6"
              fill="#228be6"
              fillOpacity={0.5}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Remaining"
              stackId="3"
              stroke="#fd7e14"
              fill="#fd7e14"
              fillOpacity={0.5}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
        <Text size="xs" c="dimmed" mt="xs">
          Note: Shows only payments that have been received (advance + completed remaining payments)
        </Text>
      </Stack>
    </Paper>
  );
}