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
  IconCheck,
  IconClock as IconPending,
  IconX,
  IconAlertCircle,
  IconFileInvoice,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

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

// Local function to format slot ranges (replaces problematic import)
function formatSlotRanges(hours: number[]): string {
  if (!hours || hours.length === 0) return 'No slots selected';
  
  const sortedHours = [...hours].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sortedHours[0];
  let end = sortedHours[0];
  
  for (let i = 1; i < sortedHours.length; i++) {
    if (sortedHours[i] === end + 1) {
      end = sortedHours[i];
    } else {
      ranges.push(start === end ? formatTime(start) : `${formatTime(start)} - ${formatTime(end + 1)}`);
      start = sortedHours[i];
      end = sortedHours[i];
    }
  }
  
  ranges.push(start === end ? formatTime(start) : `${formatTime(start)} - ${formatTime(end + 1)}`);
  return ranges.join(', ');
}

function formatTime(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

// Helper function for PDF generation status colors
function getPdfStatusColor(status: string): { r: number; g: number; b: number } {
  switch (status) {
    case 'approved':
      return { r: 34, g: 139, b: 34 };
    case 'completed':
      return { r: 46, g: 125, b: 50 };
    case 'pending':
      return { r: 255, g: 165, b: 0 };
    case 'cancelled':
      return { r: 244, g: 67, b: 54 };
    default:
      return { r: 158, g: 158, b: 158 };
  }
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

  const downloadInvoice = async (bookingId: string) => {
    try {
      notifications.show({
        title: 'Generating Invoice',
        message: 'Please wait...',
        color: 'blue',
        loading: true,
        autoClose: false,
        id: 'invoice-download',
      });

      const response = await fetch(`/api/invoices/${bookingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'Invoice.html';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      notifications.update({
        id: 'invoice-download',
        title: '✅ Invoice Downloaded',
        message: 'Your invoice has been downloaded successfully',
        color: 'green',
        loading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Invoice download error:', error);
      notifications.update({
        id: 'invoice-download',
        title: 'Error',
        message: 'Failed to download invoice',
        color: 'red',
        loading: false,
        autoClose: 3000,
      });
    }
  };

  const downloadBookingSlip = async (booking: Booking) => {
    try {
      notifications.show({
        title: 'Generating Booking Slip',
        message: 'Please wait...',
        color: 'blue',
        loading: true,
        autoClose: false,
        id: 'slip-download',
      });

      // Generate simple HTML slip instead of using jsPDF
      const slipHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Slip - ${booking.booking_number}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
        }
        
        .slip-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border: 2px solid #22B573;
        }
        
        .header {
            background: linear-gradient(135deg, #22B573 0%, #1E9E64 100%);
            color: white;
            padding: 25px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 800;
        }
        
        .header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            opacity: 0.9;
        }
        
        .content {
            padding: 25px;
        }
        
        .section {
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .section:last-child {
            border-bottom: none;
        }
        
        .section-title {
            color: #22B573;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #22B573;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        
        .info-label {
            color: #666;
            font-weight: 600;
        }
        
        .info-value {
            font-weight: 700;
            color: #1a1a1a;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            background: ${getPdfStatusColor(booking.status).r},${getPdfStatusColor(booking.status).g},${getPdfStatusColor(booking.status).b};
            color: white;
            border-radius: 20px;
            font-weight: 700;
            font-size: 12px;
            margin-left: 10px;
        }
        
        .payment-highlight {
            background: #fff9e6;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #F5B800;
            margin-top: 15px;
        }
        
        .payment-total {
            font-size: 24px;
            font-weight: 900;
            color: #22B573;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 2px solid #e9ecef;
        }
        
        .contact-info {
            font-size: 14px;
            color: #666;
            margin-top: 10px;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .slip-container {
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }
    </style>
</head>
<body>
    <div class="slip-container">
        <div class="header">
            <h1>POWERPLAY CRICKET ARENA</h1>
            <h2>Booking Confirmation Slip</h2>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">Booking Information</div>
                <div class="info-row">
                    <span class="info-label">Booking Number:</span>
                    <span class="info-value">${booking.booking_number}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span>
                        ${booking.status.toUpperCase()}
                        <span class="status-badge">${booking.status}</span>
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Booking Date:</span>
                    <span class="info-value">${new Date(booking.booking_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Customer Details</div>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${booking.customer.name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${booking.customer.phone}</span>
                </div>
                ${booking.customer.email ? `
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${booking.customer.email}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="section">
                <div class="section-title">Time Slots</div>
                <div class="info-row">
                    <span class="info-label">Time Slots:</span>
                    <span class="info-value">${formatSlotRanges(booking.slots.map(s => s.slot_hour))}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Duration:</span>
                    <span class="info-value">${booking.total_hours} hours</span>
                </div>
                ${booking.slots.some(s => s.is_night_rate) ? `
                <div style="margin-top: 10px; padding: 10px; background: #e6f7ff; border-radius: 6px; border-left: 4px solid #1890ff;">
                    <strong>🌙 Night Rate Applied:</strong> Some slots are charged at night rate (Rs 2000/hr)
                </div>
                ` : ''}
            </div>
            
            <div class="section">
                <div class="section-title">Payment Summary</div>
                <div class="payment-highlight">
                    <div class="info-row">
                        <span class="info-label">Total Amount:</span>
                        <span class="payment-total">Rs ${booking.total_amount.toLocaleString()}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Advance Paid:</span>
                        <span style="color: #52c41a; font-weight: 700;">Rs ${booking.advance_payment.toLocaleString()}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Remaining Balance:</span>
                        <span style="color: ${booking.remaining_payment === 0 ? '#52c41a' : '#f5222d'}; font-weight: 700;">
                            Rs ${booking.remaining_payment.toLocaleString()}
                            ${booking.remaining_payment === 0 ? ' (PAID IN FULL)' : ''}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Important Instructions</div>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Please arrive 5 minutes before your allotted time</li>
                    <li>Carry this booking slip for verification</li>
                    <li>Complete remaining payment before play time</li>
                    <li>Keep the ground clean and tidy</li>
                    <li>Do not damage nets, equipment, or property</li>
                    <li>Follow all ground rules and staff instructions</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <div class="contact-info">
                <strong>For queries, contact:</strong> 03402639174<br/>
                <strong>Email:</strong> Powerplaycricketarena@gmail.com<br/>
                <strong>Generated on:</strong> ${new Date().toLocaleString()}
            </div>
            <div style="margin-top: 15px; color: #999; font-size: 12px;">
                Thank you for choosing Powerplay Cricket Arena!
            </div>
        </div>
    </div>
    
    <script>
        window.onload = function() {
            // Auto-print if URL has print=true parameter
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('print') === 'true') {
                window.print();
            }
        }
    </script>
</body>
</html>`;

      // Create and download HTML file
      const blob = new Blob([slipHtml], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `booking-slip-${booking.booking_number}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      notifications.update({
        id: 'slip-download',
        title: '✅ Booking Slip Downloaded',
        message: 'Your booking slip has been downloaded successfully',
        color: 'green',
        loading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Booking slip download error:', error);
      notifications.update({
        id: 'slip-download',
        title: 'Error',
        message: 'Failed to generate booking slip',
        color: 'red',
        loading: false,
        autoClose: 3000,
      });
    }
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
                          <Text size="md" fw={500}>
                            {formatSlotRanges(booking.slots.map(s => s.slot_hour))}
                            {booking.slots.some(s => s.is_night_rate) && ' 🌙'}
                          </Text>
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
                        <Group grow>
                          <Button
                            size="lg"
                            variant="gradient"
                            gradient={{ from: 'green', to: 'teal' }}
                            leftSection={<IconDownload size={20} />}
                            onClick={() => downloadBookingSlip(booking)}
                            style={{ height: '50px' }}
                          >
                            Download Booking Slip
                          </Button>
                          <Button
                            size="lg"
                            variant="gradient"
                            gradient={{ from: 'yellow', to: 'orange' }}
                            leftSection={<IconFileInvoice size={20} />}
                            onClick={() => downloadInvoice(booking.id)}
                            style={{ height: '50px' }}
                          >
                            Download Invoice
                          </Button>
                        </Group>
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
            <strong>03402639174</strong>
          </Text>
        </Alert>
      </Stack>
    </Container>
  );
}