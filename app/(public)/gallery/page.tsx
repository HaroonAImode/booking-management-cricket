/**
 * Gallery Page
 * Displays cricket arena photos
 */

'use client';

import { Box, Container, Title, Text, SimpleGrid, Paper, Stack } from '@mantine/core';
import Image from 'next/image';
import { IconPhoto } from '@tabler/icons-react';

export default function GalleryPage() {
  const images = [
    {
      src: '/banner.png',
      title: 'Cricket Arena Banner',
      alt: 'Powerplay Cricket Arena - Main Banner'
    },
    {
      src: '/bbbanner.png',
      title: 'Arena Facility',
      alt: 'Powerplay Cricket Arena - Facility View'
    },
    {
      src: '/logoo.png',
      title: 'Arena Logo',
      alt: 'Powerplay Cricket Arena - Official Logo'
    }
  ];

  return (
    <Box style={{ background: '#FFF9E6', minHeight: '100vh', padding: '24px 0' }}>
      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Paper
            p="xl"
            radius="lg"
            style={{
              background: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)',
              border: '3px solid #F5B800',
              boxShadow: '0 8px 32px rgba(245, 184, 0, 0.25)',
            }}
          >
            <Stack gap="md" align="center">
              <IconPhoto size={48} color="#F5B800" />
              <Title
                order={1}
                c="white"
                ta="center"
                fw={900}
                style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}
              >
                📸 Gallery
              </Title>
              <Text c="#D1D1D1" ta="center" size="lg">
                Explore our premium cricket facility
              </Text>
            </Stack>
          </Paper>

          {/* Gallery Grid */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {images.map((image, index) => (
              <Paper
                key={index}
                p="lg"
                radius="lg"
                style={{
                  background: 'white',
                  border: '2px solid #F5B800',
                  boxShadow: '0 4px 16px rgba(26, 26, 26, 0.1)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 184, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(26, 26, 26, 0.1)';
                }}
              >
                <Stack gap="md">
                  <Box
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '250px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#f5f5f5',
                    }}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      style={{
                        objectFit: 'contain',
                      }}
                      priority={index === 0}
                    />
                  </Box>
                  <Text
                    fw={700}
                    size="lg"
                    c="#1A1A1A"
                    ta="center"
                  >
                    {image.title}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>

          {/* Bottom Info */}
          <Paper
            p="md"
            radius="lg"
            style={{
              background: '#1A1A1A',
              border: '2px solid #F5B800',
            }}
          >
            <Text c="#F5B800" ta="center" fw={600}>
              ⚡ Experience world-class cricket facilities at Powerplay Cricket Arena
            </Text>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
