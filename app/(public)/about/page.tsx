/**
 * About Page
 * Information about the cricket ground and facilities
 */

'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Group,
  List,
  Divider,
  Badge,
  Box,
} from '@mantine/core';
import {
  IconUsers,
  IconClock,
  IconMapPin,
  IconBuilding,
  IconShield,
  IconStar,
  IconTrophy,
  IconHeart,
} from '@tabler/icons-react';

export default function AboutPage() {
  const features = [
    {
      icon: IconBuilding,
      title: 'Professional Ground',
      description: 'Full-size cricket ground with premium turf and professional lighting',
      color: 'green',
    },
    {
      icon: IconShield,
      title: 'Safety First',
      description: 'High-quality safety equipment and well-maintained facilities',
      color: 'blue',
    },
    {
      icon: IconClock,
      title: '24/7 Available',
      description: 'Book slots anytime - day or night rates available',
      color: 'orange',
    },
    {
      icon: IconUsers,
      title: 'All Skill Levels',
      description: 'Perfect for casual games, practice sessions, and tournaments',
      color: 'grape',
    },
  ];

  const facilities = [
    'Professional cricket pitch with quality turf',
    'High-quality practice nets',
    'Floodlights for night matches',
    'Changing rooms and washrooms',
    'Secure parking facility',
    'Drinking water and refreshments',
    'First aid medical kit',
    'Professional umpiring equipment',
  ];

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Hero Section */}
        <Box style={{ textAlign: 'center' }}>
          <Badge size="lg" mb="md" variant="gradient" gradient={{ from: 'green', to: 'teal' }}>
            About Us
          </Badge>
          <Title order={1} mb="md">
            Premium Cricket Ground
          </Title>
          <Text size="lg" c="dimmed" maw={700} mx="auto">
            Your premier destination for cricket in the heart of the city. 
            We provide world-class facilities for players of all levels.
          </Text>
        </Box>

        {/* Mission Statement */}
        <Paper withBorder p="xl" radius="md" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Stack gap="md" align="center">
            <ThemeIcon size={60} radius="xl" variant="light" color="white">
              <IconHeart size={32} />
            </ThemeIcon>
            <Title order={2} c="white" ta="center">
              Our Mission
            </Title>
            <Text size="lg" c="white" ta="center" maw={700}>
              To provide a safe, professional, and accessible cricket ground where players 
              can practice, compete, and enjoy the sport they love. We're committed to 
              fostering cricket culture and supporting the community.
            </Text>
          </Stack>
        </Paper>

        {/* Features Grid */}
        <div>
          <Title order={2} mb="xl" ta="center">
            Why Choose Us?
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {features.map((feature, index) => (
              <Paper key={index} p="lg" withBorder radius="md" h="100%" className="hover-lift">
                <Stack gap="md">
                  <ThemeIcon size={50} radius="md" color={feature.color}>
                    <feature.icon size={28} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="lg" mb={4}>
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

        <Divider />

        {/* Facilities Section */}
        <Paper withBorder p="xl" radius="md">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={40} radius="md" color="green">
                <IconStar size={24} />
              </ThemeIcon>
              <Title order={2}>Our Facilities</Title>
            </Group>
            <Text c="dimmed" size="sm" mb="xs">
              We offer top-notch facilities to ensure you have the best cricket experience:
            </Text>
            <List
              spacing="sm"
              size="sm"
              icon={
                <ThemeIcon color="green" size={24} radius="xl">
                  <IconTrophy size={16} />
                </ThemeIcon>
              }
            >
              {facilities.map((facility, index) => (
                <List.Item key={index}>
                  <Text>{facility}</Text>
                </List.Item>
              ))}
            </List>
          </Stack>
        </Paper>

        {/* Location Section */}
        <Paper withBorder p="xl" radius="md" style={{ background: 'linear-gradient(to right, #f8f9fa, #e9ecef)' }}>
          <Group gap="md" align="flex-start">
            <ThemeIcon size={50} radius="md" color="red">
              <IconMapPin size={28} />
            </ThemeIcon>
            <div style={{ flex: 1 }}>
              <Title order={3} mb="xs">
                Find Us
              </Title>
              <Text size="sm" c="dimmed" mb="xs">
                Located in a convenient location with easy access
              </Text>
              <Text fw={500}>
                123 Cricket Stadium Road, City Center
              </Text>
              <Text c="dimmed" size="sm">
                Near Main Sports Complex
              </Text>
            </div>
          </Group>
        </Paper>

        {/* Stats Section */}
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
          <Paper p="md" withBorder radius="md" ta="center">
            <Text size="xl" fw={700} c="green">
              5000+
            </Text>
            <Text size="sm" c="dimmed">
              Happy Customers
            </Text>
          </Paper>
          <Paper p="md" withBorder radius="md" ta="center">
            <Text size="xl" fw={700} c="blue">
              10000+
            </Text>
            <Text size="sm" c="dimmed">
              Matches Played
            </Text>
          </Paper>
          <Paper p="md" withBorder radius="md" ta="center">
            <Text size="xl" fw={700} c="orange">
              5+
            </Text>
            <Text size="sm" c="dimmed">
              Years of Service
            </Text>
          </Paper>
        </SimpleGrid>

        {/* CTA Section */}
        <Paper withBorder p="xl" radius="md" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
          <Stack gap="md" align="center">
            <Title order={2} c="white" ta="center">
              Ready to Play?
            </Title>
            <Text size="lg" c="white" ta="center">
              Book your slot now and experience the best cricket ground in the city!
            </Text>
            <Group gap="sm">
              <a href="/bookings" style={{ textDecoration: 'none' }}>
                <Paper
                  component="button"
                  p="md"
                  radius="md"
                  style={{
                    border: 'none',
                    background: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '16px',
                  }}
                >
                  Book Now
                </Paper>
              </a>
              <a href="/contact" style={{ textDecoration: 'none' }}>
                <Paper
                  component="button"
                  p="md"
                  radius="md"
                  style={{
                    border: '2px solid white',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '16px',
                  }}
                >
                  Contact Us
                </Paper>
              </a>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
