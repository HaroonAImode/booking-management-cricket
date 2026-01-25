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
  onClick?: () => void;
  clickable?: boolean;
}

export default function StatCard({
  title,
  value,
  icon,
  color = 'blue',
  trend,
  description,
  onClick,
  clickable = false,
}: StatCardProps) {
  const isPositiveTrend = trend && trend.value > 0;
  const isNegativeTrend = trend && trend.value < 0;

  const gradients: Record<string, string> = {
    yellow: 'linear-gradient(135deg, #F5B800 0%, #FFDD80 100%)',
    black: 'linear-gradient(135deg, #1A1A1A 0%, #333333 100%)',
    gold: 'linear-gradient(135deg, #FFE599 0%, #F5B800 100%)',
    charcoal: 'linear-gradient(135deg, #4A4A4A 0%, #1A1A1A 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    danger: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
    blue: 'linear-gradient(135deg, #F5B800 0%, #FFDD80 100%)',
    green: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    orange: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    red: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
    teal: 'linear-gradient(135deg, #1A1A1A 0%, #333333 100%)',
    grape: 'linear-gradient(135deg, #F5B800 0%, #FFDD80 100%)',
  };

  return (
    <Paper
      withBorder
      p="lg"
      radius="lg"
      style={{
        background: '#FFFBF0',
        borderCoclickable ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (clickable || true) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={clickable ? onClick : undefined e.currentTarget.style.transform = 'translateY(0)';
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
