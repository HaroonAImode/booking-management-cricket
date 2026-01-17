/**
 * SlotUsageChart Component
 * Bar chart showing slot usage by hour
 */

'use client';

import { Paper, Title, Text, Stack } from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface SlotUsageChartProps {
  data: Array<{
    slot_hour: number;
    total_bookings: number;
    is_night_slot: boolean;
    usage_percentage: number;
  }>;
}

export default function SlotUsageChart({ data }: SlotUsageChartProps) {
  // Handle null/undefined data
  if (!data || data.length === 0) {
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <div>
            <Title order={4}>Slot Usage Statistics</Title>
            <Text size="sm" c="dimmed">
              Bookings by hour (last 7 days)
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
    hour: `${item.slot_hour}:00`,
    bookings: item.total_bookings,
    usage: parseFloat(item.usage_percentage?.toString() || '0'),
    isNight: item.is_night_slot,
  }));

  // Color based on night/day
  const getColor = (isNight: boolean) => {
    return isNight ? '#4c6ef5' : '#fab005';
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <div>
          <Title order={4}>Slot Usage Statistics</Title>
          <Text size="sm" c="dimmed">
            Bookings by hour (last 7 days)
          </Text>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="hour"
              style={{ fontSize: '11px' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip
              formatter={(value: number | undefined, name?: string) => {
                if (!value) return ['0', name || ''];
                if (name === 'bookings') return [value, 'Bookings'];
                if (name === 'usage') return [`${value}%`, 'Usage'];
                return value;
              }}
            />
            <Legend />
            <Bar dataKey="bookings" name="Bookings" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.isNight)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Group gap="md" justify="center">
          <Group gap="xs">
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: '#fab005',
                borderRadius: 2,
              }}
            />
            <Text size="xs" c="dimmed">
              Day Rate (7 AM - 4 PM)
            </Text>
          </Group>
          <Group gap="xs">
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: '#4c6ef5',
                borderRadius: 2,
              }}
            />
            <Text size="xs" c="dimmed">
              Night Rate (5 PM - 6 AM)
            </Text>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}

// Add missing import
import { Group } from '@mantine/core';
