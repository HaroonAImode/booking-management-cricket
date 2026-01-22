/**
 * PaymentProofModal Component
 * Modal to view payment proof image with zoom functionality
 */

'use client';

import { Modal, Image, Stack, Text, Group, Button, LoadingOverlay } from '@mantine/core';
import { IconDownload, IconExternalLink } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

interface PaymentProofModalProps {
  opened: boolean;
  onClose: () => void;
  imagePath: string;
  bookingNumber: string;
}

export default function PaymentProofModal({
  opened,
  onClose,
  imagePath,
  bookingNumber,
}: PaymentProofModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (opened && imagePath) {
      loadImage();
    }
  }, [opened, imagePath]);

  const loadImage = async () => {
    try {
      setLoading(true);
      setError(false);

      // Get signed URL from Supabase Storage
      const response = await fetch(`/api/admin/storage/payment-proof?path=${encodeURIComponent(imagePath)}`);
      
      if (!response.ok) {
        throw new Error('Failed to load image');
      }

      const data = await response.json();
      setImageUrl(data.url);
    } catch (err) {
      console.error('Image load error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `payment-proof-${bookingNumber}.jpg`;
      link.click();
    }
  };

  const handleOpenInNew = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Payment Proof - ${bookingNumber}`}
      size="xl"
      centered
      zIndex={300}
    >
      <Stack gap="md">
        <LoadingOverlay visible={loading} />

        {error && (
          <Text c="red" ta="center">
            Failed to load payment proof image
          </Text>
        )}

        {imageUrl && !error && (
          <>
            <Image
              src={imageUrl}
              alt="Payment Proof"
              radius="md"
              fit="contain"
              style={{ maxHeight: '70vh' }}
            />

            <Group justify="center">
              <Button
                variant="light"
                leftSection={<IconDownload size={18} />}
                onClick={handleDownload}
              >
                Download
              </Button>
              <Button
                variant="light"
                leftSection={<IconExternalLink size={18} />}
                onClick={handleOpenInNew}
              >
                Open in New Tab
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
