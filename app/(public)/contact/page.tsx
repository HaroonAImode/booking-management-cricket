/**
 * Contact Page
 * Contact information and inquiry form
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
  TextInput,
  Textarea,
  Button,
  Badge,
  Divider,
} from '@mantine/core';
import {
  IconPhone,
  IconMail,
  IconMapPin,
  IconClock,
  IconBrandWhatsapp,
  IconBrandFacebook,
  IconBrandInstagram,
  IconSend,
} from '@tabler/icons-react';

export default function ContactPage() {
  const contactInfo = [
    {
      icon: IconPhone,
      title: 'Phone',
      value: '+92-300-1234567',
      subtitle: 'Available 24/7',
      color: 'green',
      href: 'tel:+923001234567',
    },
    {
      icon: IconBrandWhatsapp,
      title: 'WhatsApp',
      value: '+92-300-1234567',
      subtitle: 'Quick response',
      color: 'teal',
      href: 'https://wa.me/923001234567',
    },
    {
      icon: IconMail,
      title: 'Email',
      value: 'info@cricketground.com',
      subtitle: 'We reply within 24 hours',
      color: 'blue',
      href: 'mailto:info@cricketground.com',
    },
    {
      icon: IconMapPin,
      title: 'Address',
      value: '123 Cricket Stadium Road',
      subtitle: 'City Center, Near Main Sports Complex',
      color: 'red',
      href: 'https://maps.google.com',
    },
  ];

  const operatingHours = [
    { day: 'Monday - Friday', hours: '6:00 AM - 11:00 PM' },
    { day: 'Saturday - Sunday', hours: '5:00 AM - 12:00 AM' },
    { day: 'Public Holidays', hours: '24 Hours' },
  ];

  const socialMedia = [
    { icon: IconBrandFacebook, name: 'Facebook', color: 'blue', href: '#' },
    { icon: IconBrandInstagram, name: 'Instagram', color: 'pink', href: '#' },
    { icon: IconBrandWhatsapp, name: 'WhatsApp', color: 'teal', href: '#' },
  ];

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <Badge size="lg" mb="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            Get In Touch
          </Badge>
          <Title order={1} mb="md">
            Contact Us
          </Title>
          <Text size="lg" c="dimmed" maw={700} mx="auto">
            Have questions? We're here to help! Reach out to us through any of the 
            channels below or fill out the inquiry form.
          </Text>
        </div>

        {/* Contact Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {contactInfo.map((contact, index) => (
            <Paper
              key={index}
              component="a"
              href={contact.href}
              target="_blank"
              p="xl"
              withBorder
              radius="md"
              h="100%"
              className="hover-lift"
              style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <Stack gap="md" align="center" ta="center">
                <ThemeIcon size={60} radius="xl" color={contact.color}>
                  <contact.icon size={32} />
                </ThemeIcon>
                <div>
                  <Text fw={600} size="sm" c="dimmed" mb={4}>
                    {contact.title}
                  </Text>
                  <Text fw={700} size="lg" mb={4}>
                    {contact.value}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {contact.subtitle}
                  </Text>
                </div>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>

        <Divider />

        {/* Operating Hours */}
        <Paper withBorder p="xl" radius="md">
          <Group gap="sm" mb="md">
            <ThemeIcon size={40} radius="md" color="orange">
              <IconClock size={24} />
            </ThemeIcon>
            <Title order={2}>Operating Hours</Title>
          </Group>
          <Stack gap="md">
            {operatingHours.map((schedule, index) => (
              <Group key={index} justify="space-between" p="sm" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <Text fw={600}>{schedule.day}</Text>
                <Badge size="lg" color="green" variant="light">
                  {schedule.hours}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Paper>

        {/* Inquiry Form */}
        <Paper withBorder p="xl" radius="md">
          <Stack gap="md">
            <div>
              <Title order={2} mb="xs">
                Send Us a Message
              </Title>
              <Text size="sm" c="dimmed">
                Fill out the form below and we'll get back to you as soon as possible
              </Text>
            </div>

            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Your Name"
                  placeholder="Enter your full name"
                  required
                  leftSection={<IconSend size={16} />}
                />
                <TextInput
                  label="Phone Number"
                  placeholder="03XX-XXXXXXX"
                  required
                  leftSection={<IconPhone size={16} />}
                />
              </SimpleGrid>
              
              <TextInput
                label="Email Address"
                placeholder="your@email.com"
                type="email"
                leftSection={<IconMail size={16} />}
              />
              
              <Textarea
                label="Your Message"
                placeholder="Tell us how we can help you..."
                required
                minRows={5}
              />
              
              <Button
                size="lg"
                fullWidth
                leftSection={<IconSend size={20} />}
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
              >
                Send Message
              </Button>
            </Stack>

            <Text size="xs" c="dimmed" ta="center">
              Note: This is a demo form. For immediate assistance, please call or WhatsApp us.
            </Text>
          </Stack>
        </Paper>

        {/* Social Media */}
        <Paper withBorder p="xl" radius="md" style={{ background: 'linear-gradient(to right, #f8f9fa, #e9ecef)' }}>
          <Stack gap="md" align="center" ta="center">
            <Title order={3}>Follow Us</Title>
            <Text size="sm" c="dimmed">
              Stay updated with our latest news and offers
            </Text>
            <Group gap="md">
              {socialMedia.map((social, index) => (
                <Paper
                  key={index}
                  component="a"
                  href={social.href}
                  target="_blank"
                  p="md"
                  withBorder
                  radius="md"
                  className="hover-lift"
                  style={{ textDecoration: 'none', cursor: 'pointer' }}
                >
                  <ThemeIcon size={50} radius="md" color={social.color}>
                    <social.icon size={28} />
                  </ThemeIcon>
                </Paper>
              ))}
            </Group>
          </Stack>
        </Paper>

        {/* Quick Contact CTA */}
        <Paper
          withBorder
          p="xl"
          radius="md"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <Stack gap="md" align="center" ta="center">
            <Title order={2} c="white">
              Need Immediate Help?
            </Title>
            <Text size="lg" c="white">
              Call us now or WhatsApp for instant response
            </Text>
            <Group gap="sm">
              <Button
                component="a"
                href="tel:+923001234567"
                size="lg"
                variant="white"
                leftSection={<IconPhone size={20} />}
              >
                Call Now
              </Button>
              <Button
                component="a"
                href="https://wa.me/923001234567"
                target="_blank"
                size="lg"
                variant="outline"
                color="white"
                leftSection={<IconBrandWhatsapp size={20} />}
                style={{ borderColor: 'white', color: 'white' }}
              >
                WhatsApp
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
