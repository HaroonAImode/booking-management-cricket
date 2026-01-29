/**
 * Public Footer Component
 * 
 * Purpose: Footer for public-facing pages.
 * Features:
 * - Company information
 * - Quick links
 * - Contact information with WhatsApp/Call options
 * - Social media links
 * - Copyright notice
 */

'use client';

import { Container, Group, Text, Stack, ActionIcon, Tooltip, Button, Popover, Box, Menu, SimpleGrid } from '@mantine/core';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import styles from './PublicFooter.module.css';
import { IconPhone, IconMail, IconBrandWhatsapp, IconBrandInstagram, IconBrandTiktok, IconChevronDown } from '@tabler/icons-react';

export default function PublicFooter() {
  const [contactMenuOpened, setContactMenuOpened] = useState(false);
  
  const phoneNumber = '03402639174';
  const formattedPhone = '0340-2639174';
  const whatsappLink = `https://wa.me/923402639174`;
  const callLink = `tel:${phoneNumber}`;
  
  const socialLinks = [
    {
      name: 'Instagram',
      username: '@powerplaycricketarena',
      link: 'https://instagram.com/powerplaycricketarena',
      icon: IconBrandInstagram,
      color: '#E4405F',
    },
    {
      name: 'TikTok',
      username: '@powerplaycricketarena',
      link: 'https://tiktok.com/@powerplaycricketarena',
      icon: IconBrandTiktok,
      color: '#000000',
    },
  ];

  return (
    <footer className={styles.footer}>
      <Container size="xl">
        {/* Main Footer Content */}
        <SimpleGrid 
          cols={{ base: 1, sm: 3 }} 
          spacing="xl" 
          py="xl"
        >
          {/* Company Info */}
          <Stack gap="md">
            <Text fw={700} c="white" size="lg">Powerplay Cricket Arena</Text>
            <Text size="sm" c="#F5B800" style={{ lineHeight: 1.6 }}>
              Professional cricket ground booking & premium sports facility
            </Text>
            
            {/* Contact Info */}
            <Stack gap="xs">
              {/* Email */}
              <Group gap="xs" align="flex-start">
                <IconMail size={18} color="#F5B800" />
                <Text 
                  component="a"
                  href="mailto:Powerplaycricketarena@gmail.com"
                  size="sm"
                  c="white"
                  style={{
                    textDecoration: 'none',
                    transition: 'color 200ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#F5B800')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
                >
                  Powerplaycricketarena@gmail.com
                </Text>
              </Group>
              
              {/* Phone with Menu */}
              <Group gap="xs" align="flex-start">
                <IconPhone size={18} color="#F5B800" />
                <Menu
                  width={200}
                  position="top"
                  withArrow
                  shadow="md"
                  opened={contactMenuOpened}
                  onChange={setContactMenuOpened}
                >
                  <Menu.Target>
                    <Group gap={4} style={{ cursor: 'pointer' }}>
                      <Text 
                        size="sm"
                        c="white"
                        style={{
                          transition: 'color 200ms ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#F5B800')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
                      >
                        {formattedPhone}
                      </Text>
                      <IconChevronDown size={14} color="#F5B800" />
                    </Group>
                  </Menu.Target>
                  
                  <Menu.Dropdown style={{ background: '#1a1a1a', borderColor: '#F5B800' }}>
                    <Menu.Label style={{ color: '#F5B800', fontWeight: 600 }}>
                      Contact Options
                    </Menu.Label>
                    
                    <Menu.Item
                      component="a"
                      href={whatsappLink}
                      target="_blank"
                      leftSection={<IconBrandWhatsapp size={16} color="#25D366" />}
                      style={{
                        color: 'white',
                        transition: 'all 200ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)';
                        e.currentTarget.style.color = '#25D366';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'white';
                      }}
                    >
                      Chat on WhatsApp
                    </Menu.Item>
                    
                    <Menu.Item
                      component="a"
                      href={callLink}
                      leftSection={<IconPhone size={16} color="#F5B800" />}
                      style={{
                        color: 'white',
                        transition: 'all 200ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(245, 184, 0, 0.1)';
                        e.currentTarget.style.color = '#F5B800';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'white';
                      }}
                    >
                      Make a Call
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Stack>
          </Stack>

          {/* Quick Links */}
          <Stack gap="md">
            <Text fw={600} c="#F5B800" size="lg">Quick Links</Text>
            {[
              { label: 'Home', href: '/' },
              { label: 'New Booking', href: '/bookings' },
              { label: 'Check Booking Status', href: '/bookings/check' },
              { label: 'Pricing & Packages', href: '/pricing' },
              { label: 'Gallery', href: '/gallery' },
            ].map((link) => (
              <Text
                key={link.href}
                component={Link}
                href={link.href}
                size="sm"
                c="white"
                style={{
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'color 200ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F5B800')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
              >
                {link.label}
              </Text>
            ))}
          </Stack>

          {/* Social Media Section */}
          <Stack gap="md">
            <Text fw={600} c="#F5B800" size="lg">Follow Us</Text>
            <Text size="sm" c="white" style={{ lineHeight: 1.6 }}>
              Stay connected for latest updates, offers, and cricket events
            </Text>
            
            {/* Social Media Icons */}
            <Group gap="md">
              {socialLinks.map((social) => (
                <Tooltip
                  key={social.name}
                  label={`Follow us on ${social.name}: ${social.username}`}
                  position="top"
                  withArrow
                  style={{ background: social.color, color: 'white' }}
                >
                  <ActionIcon
                    component="a"
                    href={social.link}
                    target="_blank"
                    size="lg"
                    radius="md"
                    variant="outline"
                    style={{
                      borderColor: social.color,
                      color: social.color,
                      transition: 'all 200ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = social.color;
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = social.color;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <social.icon size={20} />
                  </ActionIcon>
                </Tooltip>
              ))}
            </Group>
            
            {/* Social Media Text Links */}
            <Stack gap={4}>
              {socialLinks.map((social) => (
                <Group key={social.name} gap={6}>
                  <social.icon size={14} color={social.color} />
                  <Text
                    component="a"
                    href={social.link}
                    target="_blank"
                    size="xs"
                    c="white"
                    style={{
                      textDecoration: 'none',
                      transition: 'all 200ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = social.color;
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {social.name}: {social.username}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Stack>
        </SimpleGrid>

        {/* Copyright Section */}
        <Box py="md" style={{ borderTop: '1px solid rgba(245, 184, 0, 0.3)' }}>
          <Text 
            ta="center" 
            size="sm" 
            c="rgba(255, 255, 255, 0.7)"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span>© 2026 Powerplay Cricket Arena</span>
            <span style={{ color: '#F5B800' }}>•</span>
            <span>All rights reserved</span>
            <span style={{ color: '#F5B800' }}>•</span>
            <Text
              component={Link}
              href="/privacy"
              size="sm"
              c="rgba(255, 255, 255, 0.7)"
              style={{ textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F5B800')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
            >
              Privacy Policy
            </Text>
            <span style={{ color: '#F5B800' }}>•</span>
            <Text
              component={Link}
              href="/terms"
              size="sm"
              c="rgba(255, 255, 255, 0.7)"
              style={{ textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F5B800')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
            >
              Terms of Service
            </Text>
          </Text>
          
          {/* Quick Contact Buttons for Mobile */}
          <Group justify="center" gap="md" mt="md" className={styles.mobileContactButtons}>
            <Button
              component="a"
              href={whatsappLink}
              target="_blank"
              size="xs"
              variant="filled"
              leftSection={<IconBrandWhatsapp size={16} />}
              style={{
                background: '#25D366',
                color: 'white',
                border: 'none',
              }}
            >
              WhatsApp
            </Button>
            <Button
              component="a"
              href={callLink}
              size="xs"
              variant="outline"
              leftSection={<IconPhone size={16} />}
              style={{
                color: '#F5B800',
                borderColor: '#F5B800',
              }}
            >
              Call Now
            </Button>
          </Group>
        </Box>
      </Container>
    </footer>
  );
}