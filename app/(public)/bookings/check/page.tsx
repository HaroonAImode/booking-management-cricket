/**
 * Check Your Booking Page
 * Public page for customers to check booking status and download slip
 */

'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Paper,
  Group,
  Badge,
  Alert,
  Table,
  LoadingOverlay,
  Divider,
} from '@mantine/core';
import {
  IconSearch,
  IconDownload,
  IconCalendar,
  IconClock,
  IconUser,
  IconPhone,
  IconMail,
  IconCurrencyRupee,
  IconCheck,
  IconClock as IconPending,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import jsPDF from 'jspdf';

interface Booking {
  id: string;
  booking_number: string;
  booking_date: string;
  total_hours: number;
  total_amount: number;
  advance_payment: number;
  remaining_payment: number;
  status: string;
  created_at: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  slots: Array<{
    slot_hour: number;
    is_night_rate: boolean;
  }>;
}

export default function CheckBookingPage() {
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchName.trim() && !searchPhone.trim()) {
      notifications.show({
        title: 'Search Required',
        message: 'Please enter your name or phone number',
        color: 'orange',
      });
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchName.trim()) params.append('name', searchName.trim());
      if (searchPhone.trim()) params.append('phone', searchPhone.trim());

      const response = await fetch(`/api/public/bookings/search?${params}`);
      const result = await response.json();

      if (result.success) {
        setBookings(result.bookings);
        setSearched(true);
        
        if (result.bookings.length === 0) {
          notifications.show({
            title: 'No Bookings Found',
            message: 'No bookings found with the provided details',
            color: 'blue',
          });
        }
      } else {
        notifications.show({
          title: 'Error',
          message: result.error || 'Failed to search bookings',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to search bookings',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadBookingSlip = (booking: Booking) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(34, 139, 34);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('CRICKET GROUND', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Booking Confirmation Slip', 105, 30, { align: 'center' });
    
    // Reset colors
    doc.setTextColor(0, 0, 0);
    
    // Booking Number
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Booking #: ${booking.booking_number}`, 20, 55);
    
    // Status Badge
    const statusColor = getStatusColor(booking.status);
    doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
    doc.roundedRect(150, 50, 40, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(booking.status.toUpperCase(), 170, 56, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    // Customer Details Section
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 65, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CUSTOMER DETAILS', 25, 70);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let y = 80;
    doc.text(`Name: ${booking.customer.name}`, 25, y);
    y += 7;
    doc.text(`Phone: ${booking.customer.phone}`, 25, y);
    y += 7;
    if (booking.customer.email) {
      doc.text(`Email: ${booking.customer.email}`, 25, y);
      y += 7;
    }
    
    // Booking Details Section
    y += 5;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('BOOKING DETAILS', 25, y + 5);
    
    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, 25, y);
    
    y += 7;
    const slots = booking.slots.map(s => `${s.slot_hour}:00-${s.slot_hour + 1}:00${s.is_night_rate ? ' 🌙' : ''}`).join(', ');
    doc.text(`Time Slots: ${slots}`, 25, y);
    
    y += 7;
    doc.text(`Total Hours: ${booking.total_hours} hours`, 25, y);
    
    // Payment Details
    y += 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PAYMENT DETAILS', 25, y + 5);
    
    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Amount: Rs ${booking.total_amount.toLocaleString()}`, 25, y);
    y += 7;
    doc.text(`Advance Paid: Rs ${booking.advance_payment.toLocaleString()}`, 25, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text(`Remaining: Rs ${booking.remaining_payment.toLocaleString()}`, 25, y);
    
    // Important Instructions
    y += 15;
    doc.setFillColor(255, 245, 230);
    doc.rect(20, y, 170, 60, 'F');
    doc.setFillColor(255, 165, 0);
    doc.rect(20, y, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('IMPORTANT INSTRUCTIONS', 25, y + 5);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    y += 12;
    
    // Instructions with manual bullet points
    doc.text('* Please arrive 5 minutes before your allotted time', 25, y);
    y += 7;
    doc.text('* Carry this booking slip for verification', 25, y);
    y += 7;
    doc.text('* Complete remaining payment before play time', 25, y);
    y += 7;
    doc.text('* Keep the ground clean and tidy', 25, y);
    y += 7;
    doc.text('* Do not damage nets, equipment, or property', 25, y);
    y += 7;
    doc.text('* Follow all ground rules and staff instructions', 25, y);
    y += 7;
    
    // Contact Information
    y += 5;
    doc.setFillColor(34, 139, 34);
    doc.rect(20, y, 170, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('For queries, contact: +92-XXX-XXXXXXX', 105, y + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Email: support@cricketground.com', 105, y + 12, { align: 'center' });
    
    // Footer
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
    
    // Save PDF
    doc.save(`booking-${booking.booking_number}.pdf`);
    
    notifications.show({
      title: 'Download Complete',
      message: 'Booking slip downloaded successfully',
      color: 'green',
      icon: <IconCheck size={18} />,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return { r: 34, g: 139, b: 34, badge: 'green' };
      case 'completed':
        return { r: 46, g: 125, b: 50, badge: 'teal' };
      case 'pending':
        return { r: 255, g: 165, b: 0, badge: 'orange' };
      case 'cancelled':
        return { r: 244, g: 67, b: 54, badge: 'red' };
      default:
        return { r: 158, g: 158, b: 158, badge: 'gray' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <IconCheck size={18} />;
      case 'pending':
        return <IconPending size={18} />;
      case 'cancelled':
        return <IconX size={18} />;
      default:
        return <IconAlertCircle size={18} />;
    }
  };

  const getStatusMessage = (booking: Booking) => {
    switch (booking.status) {
      case 'approved':
        return {
          title: '✅ Booking Approved!',
          message: 'Your booking has been confirmed. Please arrive 5 minutes before your scheduled time.',
          color: 'green',
        };
      case 'completed':
        return {
          title: '✅ Booking Completed',
          message: 'Thank you for using our services!',
          color: 'teal',
        };
      case 'pending':
        return {
          title: '⏳ Under Review',
          message: 'Your booking is being reviewed. You will be notified once approved.',
          color: 'orange',
        };
      case 'cancelled':
        return {
          title: '❌ Booking Cancelled',
          message: 'This booking has been cancelled.',
          color: 'red',
        };
      default:
        return {
          title: 'Booking Status',
          message: 'Check back later for updates.',
          color: 'gray',
        };
    }
  };

  return (
    <Container size="lg" py={{ base: "md", sm: "xl" }} px={{ base: "xs", sm: "md" }}>
      <Stack gap={{ base: "md", sm: "xl" }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <Title order={1} mb="xs" size={{ base: "h2", sm: "h1" }}>Check Your Booking</Title>
          <Text size={{ base: "md", sm: "lg" }} c="dimmed">
            Search by your name or phone number to view booking status
          </Text>
        </div>

        {/* Search Form */}
        <Paper withBorder p={{ base: "md", sm: "xl" }} radius="md" shadow="sm">
          <Stack gap="md">
            <TextInput
              label="Your Name"
              placeholder="Enter your full name"
              leftSection={<IconUser size={18} />}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              size="md"
            />
            
            <Text size="sm" ta="center" c="dimmed">OR</Text>
            
            <TextInput
              label="Phone Number"
              placeholder="Enter your phone number"
              leftSection={<IconPhone size={18} />}
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              size="md"
            />

            <Button
              size="lg"
              leftSection={<IconSearch size={20} />}
              onClick={handleSearch}
              loading={loading}
              fullWidth
            >
              Search My Bookings
            </Button>
          </Stack>
        </Paper>

        {/* Results */}
        {searched && bookings.length > 0 && (
          <Stack gap="md">
            {bookings.map((booking) => {
              const statusInfo = getStatusMessage(booking);
              return (
                <Paper key={booking.id} withBorder p={{ base: "md", sm: "lg" }} radius="md" shadow="sm">
                  <Stack gap="md">
                    {/* Status Alert */}
                    <Alert
                      icon={getStatusIcon(booking.status)}
                      title={statusInfo.title}
                      color={statusInfo.color}
                    >
                      {statusInfo.message}
                    </Alert>

                    {/* Booking Details */}
                    <Group justify="space-between" wrap="nowrap">
                      <div>
                        <Text size="sm" c="dimmed">Booking Number</Text>
                        <Text fw={600} size="lg">{booking.booking_number}</Text>
                      </div>
                      <Badge
                        size="lg"
                        color={getStatusColor(booking.status).badge}
                        leftSection={getStatusIcon(booking.status)}
                      >
                        {booking.status}
                      </Badge>
                    </Group>

                    <Divider />

                    {/* Customer Info */}
                    <div>
                      <Text size="sm" fw={600} mb="xs">Customer Details</Text>
                      <Stack gap="xs">
                        <Group gap="xs">
                          <IconUser size={16} />
                          <Text size="sm">{booking.customer.name}</Text>
                        </Group>
                        <Group gap="xs">
                          <IconPhone size={16} />
                          <Text size="sm">{booking.customer.phone}</Text>
                        </Group>
                        {booking.customer.email && (
                          <Group gap="xs">
                            <IconMail size={16} />
                            <Text size="sm">{booking.customer.email}</Text>
                          </Group>
                        )}
                      </Stack>
                    </div>

                    <Divider />

                    {/* Booking Time */}
                    <div>
                      <Text size="sm" fw={600} mb="xs">Booking Details</Text>
                      <Stack gap="xs">
                        <Group gap="xs">
                          <IconCalendar size={16} />
                          <Text size="sm">
                            {new Date(booking.booking_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <IconClock size={16} />
                          <Group gap={4}>
                            {booking.slots.map((slot, idx) => (
                              <Badge
                                key={idx}
                                size="sm"
                                color={slot.is_night_rate ? 'indigo' : 'yellow'}
                              >
                                {slot.slot_hour}:00-{slot.slot_hour + 1}:00
                                {slot.is_night_rate && ' 🌙'}
                              </Badge>
                            ))}
                          </Group>
                        </Group>
                      </Stack>
                    </div>

                    <Divider />

                    {/* Payment Info */}
                    <Group justify="space-between">
                      <div>
                        <Text size="sm" c="dimmed">Total Amount</Text>
                        <Text size="xl" fw={700}>Rs {booking.total_amount.toLocaleString()}</Text>
                      </div>
                      <div>
                        <Text size="sm" c="dimmed">Remaining</Text>
                        <Text 
                          size="lg" 
                          fw={600}
                          c={booking.remaining_payment === 0 ? 'green' : 'red'}
                        >
                          Rs {booking.remaining_payment.toLocaleString()}
                        </Text>
                      </div>
                    </Group>

                    {/* Download Button - Show for approved or completed bookings */}
                    {(booking.status === 'approved' || booking.status === 'completed') && (
                      <>
                        <Divider />
                        <Button
                          size="lg"
                          variant="gradient"
                          gradient={{ from: 'green', to: 'teal' }}
                          leftSection={<IconDownload size={20} />}
                          onClick={() => downloadBookingSlip(booking)}
                          fullWidth
                          style={{ height: '50px' }}
                        >
                          Download Booking Slip (PDF)
                        </Button>
                      </>
                    )}

                    {/* Pending Message */}
                    {booking.status === 'pending' && (
                      <Alert color="orange" variant="light">
                        <Text size="sm">
                          📋 Your booking is under review. The download button will appear once admin approves your booking. 
                          Please check back in a few minutes.
                        </Text>
                      </Alert>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}

        {/* No Results */}
        {searched && bookings.length === 0 && (
          <Alert icon={<IconAlertCircle size={18} />} title="No Bookings Found" color="blue">
            <Text size="sm">
              No bookings were found with the provided information. Please check your name or phone number and try again.
            </Text>
          </Alert>
        )}

        {/* Help Message */}
        <Alert icon={<IconAlertCircle size={18} />} title="Need Help?" color="cyan">
          <Text size="sm">
            If you cannot find your booking or have any questions, please contact us at:{' '}
            <strong>+92-XXX-XXXXXXX</strong>
          </Text>
        </Alert>
      </Stack>

      <LoadingOverlay visible={loading} />
    </Container>
  );
}
