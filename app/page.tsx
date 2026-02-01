/**
 * Home Page (Public Route) - Premium Business Version
 * 
 * Purpose: Premium landing page for cricket booking business.
 * Features:
 * - Professional banner with booking CTA
 * - Premium animations and transitions
 * - Mobile-optimized responsive design
 * - Business-focused sections
 * - Integrated location and social media
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
  Image,
  Card,
  Flex,
  Anchor,
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
  IconMapPin,
  IconBrandInstagram,
  IconBrandTiktok,
  IconUsers,
  IconTrophy,
  IconBolt,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
    
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: IconBolt,
      title: 'Instant Booking',
      description: 'Book your slots instantly with real-time availability',
      color: '#F5B800',
      delay: 0,
    },
    {
      icon: IconTrophy,
      title: 'Professional Turf',
      description: 'International standard cricket turf with proper markings',
      color: '#40C057',
      delay: 100,
    },
    {
      icon: IconUsers,
      title: 'Group Discounts',
      description: 'Special rates for team bookings and tournaments',
      color: '#228BE6',
      delay: 200,
    },
    {
      icon: IconShield,
      title: 'Secure Payments',
      description: 'Multiple payment options with secure processing',
      color: '#FD7E14',
      delay: 300,
    },
  ];

  const benefits = [
    'Professional cricket ground with proper boundaries',
    'High-quality floodlights for night matches',
    'Modern changing rooms with lockers',
    'Cricket equipment rental available',
    'Professional coaching available',
    'Video recording facility for matches',
    'Secure parking for 50+ vehicles',
    'Refreshment counter with snacks',
  ];

  const socialLinks = [
    {
      icon: IconBrandInstagram,
      label: 'Instagram',
      link: 'https://www.instagram.com/powerplaycricketarena?igsh=MTA0c3NiOWR5aW9xeg==',
      color: '#E4405F',
      username: '@powerplaycricketarena',
    },
    {
      icon: IconBrandTiktok,
      label: 'TikTok',
      link: 'https://www.tiktok.com/@powerplaycricketarena?_r=1&_t=ZS-93SLIpFxSew',
      color: '#69C9D0',
      username: '@powerplaycricketarena',
    },
  ];

  const locationLink = 'https://maps.app.goo.gl/Mozvf2b5jXEq9KVn8';
  const whatsappLink = 'https://wa.me/923402639174';
  const phoneNumber = '0340-2639174';

  return (
    <Stack gap={0} style={{ overflow: 'hidden' }}>
      {/* Hero Banner Section */}
      <Box
        ref={heroRef}
        style={{
          position: 'relative',
          background: 'linear-gradient(rgba(26, 26, 26, 0.85), rgba(26, 26, 26, 0.95))',
          minHeight: { base: '70vh', sm: '85vh' },
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Background Image */}
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/banner.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: -1,
            opacity: 0.4,
          }}
        />
        
        {/* Animated overlay pattern */}
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(245, 184, 0, 0.1) 0%, transparent 50%)',
            zIndex: -1,
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />

        <Container size="xl" style={{ position: 'relative', zIndex: 1 }}>
          <SimpleGrid
            cols={{ base: 1, lg: 2 }}
            spacing={{ base: 'xl', lg: '80px' }}
            style={{ alignItems: 'center' }}
          >
            {/* Left Content */}
            <Stack
              gap={{ base: 'md', sm: 'xl' }}
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 800ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <Badge
                size="xl"
                radius="md"
                style={{
                  background: '#F5B800',
                  color: '#1A1A1A',
                  fontWeight: 900,
                  fontSize: { base: '0.8rem', sm: '1rem' },
                  padding: { base: '8px 16px', sm: '12px 24px' },
                  width: 'fit-content',
                  boxShadow: '0 4px 20px rgba(245, 184, 0, 0.3)',
                }}
              >
                ⚡ PREMIUM CRICKET FACILITY
              </Badge>

              <Title
                order={1}
                c="white"
                size={{ base: 'h1', sm: '3.5rem' }}
                style={{
                  lineHeight: 1.1,
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                }}
              >
                Experience
                <Text
                  component="span"
                  c="#F5B800"
                  inherit
                  style={{ display: 'block', marginTop: '0.2em' }}
                >
                  Professional Cricket
                </Text>
                At Its Best
              </Title>

              <Text
                size={{ base: 'md', sm: 'xl' }}
                c="#D1D1D1"
                style={{ lineHeight: 1.6 }}
              >
                PowerPlay Cricket Arena offers world-class facilities with professional turf,
                floodlights, and premium amenities. Book your slot today and elevate your
                cricket experience.
              </Text>

              {/* Hero CTA Buttons */}
              <Group
                gap="md"
                mt={{ base: 'md', sm: 'xl' }}
                wrap={{ base: 'wrap', sm: 'nowrap' }}
              >
                <Button
                  component={Link}
                  href="/bookings"
                  size={{ base: 'md', sm: 'lg' }}
                  rightSection={<IconArrowRight size={20} />}
                  styles={{
                    root: {
                      height: { base: '48px', sm: '56px' },
                      fontSize: { base: '16px', sm: '18px' },
                      fontWeight: 700,
                      background: '#F5B800',
                      color: '#1A1A1A',
                      borderRadius: '12px',
                      padding: '0 32px',
                      flex: { base: '1', sm: 'none' },
                      '&:hover': {
                        background: '#FFDD80',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(245, 184, 0, 0.4)',
                      },
                      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                  }}
                >
                  Book Now
                </Button>

                <Button
                  component={Link}
                  href="/bookings/check"
                  size={{ base: 'md', sm: 'lg' }}
                  variant="outline"
                  styles={{
                    root: {
                      height: { base: '48px', sm: '56px' },
                      fontSize: { base: '16px', sm: '18px' },
                      fontWeight: 700,
                      borderWidth: '2px',
                      borderColor: '#F5B800',
                      color: '#F5B800',
                      borderRadius: '12px',
                      padding: '0 32px',
                      flex: { base: '1', sm: 'none' },
                      '&:hover': {
                        background: 'rgba(245, 184, 0, 0.1)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                  }}
                >
                  Check Booking
                </Button>
              </Group>

              {/* Quick Info Row */}
              <Group
                gap={{ base: 'md', sm: 'xl' }}
                mt={{ base: 'lg', sm: 'xl' }}
                wrap="wrap"
              >
                <Group gap="xs">
                  <ThemeIcon size={32} radius="md" color="yellow" variant="light">
                    <IconPhone size={18} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" c="#D1D1D1" fw={500}>
                      Call Us
                    </Text>
                    <Anchor
                      href={`tel:${phoneNumber.replace('-', '')}`}
                      c="#F5B800"
                      fw={700}
                      size="sm"
                    >
                      {phoneNumber}
                    </Anchor>
                  </div>
                </Group>

                <Group gap="xs">
                  <ThemeIcon size={32} radius="md" color="yellow" variant="light">
                    <IconMapPin size={18} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" c="#D1D1D1" fw={500}>
                      Location
                    </Text>
                    <Anchor
                      href={locationLink}
                      target="_blank"
                      c="#F5B800"
                      fw={700}
                      size="sm"
                    >
                      View on Maps
                    </Anchor>
                  </div>
                </Group>
              </Group>
            </Stack>

            {/* Right Content - Stats Cards */}
            <Box
              style={{
                display: { base: 'none', lg: 'grid' },
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
              }}
            >
              {[
                { value: '24/7', label: 'Hours Available', icon: IconClock24 },
                { value: 'Rs 1,500', label: 'Day Rate Per Hour', icon: IconCurrencyRupee },
                { value: 'Rs 2,000', label: 'Night Rate Per Hour', icon: IconStar },
                { value: '100+', label: 'Teams Played', icon: IconUsers },
              ].map((stat, index) => (
                <Card
                  key={index}
                  padding="lg"
                  radius="lg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(245, 184, 0, 0.2)',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                    transition: `all 800ms cubic-bezier(0.4, 0, 0.2, 1) ${index * 100}ms`,
                  }}
                >
                  <Stack gap="xs" align="center" ta="center">
                    <ThemeIcon
                      size={50}
                      radius="xl"
                      variant="light"
                      color="yellow"
                    >
                      <stat.icon size={24} />
                    </ThemeIcon>
                    <Text
                      size="2rem"
                      fw={900}
                      c="white"
                      style={{ lineHeight: 1 }}
                    >
                      {stat.value}
                    </Text>
                    <Text size="sm" c="#D1D1D1" fw={500}>
                      {stat.label}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box
        py={{ base: 'xl', sm: '80px' }}
        style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #2A2A2A 100%)' }}
      >
        <Container size="xl">
          <Stack gap={{ base: 'xl', sm: '60px' }}>
            <Stack gap="md" ta="center" className="scroll-animate">
              <Badge
                size="lg"
                variant="outline"
                color="yellow"
                style={{ width: 'fit-content', margin: '0 auto' }}
              >
                WHY CHOOSE US
              </Badge>
              <Title
                order={2}
                c="white"
                size={{ base: 'h2', sm: '2.5rem' }}
                style={{ fontWeight: 800 }}
              >
                Premium Cricket Experience
              </Title>
              <Text
                size={{ base: 'md', sm: 'lg' }}
                c="#D1D1D1"
                maw={600}
                mx="auto"
              >
                We provide world-class facilities that make every match memorable
              </Text>
            </Stack>

            <SimpleGrid
              cols={{ base: 1, sm: 2, lg: 4 }}
              spacing={{ base: 'md', sm: 'lg' }}
            >
              {features.map((feature, index) => (
                <Card
                  key={index}
                  padding={{ base: 'lg', sm: 'xl' }}
                  radius="lg"
                  className="scroll-animate"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(245, 184, 0, 0.1)',
                    transition: 'all 300ms ease',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderColor: feature.color,
                      transform: 'translateY(-8px)',
                    },
                  }}
                >
                  <Stack gap="md">
                    <ThemeIcon
                      size={60}
                      radius="xl"
                      style={{
                        background: `linear-gradient(135deg, ${feature.color} 0%, ${feature.color}80 100%)`,
                        color: '#1A1A1A',
                        width: '60px',
                        height: '60px',
                      }}
                    >
                      <feature.icon size={28} />
                    </ThemeIcon>
                    <div>
                      <Text fw={800} size="lg" c="white" mb={4}>
                        {feature.title}
                      </Text>
                      <Text size="sm" c="#D1D1D1">
                        {feature.description}
                      </Text>
                    </div>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box
        py={{ base: 'xl', sm: '80px' }}
        style={{ background: 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)' }}
      >
        <Container size="xl">
          <Stack gap={{ base: 'xl', sm: '60px' }}>
            <Stack gap="md" ta="center" className="scroll-animate">
              <Badge
                size="lg"
                variant="outline"
                color="yellow"
                style={{ width: 'fit-content', margin: '0 auto' }}
              >
                TRANSPARENT PRICING
              </Badge>
              <Title
                order={2}
                c="white"
                size={{ base: 'h2', sm: '2.5rem' }}
                style={{ fontWeight: 800 }}
              >
                Competitive Rates, Premium Quality
              </Title>
            </Stack>

            <SimpleGrid
              cols={{ base: 1, md: 2 }}
              spacing={{ base: 'md', sm: 'lg' }}
            >
              {/* Day Rate Card */}
              <Card
                padding={{ base: 'lg', sm: 'xl' }}
                radius="lg"
                className="scroll-animate"
                style={{
                  background: 'linear-gradient(135deg, #F5B800 0%, #FFD700 100%)',
                  border: '2px solid #1A1A1A',
                  transition: 'all 300ms ease',
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: '0 20px 40px rgba(245, 184, 0, 0.3)',
                  },
                }}
              >
                <Stack gap="md" align="center" ta="center">
                  <ThemeIcon
                    size={70}
                    radius="xl"
                    style={{
                      background: '#1A1A1A',
                      color: '#F5B800',
                      width: '70px',
                      height: '70px',
                    }}
                  >
                    <IconClock24 size={32} />
                  </ThemeIcon>
                  <div>
                    <Title order={3} c="#1A1A1A" size="h3" fw={900}>
                      Day Time Package
                    </Title>
                    <Text size="sm" c="#333" fw={600}>
                      7:00 AM - 5:00 PM
                    </Text>
                  </div>
                  <Box>
                    <Text
                      size={{ base: '3rem', sm: '3.5rem' }}
                      fw={900}
                      c="#1A1A1A"
                      style={{ lineHeight: 1 }}
                    >
                      Rs 1,500
                    </Text>
                    <Text size="lg" fw={700} c="#1A1A1A">
                      per hour
                    </Text>
                  </Box>
                  <Button
                    component={Link}
                    href="/bookings"
                    size="lg"
                    variant="filled"
                    color="dark"
                    mt="md"
                    styles={{
                      root: {
                        fontWeight: 700,
                        padding: '12px 32px',
                      },
                    }}
                  >
                    Book Day Slot
                  </Button>
                </Stack>
              </Card>

              {/* Night Rate Card */}
              <Card
                padding={{ base: 'lg', sm: 'xl' }}
                radius="lg"
                className="scroll-animate"
                style={{
                  background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
                  border: '2px solid #F5B800',
                  transition: 'all 300ms ease',
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: '0 20px 40px rgba(245, 184, 0, 0.2)',
                  },
                }}
              >
                <Stack gap="md" align="center" ta="center">
                  <ThemeIcon
                    size={70}
                    radius="xl"
                    style={{
                      background: '#F5B800',
                      color: '#1A1A1A',
                      width: '70px',
                      height: '70px',
                    }}
                  >
                    <IconStar size={32} />
                  </ThemeIcon>
                  <div>
                    <Title order={3} c="#F5B800" size="h3" fw={900}>
                      Night Time Package
                    </Title>
                    <Text size="sm" c="#D1D1D1" fw={600}>
                      5:00 PM - 7:00 AM
                    </Text>
                  </div>
                  <Box>
                    <Text
                      size={{ base: '3rem', sm: '3.5rem' }}
                      fw={900}
                      c="white"
                      style={{ lineHeight: 1 }}
                    >
                      Rs 2,000
                    </Text>
                    <Text size="lg" fw={700} c="#F5B800">
                      per hour
                    </Text>
                  </Box>
                  <Button
                    component={Link}
                    href="/bookings"
                    size="lg"
                    variant="filled"
                    color="yellow"
                    mt="md"
                    styles={{
                      root: {
                        fontWeight: 700,
                        padding: '12px 32px',
                      },
                    }}
                  >
                    Book Night Slot
                  </Button>
                </Stack>
              </Card>
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box
        py={{ base: 'xl', sm: '80px' }}
        style={{ background: '#1A1A1A' }}
      >
        <Container size="xl">
          <SimpleGrid
            cols={{ base: 1, lg: 2 }}
            spacing={{ base: 'xl', lg: '80px' }}
            style={{ alignItems: 'center' }}
          >
            {/* Left - Image */}
            <Box className="scroll-animate">
              <Box
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: '2px solid #F5B800',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                }}
              >
                <Image
                  src="/banner.png"
                  alt="PowerPlay Cricket Arena Facilities"
                  radius="lg"
                  style={{
                    width: '100%',
                    height: '400px',
                    objectFit: 'cover',
                    transition: 'transform 500ms ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Right - Benefits List */}
            <Stack gap="xl" className="scroll-animate">
              <Stack gap="md">
                <Badge
                  size="lg"
                  variant="outline"
                  color="yellow"
                  style={{ width: 'fit-content' }}
                >
                  PREMIUM FACILITIES
                </Badge>
                <Title
                  order={2}
                  c="white"
                  size={{ base: 'h2', sm: '2.5rem' }}
                  style={{ fontWeight: 800 }}
                >
                  World-Class Amenities
                </Title>
                <Text size={{ base: 'md', sm: 'lg' }} c="#D1D1D1">
                  Everything you need for a perfect cricket experience
                </Text>
              </Stack>

              <SimpleGrid
                cols={{ base: 1, sm: 2 }}
                spacing="md"
              >
                {benefits.map((benefit, index) => (
                  <Group
                    key={index}
                    gap="sm"
                    wrap="nowrap"
                    style={{
                      opacity: 0,
                      animation: `fadeInUp 500ms ease ${index * 100}ms forwards`,
                    }}
                  >
                    <ThemeIcon
                      size={28}
                      radius="xl"
                      style={{
                        background: '#F5B800',
                        color: '#1A1A1A',
                        flexShrink: 0,
                      }}
                    >
                      <IconCheck size={16} />
                    </ThemeIcon>
                    <Text size="sm" c="white" fw={500}>
                      {benefit}
                    </Text>
                  </Group>
                ))}
              </SimpleGrid>
            </Stack>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Social & Location Section */}
      <Box
        py={{ base: 'xl', sm: '80px' }}
        style={{
          background: 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)',
        }}
      >
        <Container size="xl">
          <SimpleGrid
            cols={{ base: 1, lg: 2 }}
            spacing={{ base: 'xl', lg: '80px' }}
            style={{ alignItems: 'center' }}
          >
            {/* Social Media Section */}
            <Stack gap="xl" className="scroll-animate">
              <Stack gap="md">
                <Badge
                  size="lg"
                  variant="outline"
                  color="yellow"
                  style={{ width: 'fit-content' }}
                >
                  STAY CONNECTED
                </Badge>
                <Title
                  order={2}
                  c="white"
                  size={{ base: 'h2', sm: '2.5rem' }}
                  style={{ fontWeight: 800 }}
                >
                  Follow Our Journey
                </Title>
                <Text size={{ base: 'md', sm: 'lg' }} c="#D1D1D1">
                  Join our community for updates, tournaments, and cricket tips
                </Text>
              </Stack>

              <SimpleGrid cols={{ base: 2, sm: 2 }} spacing="md">
                {socialLinks.map((social, index) => (
                  <Card
                    key={index}
                    padding="lg"
                    radius="lg"
                    component="a"
                    href={social.link}
                    target="_blank"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${social.color}40`,
                      cursor: 'pointer',
                      transition: 'all 300ms ease',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderColor: social.color,
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    <Stack gap="sm" align="center" ta="center">
                      <ThemeIcon
                        size={50}
                        radius="xl"
                        style={{
                          background: social.color,
                          color: 'white',
                          width: '50px',
                          height: '50px',
                        }}
                      >
                        <social.icon size={24} />
                      </ThemeIcon>
                      <div>
                        <Text fw={700} size="md" c="white">
                          {social.label}
                        </Text>
                        <Text size="xs" c="#D1D1D1">
                          {social.username}
                        </Text>
                      </div>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>

              <Button
                component={Link}
                href={whatsappLink}
                target="_blank"
                size="lg"
                variant="outline"
                color="green"
                leftSection={<IconPhone size={20} />}
                styles={{
                  root: {
                    fontWeight: 700,
                    borderWidth: '2px',
                  },
                }}
              >
                Chat on WhatsApp
              </Button>
            </Stack>

            {/* Location Section */}
            <Stack gap="xl" className="scroll-animate">
              <Stack gap="md">
                <Badge
                  size="lg"
                  variant="outline"
                  color="yellow"
                  style={{ width: 'fit-content' }}
                >
                  FIND US
                </Badge>
                <Title
                  order={2}
                  c="white"
                  size={{ base: 'h2', sm: '2.5rem' }}
                  style={{ fontWeight: 800 }}
                >
                  Visit Our Arena
                </Title>
                <Text size={{ base: 'md', sm: 'lg' }} c="#D1D1D1">
                  Located at a prime location with easy access
                </Text>
              </Stack>

              <Card
                padding="lg"
                radius="lg"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(245, 184, 0, 0.2)',
                }}
              >
                <Stack gap="md">
                  <Group gap="md">
                    <ThemeIcon
                      size={50}
                      radius="xl"
                      variant="light"
                      color="yellow"
                    >
                      <IconMapPin size={24} />
                    </ThemeIcon>
                    <div>
                      <Text fw={700} size="lg" c="white">
                        PowerPlay Cricket Arena
                      </Text>
                      <Text size="sm" c="#D1D1D1">
                        Premium Indoor Cricket Facility
                      </Text>
                    </div>
                  </Group>

                  <Button
                    component="a"
                    href={locationLink}
                    target="_blank"
                    size="lg"
                    variant="filled"
                    color="yellow"
                    leftSection={<IconMapPin size={20} />}
                    styles={{
                      root: {
                        fontWeight: 700,
                      },
                    }}
                  >
                    Open in Google Maps
                  </Button>

                  <Text size="sm" c="#D1D1D1" ta="center">
                    Open daily from 7:00 AM to 12:00 AM
                  </Text>
                </Stack>
              </Card>
            </Stack>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Final CTA Section */}
      <Box
        py={{ base: 'xl', sm: '80px' }}
        style={{
          background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background elements */}
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 80% 20%, rgba(245, 184, 0, 0.1) 0%, transparent 50%)',
            zIndex: 0,
          }}
        />

        <Container size="xl" style={{ position: 'relative', zIndex: 1 }}>
          <Card
            padding={{ base: 'xl', sm: '60px' }}
            radius="xl"
            className="scroll-animate"
            style={{
              background: 'linear-gradient(135deg, rgba(245, 184, 0, 0.1) 0%, rgba(245, 184, 0, 0.05) 100%)',
              border: '2px solid rgba(245, 184, 0, 0.3)',
              backdropFilter: 'blur(10px)',
              textAlign: 'center',
            }}
          >
            <Stack gap={{ base: 'lg', sm: 'xl' }} align="center">
              <Title
                order={2}
                c="white"
                size={{ base: 'h2', sm: '2.5rem' }}
                style={{ fontWeight: 900 }}
              >
                Ready to <Text component="span" c="#F5B800">Book Your Slot</Text>?
              </Title>
              
              <Text
                size={{ base: 'md', sm: 'lg' }}
                c="#D1D1D1"
                maw={600}
                style={{ lineHeight: 1.6 }}
              >
                Join thousands of satisfied players at PowerPlay Cricket Arena.
                Book now and experience world-class cricket facilities!
              </Text>

              <Group
                gap="md"
                justify="center"
                wrap={{ base: 'wrap', sm: 'nowrap' }}
              >
                <Button
                  component={Link}
                  href="/bookings"
                  size="xl"
                  rightSection={<IconArrowRight size={24} />}
                  styles={{
                    root: {
                      height: '60px',
                      fontSize: '18px',
                      fontWeight: 800,
                      background: '#F5B800',
                      color: '#1A1A1A',
                      borderRadius: '12px',
                      padding: '0 40px',
                      flex: { base: '1', sm: 'none' },
                      '&:hover': {
                        background: '#FFDD80',
                        transform: 'translateY(-3px)',
                        boxShadow: '0 10px 30px rgba(245, 184, 0, 0.4)',
                      },
                      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                  }}
                >
                  Book Your Slot
                </Button>

                <Button
                  component="a"
                  href={`tel:${phoneNumber.replace('-', '')}`}
                  size="xl"
                  variant="outline"
                  leftSection={<IconPhone size={24} />}
                  styles={{
                    root: {
                      height: '60px',
                      fontSize: '18px',
                      fontWeight: 800,
                      borderWidth: '2px',
                      borderColor: '#F5B800',
                      color: '#F5B800',
                      borderRadius: '12px',
                      padding: '0 40px',
                      flex: { base: '1', sm: 'none' },
                      '&:hover': {
                        background: 'rgba(245, 184, 0, 0.1)',
                        transform: 'translateY(-3px)',
                      },
                      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                  }}
                >
                  Call Now
                </Button>
              </Group>
            </Stack>
          </Card>
        </Container>
      </Box>

      {/* Global Animations CSS */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.2;
          }
        }
        
        .animate-fade-in {
          animation: fadeInUp 800ms ease forwards;
        }
        
        .scroll-animate {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 800ms ease, transform 800ms ease;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .scroll-animate {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Stack>
  );
}