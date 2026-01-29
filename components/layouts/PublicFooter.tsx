/**
 * Public Footer Component
 * 
 * Purpose: Footer for public-facing pages.
 * Features:
 * - Company information
 * - Quick links
 * - Contact information with WhatsApp/Call options
 * - Social media links with improved visibility
 * - Location with Google Maps link
 * - Copyright notice
 */

'use client';

import { Container, Group, Text, Stack, ActionIcon, Tooltip, Button, Menu, SimpleGrid } from '@mantine/core';
import Link from 'next/link';
import { useState } from 'react';
import styles from './PublicFooter.module.css';
import { 
  IconPhone, 
  IconMail, 
  IconBrandWhatsapp, 
  IconBrandInstagram, 
  IconBrandTiktok, 
  IconChevronDown, 
  IconMapPin,
  IconClock
} from '@tabler/icons-react';

export default function PublicFooter() {
  const [contactMenuOpened, setContactMenuOpened] = useState(false);
  
  const phoneNumber = '03402639174';
  const formattedPhone = '0340-2639174';
  const whatsappLink = `https://wa.me/923402639174`;
  const callLink = `tel:${phoneNumber}`;
  const locationLink = 'https://maps.app.goo.gl/Mozvf2b5jXEq9KVn8';
  const emailAddress = 'Powerplaycricketarena@gmail.com';
  
  const socialLinks = [
    {
      name: 'Instagram',
      username: '@powerplaycricketarena',
      link: 'https://www.instagram.com/powerplaycricketarena?igsh=MTA0c3NiOWR5aW9xeg==',
      icon: IconBrandInstagram,
      color: '#E4405F',
      bgColor: 'rgba(228, 64, 95, 0.1)',
    },
    {
      name: 'TikTok',
      username: '@powerplaycricketarena',
      link: 'https://www.tiktok.com/@powerplaycricketarena?_r=1&_t=ZS-93SLIpFxSew',
      icon: IconBrandTiktok,
      color: '#69C9D0', // TikTok's blue color instead of black
      bgColor: 'rgba(105, 201, 208, 0.1)',
    },
  ];

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'New Booking', href: '/bookings' },
    { label: 'Check Booking Status', href: '/bookings/check' },
    { label: 'Pricing & Packages', href: '/pricing' },
    { label: 'Gallery', href: '/gallery' },
  ];

  const businessHours = [
    { day: 'Mon - Fri', time: '6:00 AM - 11:00 PM' },
    { day: 'Sat - Sun', time: '5:00 AM - 12:00 AM' },
    { day: 'Holidays', time: '24 Hours' },
  ];

  return (
    <footer className={styles.footer}>
      <Container size="xl">
        {/* Main Footer Content - Better mobile layout */}
        <div className={styles.footerContent}>
          
          {/* Company Info & Contact - First column for mobile */}
          <div className={styles.footerColumn}>
            <Stack gap="md">
              <div>
                <Text fw={800} c="white" size="xl" className={styles.companyName}>
                  Powerplay Cricket Arena
                </Text>
                <Text size="sm" c="#F5B800" className={styles.tagline}>
                  Premium Cricket Ground & Sports Facility
                </Text>
              </div>
              
              {/* Contact Info */}
              <Stack gap="xs">
                {/* Email */}
                <Group gap="xs" align="flex-start" className={styles.contactItem}>
                  <div className={styles.iconWrapper}>
                    <IconMail size={18} color="#F5B800" />
                  </div>
                  <Text 
                    component="a"
                    href={`mailto:${emailAddress}`}
                    size="sm"
                    c="white"
                    className={styles.contactLink}
                  >
                    {emailAddress}
                  </Text>
                </Group>
                
                {/* Phone */}
                <Group gap="xs" align="flex-start" className={styles.contactItem}>
                  <div className={styles.iconWrapper}>
                    <IconPhone size={18} color="#F5B800" />
                  </div>
                  <Menu
                    width={200}
                    position="top"
                    withArrow
                    shadow="md"
                    opened={contactMenuOpened}
                    onChange={setContactMenuOpened}
                  >
                    <Menu.Target>
                      <Group gap={4} className={styles.phoneNumber}>
                        <Text 
                          size="sm"
                          c="white"
                          className={styles.contactLink}
                        >
                          {formattedPhone}
                        </Text>
                        <IconChevronDown size={14} color="#F5B800" />
                      </Group>
                    </Menu.Target>
                    
                    <Menu.Dropdown className={styles.contactDropdown}>
                      <Menu.Label className={styles.dropdownLabel}>
                        Contact Options
                      </Menu.Label>
                      
                      <Menu.Item
                        component="a"
                        href={whatsappLink}
                        target="_blank"
                        leftSection={<IconBrandWhatsapp size={16} color="#25D366" />}
                        className={styles.dropdownItem}
                      >
                        Chat on WhatsApp
                      </Menu.Item>
                      
                      <Menu.Item
                        component="a"
                        href={callLink}
                        leftSection={<IconPhone size={16} color="#F5B800" />}
                        className={styles.dropdownItem}
                      >
                        Make a Call
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
                
                {/* Location */}
                <Group gap="xs" align="flex-start" className={styles.contactItem}>
                  <div className={styles.iconWrapper}>
                    <IconMapPin size={18} color="#F5B800" />
                  </div>
                  <Text 
                    component="a"
                    href={locationLink}
                    target="_blank"
                    size="sm"
                    c="white"
                    className={styles.contactLink}
                  >
                    View on Google Maps
                  </Text>
                </Group>
              </Stack>
              
              {/* Quick Contact Buttons - Mobile Only */}
              <Group gap="sm" className={styles.mobileContactButtons}>
                <Button
                  component="a"
                  href={whatsappLink}
                  target="_blank"
                  size="sm"
                  variant="filled"
                  leftSection={<IconBrandWhatsapp size={16} />}
                  className={styles.whatsappButton}
                >
                  WhatsApp
                </Button>
                <Button
                  component="a"
                  href={callLink}
                  size="sm"
                  variant="outline"
                  leftSection={<IconPhone size={16} />}
                  className={styles.callButton}
                >
                  Call Now
                </Button>
              </Group>
            </Stack>
          </div>

          {/* Quick Links & Business Hours - Second column */}
          <div className={styles.footerColumn}>
            <SimpleGrid cols={2} spacing="xl" className={styles.quickLinksGrid}>
              <Stack gap="md">
                <Text fw={600} c="#F5B800" size="lg" className={styles.sectionTitle}>
                  Quick Links
                </Text>
                <Stack gap="xs">
                  {quickLinks.map((link) => (
                    <Text
                      key={link.href}
                      component={Link}
                      href={link.href}
                      size="sm"
                      c="white"
                      className={styles.navLink}
                    >
                      {link.label}
                    </Text>
                  ))}
                </Stack>
              </Stack>
              
              <Stack gap="md">
                <Text fw={600} c="#F5B800" size="lg" className={styles.sectionTitle}>
                  Business Hours
                </Text>
                <Stack gap="xs">
                  {businessHours.map((schedule, index) => (
                    <div key={index} className={styles.businessHours}>
                      <Group gap="xs">
                        <IconClock size={14} color="#F5B800" />
                        <Text size="sm" c="white" fw={500}>{schedule.day}</Text>
                      </Group>
                      <Text size="sm" c="#F5B800" fw={600}>{schedule.time}</Text>
                    </div>
                  ))}
                </Stack>
              </Stack>
            </SimpleGrid>
          </div>

          {/* Social Media - Third column */}
          <div className={styles.footerColumn}>
            <Stack gap="md">
              <Text fw={600} c="#F5B800" size="lg" className={styles.sectionTitle}>
                Follow Us
              </Text>
              <Text size="sm" c="white" className={styles.socialDescription}>
                Stay updated with latest offers, tournaments, and cricket tips
              </Text>
              
              {/* Social Media Icons */}
              <Group gap="md" justify="center" className={styles.socialIcons}>
                {socialLinks.map((social) => (
                  <Tooltip
                    key={social.name}
                    label={`Follow us on ${social.name}`}
                    position="top"
                    withArrow
                    className={styles.socialTooltip}
                    style={{ 
                      background: social.color,
                      color: social.name === 'TikTok' ? 'black' : 'white'
                    }}
                  >
                    <ActionIcon
                      component="a"
                      href={social.link}
                      target="_blank"
                      size={50}
                      radius="md"
                      className={styles.socialIcon}
                      style={{
                        background: social.bgColor,
                        borderColor: social.color,
                        color: social.color,
                      }}
                    >
                      <social.icon size={24} />
                    </ActionIcon>
                  </Tooltip>
                ))}
              </Group>
              
              {/* Social Media Links */}
              <Stack gap={6} className={styles.socialLinks}>
                {socialLinks.map((social) => (
                  <Group key={social.name} gap={8} wrap="nowrap">
                    <social.icon size={16} color={social.color} />
                    <Text
                      component="a"
                      href={social.link}
                      target="_blank"
                      size="sm"
                      c="white"
                      className={styles.socialLink}
                    >
                      <span style={{ fontWeight: 500, color: social.color }}>{social.name}</span>
                      <span style={{ marginLeft: '4px', opacity: 0.9 }}>- {social.username}</span>
                    </Text>
                  </Group>
                ))}
              </Stack>
              
              {/* Follow CTA */}
              <Text size="xs" c="#F5B800" fw={500} ta="center" className={styles.followCTA}>
                Click to follow us for daily updates!
              </Text>
            </Stack>
          </div>
        </div>

        {/* Copyright Section */}
        <div className={styles.copyrightSection}>
          <Text 
            size="sm" 
            c="rgba(255, 255, 255, 0.7)"
            ta="center"
            className={styles.copyrightText}
          >
            <span>© 2024 Powerplay Cricket Arena</span>
            <span className={styles.separator}>•</span>
            <span>All rights reserved</span>
            <span className={styles.separator}>•</span>
            <Text
              component={Link}
              href="/privacy"
              size="sm"
              c="rgba(255, 255, 255, 0.7)"
              className={styles.legalLink}
            >
              Privacy Policy
            </Text>
            <span className={styles.separator}>•</span>
            <Text
              component={Link}
              href="/terms"
              size="sm"
              c="rgba(255, 255, 255, 0.7)"
              className={styles.legalLink}
            >
              Terms of Service
            </Text>
          </Text>
        </div>
      </Container>
    </footer>
  );
}