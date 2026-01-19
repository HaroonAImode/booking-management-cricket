/**
 * Home Page (Public Route)
 * 
 * Purpose: Landing page for the cricket booking software.
 * This is the main entry point for public users.
 * Displays information about available cricket grounds and booking options.
 */

'use client';

import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Group,
  Badge,
  Box,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconClock24,
  IconShield,
  IconCurrencyRupee,
  IconPhone,
  IconArrowRight,
  IconCheck,
  IconStar,
} from '@tabler/icons-react';
import Link from 'next/link';

export default function HomePage() {
  const features = [
    {
      icon: IconCalendarEvent,
      title: 'Easy Booking',
      description: 'Book your slots in just a few clicks',
      color: 'yellow',
    },
    {
      icon: IconClock24,
      title: '24/7 Available',
      description: 'Day and night slots available',
      color: 'dark',
    },
    {
      icon: IconCurrencyRupee,
      title: 'Affordable Rates',
      description: 'Rs 1,500/hr day | Rs 2,000/hr night',
      color: 'yellow',
    },
    {
      icon: IconShield,
      title: 'Secure Booking',
      description: 'Safe and verified payment process',
      color: 'dark',
    },
  ];

  const benefits = [
    'Instant booking confirmation',
    'Professional cricket ground',
    'High-quality equipment',
    'Floodlights for night matches',
    'Secure parking facility',
    'Online payment options',
  ];

  return (
    <Stack gap={{ base: 'lg', sm: 'xl' }}>
      {/* Hero Section */}
        <Paper
          p={{ base: 'xl', sm: '60px' }}
          radius="lg"
          style={{
            background: '#1A1A1A',
            border: '2px solid #F5B800',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(245, 184, 0, 0.2)',
          }}
        >
          <Stack gap="lg" align="center">
            <Badge 
              size="xl" 
              style={{ 
                background: '#F5B800', 
                color: '#1A1A1A',
                fontWeight: 900,
                letterSpacing: '1px',
              }}
            >
              ⚡ POWERPLAY CRICKET ARENA
            </Badge>
            
            <Title
              order={1}
              c="white"
              size={{ base: '2rem', sm: '3rem' }}
              style={{ lineHeight: 1.2, fontWeight: 900 }}
            >
              Book Your Premium
              <br />
              <Text component="span" c="#F5B800">Cricket Ground</Text> Today
            </Title>
            
            <Text
              size={{ base: 'md', sm: 'xl' }}
              c="#D1D1D1"
              maw={600}
              mx="auto"
            >
              World-class cricket facilities with professional grounds,
              floodlights, and instant online booking. Experience cricket like never before.
            </Text>
            
            <Group gap="md" mt="md" justify="center">
              <Button
                component={Link}
                href="/bookings"
                size="xl"
                rightSection={<IconArrowRight size={20} />}
                styles={{
                  root: {
                    height: '60px',
                    fontSize: '18px',
                    fontWeight: 700,
                    background: '#F5B800',
                    color: '#1A1A1A',
                    '&:hover': {
                      background: '#FFDD80',
                    },
                  },
                }}
              >
                Book Now
              </Button>
              
              <Button
                component={Link}
                href="/bookings/check"
                size="xl"
                variant="outline"
                styles={{
                  root: {
                    height: '60px',
                    fontSize: '18px',
                    fontWeight: 700,
                    borderWidth: '2px',
                    borderColor: '#F5B800',
                    color: '#F5B800',
                    '&:hover': {
                      background: 'rgba(245, 184, 0, 0.1)',
                    },
                  },
                }}
              >
                Check Booking
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* Features Grid */}
        <Paper p="xl" radius="lg" style={{ background: '#FFECB3', border: '2px solid #F5B800' }}>
          <Title order={2} ta="center" mb="xl" size={{ base: 'h2', sm: 'h1' }} c="#1A1A1A">
            Why Choose Us?
          </Title>
          
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 4 }} spacing={{ base: 'md', sm: 'lg' }}>
            {features.map((feature, index) => (
              <Paper
                key={index}
                p={{ base: 'md', sm: 'xl' }}
                withBorder
                radius="md"
                style={{ textAlign: 'center', height: '100%', background: 'white', borderColor: '#F5B800', borderWidth: '2px' }}
              >
                <Stack gap="md" align="center">
                  <ThemeIcon
                    size={{ base: 50, sm: 60 }}
                    radius="xl"
                    color={feature.color}
                  >
                    <feature.icon size={28} />
                  </ThemeIcon>
                  <div>
                    <Text fw={700} size={{ base: 'md', sm: 'lg' }} mb={4}>
                      {feature.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {feature.description}
                    </Text>
                  </div>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Paper>

        {/* Benefits Section */}
        <Paper
          withBorder
          p={{ base: 'lg', sm: 'xl' }}
          radius="md"
          style={{ background: '#FFECB3', borderColor: '#F5B800', borderWidth: '2px' }}
        >
          <Stack gap="md">
            <Group gap="sm" justify="center">
              <ThemeIcon size={40} radius="md" style={{ background: '#F5B800', color: '#1A1A1A' }}>
                <IconStar size={24} />
              </ThemeIcon>
              <Title order={2} size={{ base: 'h3', sm: 'h2' }} c="#1A1A1A">
                What You Get
              </Title>
            </Group>
            
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mt="md">
              {benefits.map((benefit, index) => (
                <Group key={index} gap="sm" wrap="nowrap">
                  <ThemeIcon style={{ background: '#F5B800', color: '#1A1A1A' }} size={24} radius="xl">
                    <IconCheck size={16} />
                  </ThemeIcon>
                  <Text size="sm" c="#4A4A4A" fw={500}>{benefit}</Text>
                </Group>
              ))}
            </SimpleGrid>
          </Stack>
        </Paper>

        {/* Pricing Section */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Paper
            withBorder
            p={{ base: 'lg', sm: 'xl' }}
            radius="md"
            style={{ background: '#F5B800', border: '2px solid #1A1A1A' }}
          >
            <Stack gap="sm" align="center" ta="center">
              <ThemeIcon size={60} radius="xl" style={{ background: '#1A1A1A', color: '#F5B800' }}>
                <IconClock24 size={32} />
              </ThemeIcon>
              <Title order={3} c="#1A1A1A" size={{ base: 'h4', sm: 'h3' }} fw={900}>
                Day Time Rate
              </Title>
              <Title order={1} c="#1A1A1A" size={{ base: '2.5rem', sm: '3rem' }} fw={900}>
                Rs 1,500
              </Title>
              <Text c="#1A1A1A" fw={700}>
                per hour
              </Text>
              <Text size="sm" c="#333333" mt="xs" fw={600}>
                7:00 AM - 5:00 PM
              </Text>
            </Stack>
          </Paper>

          <Paper
            withBorder
            p={{ base: 'lg', sm: 'xl' }}
            radius="md"
            style={{ background: '#1A1A1A', border: '2px solid #F5B800' }}
          >
            <Stack gap="sm" align="center" ta="center">
              <ThemeIcon size={60} radius="xl" style={{ background: '#F5B800', color: '#1A1A1A' }}>
                <Text size="32px">🌙</Text>
              </ThemeIcon>
              <Title order={3} c="#F5B800" size={{ base: 'h4', sm: 'h3' }} fw={900}>
                Night Time Rate
              </Title>
              <Title order={1} c="white" size={{ base: '2.5rem', sm: '3rem' }} fw={900}>
                Rs 2,000
              </Title>
              <Text c="white" fw={700}>
                per hour
              </Text>
              <Text size="sm" c="#D1D1D1" mt="xs" fw={600}>
                5:00 PM - 7:00 AM
              </Text>
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* CTA Section */}
        <Paper
          withBorder
          p={{ base: 'xl', sm: '60px' }}
          radius="lg"
          style={{ background: '#1A1A1A', border: '2px solid #F5B800', boxShadow: '0 8px 32px rgba(245, 184, 0, 0.2)' }}
        >
          <Stack gap="lg" align="center" ta="center">
            <Title order={2} c="white" size={{ base: 'h3', sm: 'h2' }} fw={900}>
              Ready to <Text component="span" c="#F5B800">Book Your Slot</Text>?
            </Title>
            <Text size={{ base: 'md', sm: 'lg' }} c="#D1D1D1" maw={600}>
              Join thousands of satisfied players at PowerPlay Cricket Arena.
              Book now and experience world-class cricket facilities!
            </Text>
            <Group gap="md" justify="center" mt="md">
              <Button
                component={Link}
                href="/bookings"
                size="xl"
                leftSection={<IconCalendarEvent size={20} />}
                styles={{
                  root: {
                    height: '60px',
                    fontSize: '18px',
                    fontWeight: 700,
                    background: '#F5B800',
                    color: '#1A1A1A',
                    '&:hover': {
                      background: '#FFDD80',
                    },
                  },
                }}
              >
                Start Booking
              </Button>
              <Button
                component={Link}
                href="/contact"
                size="xl"
                variant="outline"
                leftSection={<IconPhone size={20} />}
                styles={{
                  root: {
                    height: '60px',
                    fontSize: '18px',
                    fontWeight: 700,
                    borderWidth: '2px',
                    borderColor: '#F5B800',
                    color: '#F5B800',
                    '&:hover': {
                      background: 'rgba(245, 184, 0, 0.1)',
                    },
                  },
                }}
              >
                Contact Us
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
  );
}
