/**
 * Admin Bookings Management Page
 * 
 * Purpose: Complete booking management with table view, filters, and actions
 * Features:
 * - Table view with all booking details
 * - Customer information display
 * - Slots visualization
 * - Payment status (green=paid, red=remaining)
 * - Approve/reject actions
 * - View payment proof modal
 * - Manual booking creation
 * - Export to PDF and Excel
 * - Search and filters
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Stack,
  Group,
  Button,
  Table,
  Badge,
  Text,
  Select,
  TextInput,
  LoadingOverlay,
  Alert,
  Menu,
  ActionIcon,
  Paper,
  Tooltip,
} from '@mantine/core';
import {
  IconPlus,
  IconDownload,
  IconSearch,
  IconFilter,
  IconRefresh,
  IconDots,
  IconCheck,
  IconX,
  IconEye,
  IconFileTypePdf,
  IconFileSpreadsheet,
  IconAlertCircle,
  IconCurrencyRupee,
  IconCalendarEvent,
  IconFileInvoice,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDebouncedValue } from '@mantine/hooks';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import BookingDetailsModal from '@/components/BookingDetailsModal';
import PaymentProofModal from '@/components/PaymentProofModal';
import ManualBookingModal from '@/components/ManualBookingModal';
import CompletePaymentModal from '@/components/CompletePaymentModal';
import EditBookingModal from '@/components/EditBookingModal';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { formatTimeDisplay, formatSlotRanges } from '@/lib/supabase/bookings';
import { useUserRole } from '@/lib/hooks/useUserRole';

interface Booking {
  id: string;
  booking_number: string;
  booking_date: string;
  total_hours: number;
  total_amount: number;
  advance_payment: number;
  remaining_payment: number;
  advance_payment_method: string;
  advance_payment_proof: string;
  remaining_payment_proof: string;
  status: string;
  created_at: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  slots: Array<{
    slot_hour: number;
    is_night_rate: boolean;
  }>;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);
  const [summary, setSummary] = useState<any>(null);
  
  // Role-based access control
  const { isAdmin, isGroundManager, canEditBookings, canDeleteBookings, loading: roleLoading } = useUserRole();
  
  // Modals
  const [detailsModalOpened, setDetailsModalOpened] = useState(false);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const [manualBookingOpened, setManualBookingOpened] = useState(false);
  const [completePaymentOpened, setCompletePaymentOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedPaymentProof, setSelectedPaymentProof] = useState<{ path: string; number: string } | null>(null);
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState<{ id: string; number: string; remaining: number } | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, paymentFilter, debouncedSearch]);

  const fetchBookings = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        status: statusFilter,
        paymentStatus: paymentFilter,
      });

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      
      // Ground managers only see bookings with remaining payment
      if (isGroundManager) {
        params.append('remainingOnly', 'true');
      }

      const response = await fetch(`/api/admin/bookings?${params}`);
      const result = await response.json();

      if (result.success) {
        setBookings(result.bookings || []);
        setSummary(result.summary);
      } else {
        notifications.show({
          title: '❌ Loading Error',
          message: 'Could not load bookings. Please try again.',
          color: 'red',
          autoClose: 4000,
          icon: <IconAlertCircle size={18} />,
        });
      }
    } catch (error) {
      console.error('Fetch bookings error:', error);
      notifications.show({
        title: '❌ Network Error',
        message: 'Failed to connect. Please check your connection.',
        color: 'red',
        autoClose: 5000,
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/admin/calendar/${bookingId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: null }),
      });

      const result = await response.json();

      if (result.success) {
        notifications.show({
          title: '✅ Booking Approved',
          message: `Booking #${result.bookingNumber} has been confirmed`,
          color: 'green',
          autoClose: 4000,
          icon: <IconCheck size={18} />,
        });
        fetchBookings();
      } else {
        notifications.show({
          title: '❌ Approval Failed',
          message: result.error || 'Could not approve booking',
          color: 'red',
          autoClose: 4000,
          icon: <IconAlertCircle size={18} />,
        });
      }
    } catch (error) {
      notifications.show({
        title: '❌ Error',
        message: 'Failed to approve booking',
        color: 'red',
        autoClose: 4000,
        icon: <IconAlertCircle size={18} />,
      });
    }
  };

  const handleReject = async (bookingId: string, reason: string) => {
    try {
      const response = await fetch(`/api/admin/calendar/${bookingId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const result = await response.json();

      if (result.success) {
        notifications.show({
          title: '⚠️ Booking Rejected',
          message: `Booking #${result.bookingNumber} has been cancelled`,
          color: 'orange',
          autoClose: 4000,
          icon: <IconX size={18} />,
        });
        fetchBookings();
      } else {
        notifications.show({
          title: '❌ Rejection Failed',
          message: result.error || 'Could not reject booking',
          color: 'red',
          autoClose: 4000,
          icon: <IconAlertCircle size={18} />,
        });
      }
    } catch (error) {
      notifications.show({
        title: '❌ Error',
        message: 'Failed to reject booking',
        color: 'red',
        autoClose: 4000,
        icon: <IconAlertCircle size={18} />,
      });
    }
  };

  const handleDelete = async (bookingId: string, bookingNumber: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete Booking #${bookingNumber}?\n\nThis action cannot be undone and will permanently remove all booking data including:\n- Customer information\n- Payment records\n- Slot reservations\n\nType 'DELETE' to confirm.`
    );

    if (!confirmed) return;

    const confirmText = prompt('Type DELETE to confirm:');
    if (confirmText !== 'DELETE') {
      notifications.show({
        title: '❌ Cancelled',
        message: 'Deletion cancelled',
        color: 'orange',
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        notifications.show({
          title: '✅ Booking Deleted',
          message: `Booking #${bookingNumber} has been permanently deleted`,
          color: 'green',
          autoClose: 4000,
          icon: <IconTrash size={18} />,
        });
        fetchBookings();
      } else {
        throw new Error(result.error || 'Failed to delete booking');
      }
    } catch (error: any) {
      notifications.show({
        title: '❌ Delete Failed',
        message: error.message || 'Failed to delete booking',
        color: 'red',
        autoClose: 4000,
        icon: <IconAlertCircle size={18} />,
      });
    }
  };

  const downloadInvoice = async (bookingId: string, bookingNumber: string) => {
    try {
      notifications.show({
        title: 'Generating Invoice',
        message: 'Please wait...',
        color: 'blue',
        loading: true,
        autoClose: false,
        id: `invoice-${bookingId}`,
      });

      const response = await fetch(`/api/invoices/${bookingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `${bookingNumber}_Invoice.pdf`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      notifications.update({
        id: `invoice-${bookingId}`,
        title: '✅ Invoice Downloaded',
        message: `Invoice for ${bookingNumber} downloaded successfully`,
        color: 'green',
        loading: false,
        autoClose: 3000,
        icon: <IconFileInvoice size={18} />,
      });
    } catch (error) {
      console.error('Invoice download error:', error);
      notifications.update({
        id: `invoice-${bookingId}`,
        title: '❌ Download Failed',
        message: 'Failed to download invoice',
        color: 'red',
        loading: false,
        autoClose: 3000,
        icon: <IconAlertCircle size={18} />,
      });
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Cricket Booking Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = bookings.map(b => [
      b.booking_number,
      b.customer.name,
      b.customer.phone,
      new Date(b.booking_date).toLocaleDateString(),
      `${b.total_hours}h`,
      `Rs ${b.total_amount.toLocaleString()}`,
      `Rs ${b.remaining_payment.toLocaleString()}`,
      b.status,
    ]);

    autoTable(doc, {
      head: [['Booking #', 'Customer', 'Phone', 'Date', 'Hours', 'Total', 'Remaining', 'Status']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 139, 230] },
    });

    doc.save(`bookings-${new Date().toISOString().split('T')[0]}.pdf`);
    notifications.show({
      title: '✅ Export Successful',
      message: 'PDF report has been downloaded',
      color: 'green',
      autoClose: 3000,
      icon: <IconFileTypePdf size={18} />,
    });
  };

  const exportToExcel = () => {
    const data = bookings.map(b => ({
      'Booking Number': b.booking_number,
      'Customer Name': b.customer.name,
      'Phone': b.customer.phone,
      'Email': b.customer.email || '',
      'Booking Date': new Date(b.booking_date).toLocaleDateString(),
      'Total Hours': b.total_hours,
      'Total Amount': b.total_amount,
      'Advance Payment': b.advance_payment,
      'Remaining Payment': b.remaining_payment,
      'Payment Method': b.advance_payment_method,
      'Status': b.status,
      'Created At': new Date(b.created_at).toLocaleString(),
      'Slots': formatSlotRanges(b.slots.map(s => s.slot_hour)),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
    
    XLSX.writeFile(wb, `bookings-${new Date().toISOString().split('T')[0]}.xlsx`);
    notifications.show({
      title: '✅ Export Successful',
      message: 'Excel spreadsheet has been downloaded',
      color: 'green',
      autoClose: 3000,
      icon: <IconFileSpreadsheet size={18} />,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'cyan';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const getPaymentStatusColor = (remaining: number) => {
    return remaining === 0 ? 'green' : 'red';
  };

  return (
    <Container 
      size="xl" 
      py="md" 
      px="sm"
      className="animate-fade-in"
    >
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div style={{ flex: 1, minWidth: 0 }}>
              <Title 
                order={1}
                size="h1"
                style={{ fontSize: 'clamp(1.25rem, 5vw, 2.5rem)' }}
              >
                Bookings Management
              </Title>
              {summary && (
                <Group gap="xs" mt="xs" wrap="wrap">
                  <Badge variant="light" size="sm">
                    Total: {summary.total}
                  </Badge>
                  <Badge color="orange" variant="light" size="sm">
                    Pending: {summary.pending}
                  </Badge>
                  <Badge color="green" variant="light" size="sm">
                    Approved: {summary.approved}
                  </Badge>
                </Group>
              )}
            </div>

            <Group wrap="wrap">
              <Button
                leftSection={<IconPlus size={16} />}
                size="sm"
                onClick={() => setManualBookingOpened(true)}
              >
                <Text visibleFrom="sm">Add Manual Booking</Text>
                <Text hiddenFrom="sm">Add</Text>
              </Button>
              
              <Menu shadow="md">
                <Menu.Target>
                  <Button
                    variant="light"
                    leftSection={<IconDownload size={16} />}
                    size="sm"
                  >
                    <Text visibleFrom="sm">Export</Text>
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconFileTypePdf size={16} />}
                    onClick={exportToPDF}
                  >
                    Export as PDF
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconFileSpreadsheet size={16} />}
                    onClick={exportToExcel}
                  >
                    Export as Excel
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </Stack>

        {/* Filters */}
        <Paper withBorder p="sm">
          <Stack gap="sm">
            <TextInput
              placeholder="Search by booking #, customer, phone..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="sm"
            />
            <Group wrap="wrap">
              <Select
                placeholder="Status"
                leftSection={<IconFilter size={16} />}
                data={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value || 'all')}
                style={{ flex: '1 1 120px', minWidth: 120 }}
                size="sm"
              />
              <Select
                placeholder="Payment"
                leftSection={<IconFilter size={16} />}
                data={[
                  { value: 'all', label: 'All' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'pending', label: 'Pending' },
                ]}
                value={paymentFilter}
                onChange={(value) => setPaymentFilter(value || 'all')}
                style={{ flex: '1 1 120px', minWidth: 120 }}
                size="sm"
              />
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={fetchBookings}
                loading={loading}
                size="sm"
                style={{ flex: '0 0 auto' }}
              >
                <Text visibleFrom="sm">Refresh</Text>
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <Paper withBorder radius="md" className="hover-lift">
          
          <Table.ScrollContainer minWidth={{ base: 800, sm: 1000, md: 1200 }}>
            <Table highlightOnHover striped style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Booking #</Table.Th>
                  <Table.Th>Customer</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Slots</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Payment</Table.Th>
                  <Table.Th>Proofs</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bookings.map((booking) => (
                  <Table.Tr key={booking.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {booking.booking_number}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{booking.customer.name}</Text>
                      <Text size="xs" c="dimmed">
                        {booking.customer.phone}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {formatSlotRanges(booking.slots.map(s => s.slot_hour))}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {booking.slots.some(s => s.is_night_rate) && '🌙 Night rates'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        Rs {booking.total_amount.toLocaleString()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {booking.total_hours} hours
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Badge
                          size="sm"
                          color={getPaymentStatusColor(booking.remaining_payment)}
                        >
                          {booking.remaining_payment === 0 ? 'Paid' : 'Remaining'}
                        </Badge>
                        {booking.remaining_payment > 0 && (
                          <Text size="xs" c="red" fw={500}>
                            Rs {booking.remaining_payment.toLocaleString()}
                          </Text>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {booking.advance_payment_proof && booking.advance_payment_proof !== 'manual-booking-no-proof' ? (
                          <Button
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<IconEye size={14} />}
                            onClick={() => {
                              setSelectedPaymentProof({
                                path: booking.advance_payment_proof,
                                number: booking.booking_number,
                              });
                              setPaymentModalOpened(true);
                            }}
                          >
                            Advance
                          </Button>
                        ) : (
                          <Text size="xs" c="dimmed">-</Text>
                        )}
                        {booking.remaining_payment_proof ? (
                          <Button
                            size="xs"
                            variant="light"
                            color="blue"
                            leftSection={<IconEye size={14} />}
                            onClick={() => {
                              setSelectedPaymentProof({
                                path: booking.remaining_payment_proof,
                                number: booking.booking_number,
                              });
                              setPaymentModalOpened(true);
                            }}
                          >
                            Remaining
                          </Button>
                        ) : (
                          <Text size="xs" c="dimmed">-</Text>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(booking.status)} variant="light">
                        {booking.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        {/* Invoice Download Button - Always visible */}
                        <Tooltip label="Download Invoice">
                          <ActionIcon
                            variant="light"
                            color="yellow"
                            onClick={() => downloadInvoice(booking.id, booking.booking_number)}
                          >
                            <IconFileInvoice size={16} />
                          </ActionIcon>
                        </Tooltip>
                        
                        {booking.status === 'pending' && (
                          <>
                            <Button
                              size="xs"
                              color="green"
                              variant="light"
                              leftSection={<IconCheck size={16} />}
                              onClick={() => handleApprove(booking.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              leftSection={<IconX size={16} />}
                              onClick={() => {
                                const reason = prompt('Reason for rejection:');
                                if (reason) handleReject(booking.id, reason);
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {booking.status === 'approved' && booking.remaining_payment > 0 && (
                          <Button
                            size="xs"
                            color="blue"
                            variant="filled"
                            leftSection={<IconCurrencyRupee size={16} />}
                            onClick={() => {
                              setSelectedPaymentBooking({
                                id: booking.id,
                                number: booking.booking_number,
                                remaining: booking.remaining_payment,
                              });
                              setCompletePaymentOpened(true);
                            }}
                          >
                            Complete Payment
                          </Button>
                        )}
                        <Menu shadow="md">
                          <Menu.Target>
                            <ActionIcon variant="subtle">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconEye size={16} />}
                              onClick={() => {
                                setSelectedBookingId(booking.id);
                                setDetailsModalOpened(true);
                              }}
                            >
                              View Details
                            </Menu.Item>
                            
                            {/* Only admins can edit and delete */}
                            {canEditBookings && (
                              <>
                                <Menu.Item
                                  leftSection={<IconEdit size={16} />}
                                  color="blue"
                                  onClick={() => {
                                    setSelectedBookingId(booking.id);
                                    setEditModalOpened(true);
                                  }}
                                >
                                  Edit Booking
                                </Menu.Item>
                                <Menu.Divider />
                              </>
                            )}
                            
                            {canDeleteBookings && (
                              <Menu.Item
                                leftSection={<IconTrash size={16} />}
                                color="red"
                                onClick={() => handleDelete(booking.id, booking.booking_number)}
                              >
                                Delete Booking
                              </Menu.Item>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          {bookings.length === 0 && !loading && (
            <EmptyState
              icon={<IconCalendarEvent size={64} />}
              title="No Bookings Found"
              description="Try adjusting your filters or search query to find bookings."
              action={{
                label: 'Clear Filters',
                onClick: () => {
                  setStatusFilter('all');
                  setPaymentFilter('all');
                  setSearchQuery('');
                },
              }}
            />
          )}
        </Paper>
        )}
      </Stack>

      {/* Modals */}
      {selectedBookingId && (
        <>
          <BookingDetailsModal
            bookingId={selectedBookingId}
            opened={detailsModalOpened}
            onClose={() => {
              setDetailsModalOpened(false);
              setSelectedBookingId(null);
            }}
            onSuccess={fetchBookings}
          />
          
          <EditBookingModal
            bookingId={selectedBookingId}
            opened={editModalOpened}
            onClose={() => {
              setEditModalOpened(false);
              setSelectedBookingId(null);
            }}
            onSuccess={fetchBookings}
          />
        </>
      )}

      {selectedPaymentProof && (
        <PaymentProofModal
          opened={paymentModalOpened}
          onClose={() => {
            setPaymentModalOpened(false);
            setSelectedPaymentProof(null);
          }}
          imagePath={selectedPaymentProof.path}
          bookingNumber={selectedPaymentProof.number}
        />
      )}

      <ManualBookingModal
        opened={manualBookingOpened}
        onClose={() => setManualBookingOpened(false)}
        onSuccess={fetchBookings}
      />

      {selectedPaymentBooking && (
        <CompletePaymentModal
          opened={completePaymentOpened}
          onClose={() => {
            setCompletePaymentOpened(false);
            setSelectedPaymentBooking(null);
          }}
          bookingId={selectedPaymentBooking.id}
          bookingNumber={selectedPaymentBooking.number}
          remainingAmount={selectedPaymentBooking.remaining}
          onSuccess={fetchBookings}
        />
      )}
    </Container>
  );
}
