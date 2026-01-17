/**
 * Empty State Component
 * 
 * Purpose: Display a friendly empty state when no data is available
 * Features:
 * - Icon support
 * - Custom title and description
 * - Optional action button
 * - Responsive design
 */

'use client';

import { Stack, Text, Button, Box, Paper } from '@mantine/core';
import { IconMoodEmpty } from '@tabler/icons-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Paper
      p="xl"
      radius="md"
      withBorder
      className={`animate-fade-in ${className || ''}`}
      style={{
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack align="center" gap="md" style={{ maxWidth: 400 }}>
        {/* Icon */}
        <Box
          style={{
            color: 'var(--mantine-color-gray-4)',
            fontSize: '64px',
            opacity: 0.5,
          }}
        >
          {icon || <IconMoodEmpty size={64} stroke={1.5} />}
        </Box>

        {/* Title */}
        <Text
          size="xl"
          fw={600}
          ta="center"
          c="gray.7"
        >
          {title}
        </Text>

        {/* Description */}
        {description && (
          <Text
            size="sm"
            c="dimmed"
            ta="center"
          >
            {description}
          </Text>
        )}

        {/* Action Button */}
        {action && (
          <Button
            onClick={action.onClick}
            size="md"
            mt="md"
            variant="light"
          >
            {action.label}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
