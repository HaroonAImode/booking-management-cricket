/**
 * StatCard Component
 * Displays a single statistic with icon, value, and optional trend
 */

import { Paper, Group, Text, ThemeIcon, Stack, Box } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  trend?: {
    value: number;
    label: string;
  };
  description?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color = 'blue',
  trend,
  description,
}: StatCardProps) {
  const isPositiveTrend = trend && trend.value > 0;
  const isNegativeTrend = trend && trend.value < 0;

  const gradients: Record<string, string> = {
    blue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    green: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    orange: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    red: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    teal: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    grape: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  };

  return (
    <Paper
      withBorder
      p="lg"
      radius="lg"
      style={{
        background: 'white',
        borderColor: '#e9ecef',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" mb={8}>
              {title}
            </Text>
            <Text fw={700} size="2rem" style={{ lineHeight: 1.2 }}>
              {value}
            </Text>
          </Box>
          <ThemeIcon
            size={60}
            radius="lg"
            variant="gradient"
            gradient={{ from: color, to: color, deg: 135 }}
            style={{
              background: gradients[color] || gradients.blue,
            }}
          >
            {icon}
          </ThemeIcon>
        </Group>
        
        {description && (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        )}
        
        {trend && (
          <Group gap="xs" mt={4}>
            <Group gap={4}>
              {isPositiveTrend && (
                <IconArrowUpRight size={18} color="var(--mantine-color-teal-6)" />
              )}
              {isNegativeTrend && (
                <IconArrowDownRight size={18} color="var(--mantine-color-red-6)" />
              )}
              <Text
                size="sm"
                fw={600}
                c={isPositiveTrend ? 'teal' : isNegativeTrend ? 'red' : 'dimmed'}
              >
                {Math.abs(trend.value)}%
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              {trend.label}
            </Text>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
