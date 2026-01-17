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
      color: 'blue',
    },
    {
      icon: IconClock24,
      title: '24/7 Available',
      description: 'Day and night slots available',
      color: 'green',
    },
    {
      icon: IconCurrencyRupee,
      title: 'Affordable Rates',
      description: 'Rs 1,500/hr day | Rs 2,000/hr night',
      color: 'orange',
    },
    {
      icon: IconShield,
      title: 'Secure Booking',
      description: 'Safe and verified payment process',
      color: 'grape',
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
    <Container size="lg" py={{ base: 'md', sm: 'xl' }} px={{ base: 'xs', sm: 'md' }}>
      <Stack gap={{ base: 'lg', sm: 'xl' }}>
        {/* Hero Section */}
        <Paper
          p={{ base: 'xl', sm: '60px' }}
          radius="lg"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            textAlign: 'center',
          }}
        >
          <Stack gap="lg" align="center">
            <Badge size="xl" variant="white" color="dark">
              ⚡ Premium Cricket Ground
            </Badge>
            
            <Title
              order={1}
              c="white"
              size={{ base: '2rem', sm: '3rem' }}
              style={{ lineHeight: 1.2 }}
            >
              Book Your Cricket
              <br />
              Ground Today
            </Title>
            
            <Text
              size={{ base: 'md', sm: 'xl' }}
              c="rgba(255,255,255,0.95)"
              maw={600}
              mx="auto"
            >
              Professional cricket ground with world-class facilities.
              Easy online booking, instant confirmation, and secure payments.
            </Text>
            
            <Group gap="md" mt="md" justify="center">
              <Button
                component={Link}
                href="/bookings"
                size="xl"
                variant="white"
                color="dark"
                rightSection={<IconArrowRight size={20} />}
                styles={{
                  root: {
                    height: '60px',
                    fontSize: '18px',
                    fontWeight: 700,
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
                color="white"
                styles={{
                  root: {
                    height: '60px',
                    fontSize: '18px',
                    fontWeight: 700,
                    borderWidth: '2px',
                    borderColor: 'white',
                    color: 'white',
                  },
                }}
              >
                Check Booking
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* Features Grid */}
        <div>
          <Title order={2} ta="center" mb="xl" size={{ base: 'h2', sm: 'h1' }}>
            Why Choose Us?
          </Title>
          
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 4 }} spacing={{ base: 'md', sm: 'lg' }}>
            {features.map((feature, index) => (
              <Paper
                key={index}
                p={{ base: 'md', sm: 'xl' }}
                withBorder
                radius="md"
                style={{ textAlign: 'center', height: '100%' }}
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
        </div>

        {/* Benefits Section */}
        <Paper
          withBorder
          p={{ base: 'lg', sm: 'xl' }}
          radius="md"
          style={{ background: 'linear-gradient(to right, #f8f9fa, #e9ecef)' }}
        >
          <Stack gap="md">
            <Group gap="sm" justify="center">
              <ThemeIcon size={40} radius="md" color="teal">
                <IconStar size={24} />
              </ThemeIcon>
              <Title order={2} size={{ base: 'h3', sm: 'h2' }}>
                What You Get
              </Title>
            </Group>
            
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mt="md">
              {benefits.map((benefit, index) => (
                <Group key={index} gap="sm" wrap="nowrap">
                  <ThemeIcon color="green" size={24} radius="xl" variant="light">
                    <IconCheck size={16} />
                  </ThemeIcon>
                  <Text size="sm">{benefit}</Text>
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
            style={{ background: 'linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)' }}
          >
            <Stack gap="sm" align="center" ta="center">
              <ThemeIcon size={60} radius="xl" variant="white" color="orange">
                <IconClock24 size={32} />
              </ThemeIcon>
              <Title order={3} c="white" size={{ base: 'h4', sm: 'h3' }}>
                Day Time Rate
              </Title>
              <Title order={1} c="white" size={{ base: '2.5rem', sm: '3rem' }}>
                Rs 1,500
              </Title>
              <Text c="white" fw={500}>
                per hour
              </Text>
              <Text size="sm" c="rgba(255,255,255,0.9)" mt="xs">
                7:00 AM - 5:00 PM
              </Text>
            </Stack>
          </Paper>

          <Paper
            withBorder
            p={{ base: 'lg', sm: 'xl' }}
            radius="md"
            style={{ background: 'linear-gradient(135deg, #4B0082 0%, #8B008B 100%)' }}
          >
            <Stack gap="sm" align="center" ta="center">
              <ThemeIcon size={60} radius="xl" variant="white" color="grape">
                🌙
              </ThemeIcon>
              <Title order={3} c="white" size={{ base: 'h4', sm: 'h3' }}>
                Night Time Rate
              </Title>
              <Title order={1} c="white" size={{ base: '2.5rem', sm: '3rem' }}>
                Rs 2,000
              </Title>
              <Text c="white" fw={500}>
                per hour
              </Text>
              <Text size="sm" c="rgba(255,255,255,0.9)" mt="xs">
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
          style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}
        >
          <Stack gap="lg" align="center" ta="center">
            <Title order={2} c="white" size={{ base: 'h3', sm: 'h2' }}>
              Ready to Book Your Slot?
            </Title>
            <Text size={{ base: 'md', sm: 'lg' }} c="white" maw={600}>
              Join thousands of satisfied customers who trust us for their cricket ground needs.
              Book now and get instant confirmation!
            </Text>
            <Group gap="md" justify="center" mt="md">
              <Button
                component={Link}
                href="/bookings"
                size="xl"
                variant="white"
                color="dark"
                leftSection={<IconCalendarEvent size={20} />}
                styles={{
                  root: {
                    height: '60px',
                    fontSize: '18px',
                    fontWeight: 700,
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
                color="white"
                leftSection={<IconPhone size={20} />}
                styles={{
                  root: {
                    height: '60px',
                    fontSize: '18px',
                    fontWeight: 700,
                    borderWidth: '2px',
                    borderColor: 'white',
                    color: 'white',
                  },
                }}
              >
                Contact Us
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
