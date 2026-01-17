/**
 * Loading Skeleton Components
 * 
 * Purpose: Provide loading skeletons for different content types
 * Features:
 * - Table skeleton
 * - Card skeleton
 * - Stats skeleton
 * - Form skeleton
 * - Smooth animations
 */

'use client';

import { Skeleton, Stack, Group, SimpleGrid, Paper, Box } from '@mantine/core';

// Table Loading Skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Stack gap="xs">
      {/* Table Header */}
      <Group gap="md" mb="sm">
        <Skeleton height={40} />
      </Group>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <Paper key={i} p="md" withBorder>
          <Group justify="space-between">
            <Stack gap="xs" style={{ flex: 1 }}>
              <Skeleton height={16} width="60%" />
              <Skeleton height={14} width="40%" />
            </Stack>
            <Group gap="sm">
              <Skeleton height={32} width={80} />
              <Skeleton height={32} width={32} circle />
            </Group>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

// Card Grid Skeleton
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SimpleGrid
      cols={{ base: 1, sm: 2, md: 2, lg: 4 }}
      spacing="lg"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Paper key={i} p="lg" withBorder className="animate-pulse">
          <Stack gap="md">
            <Group justify="space-between">
              <Skeleton height={20} width="50%" />
              <Skeleton height={32} width={32} circle />
            </Group>
            <Skeleton height={32} width="70%" />
            <Skeleton height={16} width="40%" />
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

// Stats Card Skeleton
export function StatCardSkeleton() {
  return (
    <Paper p="lg" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Skeleton height={16} width={100} />
          <Skeleton height={40} width={40} circle />
        </Group>
        <Skeleton height={36} width="60%" />
        <Skeleton height={14} width="50%" />
      </Stack>
    </Paper>
  );
}

// Form Skeleton
export function FormSkeleton() {
  return (
    <Stack gap="md">
      <Skeleton height={36} />
      <Skeleton height={36} />
      <Skeleton height={36} />
      <Skeleton height={100} />
      <Group justify="flex-end" gap="sm">
        <Skeleton height={36} width={100} />
        <Skeleton height={36} width={100} />
      </Group>
    </Stack>
  );
}

// Chart Skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Paper p="lg" withBorder>
      <Stack gap="md">
        <Skeleton height={24} width="40%" />
        <Skeleton height={height} />
      </Stack>
    </Paper>
  );
}

// Booking Slots Skeleton
export function SlotsSkeleton() {
  return (
    <Stack gap="md">
      <Skeleton height={24} width={200} />
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="sm">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} height={60} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

// Generic Content Skeleton
export function ContentSkeleton() {
  return (
    <Stack gap="md">
      <Skeleton height={32} width="70%" />
      <Skeleton height={20} width="100%" />
      <Skeleton height={20} width="95%" />
      <Skeleton height={20} width="90%" />
    </Stack>
  );
}
