/**
 * Admin Settings Page
 * 
 * Purpose: Configure system-wide settings
 * Features:
 * - Update hourly rates (day and night)
 * - Configure night rate time range
 * - Changes apply immediately to new bookings
 * - Visual preview of rate schedule
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Stack,
  Paper,
  Group,
  Text,
  NumberInput,
  Select,
  Button,
  Grid,
  Badge,
  Alert,
  Divider,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconCurrencyRupee,
  IconClock,
  IconCheck,
  IconAlertCircle,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface Settings {
  booking_rates: {
    day_rate: number;
    night_rate: number;
  };
  night_rate_hours: {
    start_hour: number;
    end_hour: number;
  };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [dayRate, setDayRate] = useState(1500);
  const [nightRate, setNightRate] = useState(2000);
  const [nightStartHour, setNightStartHour] = useState(17);
  const [nightEndHour, setNightEndHour] = useState(6);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      const result = await response.json();

      if (result.success && result.settings) {
        setSettings(result.settings);
        
        // Populate form with current values
        if (result.settings.booking_rates) {
          setDayRate(result.settings.booking_rates.day_rate);
          setNightRate(result.settings.booking_rates.night_rate);
        }
        
        if (result.settings.night_rate_hours) {
          setNightStartHour(result.settings.night_rate_hours.start_hour);
          setNightEndHour(result.settings.night_rate_hours.end_hour);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load settings',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRates = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingType: 'rates',
          dayRate,
          nightRate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        notifications.show({
          title: 'Success',
          message: 'Hourly rates updated successfully',
          color: 'green',
          icon: <IconCheck size={18} />,
        });
        fetchSettings();
      } else {
        notifications.show({
          title: 'Error',
          message: result.error || 'Failed to update rates',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Failed to save rates:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update rates',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNightHours = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingType: 'night_hours',
          nightStartHour,
          nightEndHour,
        }),
      });

      const result = await response.json();

      if (result.success) {
        notifications.show({
          title: 'Success',
          message: 'Night rate hours updated successfully',
          color: 'green',
          icon: <IconCheck size={18} />,
        });
        fetchSettings();
      } else {
        notifications.show({
          title: 'Error',
          message: result.error || 'Failed to update night hours',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Failed to save night hours:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update night hours',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const getHourLabel = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const isNightHour = (hour: number) => {
    if (nightStartHour > nightEndHour) {
      // Spans midnight (e.g., 17:00 to 06:00)
      return hour >= nightStartHour || hour < nightEndHour;
    } else {
      // Normal range
      return hour >= nightStartHour && hour < nightEndHour;
    }
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: getHourLabel(i),
  }));

  return (
    <Container 
      size="lg" 
      py={{ base: 'sm', sm: 'md', md: 'xl' }}
      px={{ base: 'xs', sm: 'sm', md: 'md' }}
    >
      <Stack gap={{ base: 'sm', sm: 'md', md: 'xl' }}>
        {/* Header */}
        <div>
          <Title 
            order={1}
            size={{ base: 'h3', sm: 'h2', md: 'h1' }}
            style={{ fontSize: 'clamp(1.25rem, 5vw, 2.5rem)' }}
          >
            System Settings
          </Title>
          <Text c="dimmed" mt="xs" size="sm">
            Configure booking rates and operating hours. Changes apply immediately to new bookings.
          </Text>
        </div>

        {/* Alert */}
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          <Text size="sm">
            <strong>Important:</strong> Changing these settings will affect all new booking calculations.
            Existing bookings will retain their original rates.
          </Text>
        </Alert>

        <Grid>
          {/* Hourly Rates Section */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper 
              withBorder 
              p={{ base: 'sm', sm: 'md', md: 'xl' }} 
              h="100%" 
              pos="relative"
            >
              <LoadingOverlay visible={loading} />
              
              <Stack gap={{ base: 'sm', sm: 'md', md: 'lg' }}>
                <Group gap="xs">
                  <IconCurrencyRupee size={24} />
                  <div>
                    <Title 
                      order={3}
                      size={{ base: 'h5', sm: 'h4', md: 'h3' }}
                      style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}
                    >
                      Hourly Rates
                    </Title>
                    <Text size="sm" c="dimmed">
                      Set day and night rates
                    </Text>
                  </div>
                </Group>

                <Divider />

                <NumberInput
                  label="Day Rate"
                  description="Rate per hour during daytime"
                  placeholder="1500"
                  value={dayRate}
                  onChange={(value) => setDayRate(Number(value))}
                  min={0}
                  step={100}
                  size="md"
                  leftSection={<IconSun size={16} />}
                  rightSection={
                    <Text size="xs" c="dimmed">
                      Rs/hour
                    </Text>
                  }
                />

                <NumberInput
                  label="Night Rate"
                  description="Rate per hour during nighttime"
                  placeholder="2000"
                  value={nightRate}
                  onChange={(value) => setNightRate(Number(value))}
                  min={0}
                  step={100}
                  size="md"
                  leftSection={<IconMoon size={16} />}
                  rightSection={
                    <Text size="xs" c="dimmed">
                      Rs/hour
                    </Text>
                  }
                />

                <Button
                  fullWidth
                  leftSection={<IconCheck size={16} />}
                  onClick={handleSaveRates}
                  loading={saving}
                  disabled={loading || dayRate <= 0 || nightRate <= 0}
                  size="md"
                >
                  Save Rates
                </Button>

                {settings && (
                  <Alert color="gray" variant="light">
                    <Text size="xs">
                      Current: Day Rs {settings.booking_rates.day_rate} | Night Rs {settings.booking_rates.night_rate}
                    </Text>
                  </Alert>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Night Hours Section */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper 
              withBorder 
              p={{ base: 'sm', sm: 'md', md: 'xl' }} 
              h="100%" 
              pos="relative"
            >
              <LoadingOverlay visible={loading} />
              
              <Stack gap={{ base: 'sm', sm: 'md', md: 'lg' }}>
                <Group gap="xs">
                  <IconClock size={24} />
                  <div>
                    <Title 
                      order={3}
                      size={{ base: 'h5', sm: 'h4', md: 'h3' }}
                      style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}
                    >
                      Night Rate Hours
                    </Title>
                    <Text size="sm" c="dimmed">
                      Define night rate time range
                    </Text>
                  </div>
                </Group>

                <Divider />

                <Select
                  label="Night Rate Starts"
                  description="Beginning of night rate period"
                  data={hourOptions}
                  value={nightStartHour.toString()}
                  onChange={(value) => setNightStartHour(parseInt(value || '17'))}
                  searchable
                  size="md"
                />

                <Select
                  label="Night Rate Ends"
                  description="End of night rate period"
                  data={hourOptions}
                  value={nightEndHour.toString()}
                  onChange={(value) => setNightEndHour(parseInt(value || '6'))}
                  searchable
                  size="md"
                />

                <Button
                  fullWidth
                  leftSection={<IconCheck size={16} />}
                  onClick={handleSaveNightHours}
                  loading={saving}
                  disabled={loading}
                  size="md"
                >
                  Save Night Hours
                </Button>

                {settings && (
                  <Alert color="gray" variant="light">
                    <Text size="xs">
                      Current: {getHourLabel(settings.night_rate_hours.start_hour)} to{' '}
                      {getHourLabel(settings.night_rate_hours.end_hour)}
                    </Text>
                  </Alert>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Rate Schedule Preview */}
        <Paper withBorder p={{ base: 'sm', sm: 'md', md: 'xl' }}>
          <Stack gap={{ base: 'sm', sm: 'md', md: 'lg' }}>
            <Title 
              order={3}
              size={{ base: 'h5', sm: 'h4', md: 'h3' }}
              style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}
            >
              24-Hour Rate Schedule
            </Title>
            <Text size="sm" c="dimmed">
              Preview of hourly rates throughout the day
            </Text>

            <Grid>
              {Array.from({ length: 24 }, (_, hour) => (
                <Grid.Col span={{ base: 6, xs: 4, sm: 3 }} key={hour}>
                  <Paper
                    p={{ base: 'xs', sm: 'sm' }}
                    withBorder
                    style={{
                      backgroundColor: isNightHour(hour)
                        ? 'var(--mantine-color-indigo-0)'
                        : 'var(--mantine-color-yellow-0)',
                    }}
                  >
                    <Group justify="space-between" gap={{ base: 2, sm: 'xs' }} wrap="nowrap">
                      <Badge
                        size="sm"
                        variant="light"
                        color={isNightHour(hour) ? 'indigo' : 'yellow'}
                        leftSection={
                          isNightHour(hour) ? (
                            <IconMoon size={10} />
                          ) : (
                            <IconSun size={10} />
                          )
                        }
                      >
                        {getHourLabel(hour)}
                      </Badge>
                      <Text size="sm" fw={600}>
                        {isNightHour(hour) ? nightRate : dayRate}
                      </Text>
                    </Group>
                  </Paper>
                </Grid.Col>
              ))}
            </Grid>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
