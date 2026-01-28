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
import { useRouter, useSearchParams } from 'next/navigation';
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
  ScrollArea,
  Modal,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
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
  remaining_payment_method?: string;
  remaining_payment_amount?: number;
  discount_amount?: number;
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
    // Export modal state
    const [exportModalOpened, setExportModalOpened] = useState(false);
    // Mantine DatesRangeValue<Date> is [Date | null, Date | null]
    const [exportDateRange, setExportDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Role-based access control
  const { isAdmin, isGroundManager, canEditBookings, canDeleteBookings, loading: roleLoading } = useUserRole();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  // Ground managers see only approved bookings with remaining payment
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  
  // Update status filter when role is determined
  useEffect(() => {
    if (isGroundManager && statusFilter !== 'approved') {
      setStatusFilter('approved');
    }
  }, [isGroundManager, statusFilter]);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [summary, setSummary] = useState<any>(null);
  
  // Modals
  const [detailsModalOpened, setDetailsModalOpened] = useState(false);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const [manualBookingOpened, setManualBookingOpened] = useState(false);
  const [completePaymentOpened, setCompletePaymentOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedPaymentProof, setSelectedPaymentProof] = useState<{ path: string; number: string } | null>(null);
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState<{ id: string; number: string; remaining: number } | null>(null);

  // Helper function to calculate payment breakdown
  const getPaymentBreakdown = (booking: Booking) => {
    let cash = 0;
    let online = 0;

    // Count advance payment
    if (booking.advance_payment_method === 'cash') {
      cash += booking.advance_payment;
    } else {
      online += booking.advance_payment;
    }

    // Count remaining payment (only if paid - status is completed)
    if (booking.status === 'completed' && booking.remaining_payment_method) {
      const remainingPaid = booking.remaining_payment_amount || 0;
      if (booking.remaining_payment_method === 'cash') {
        cash += remainingPaid;
      } else {
        online += remainingPaid;
      }
    }

    return { cash, online };
  };

  // Helper function to get payment method badge
  const getPaymentMethodBadge = (method: string) => {
    const methodMap: Record<string, { label: string; color: string }> = {
      cash: { label: 'Cash', color: 'green' },
      easypaisa: { label: 'Easypaisa', color: 'blue' },
      sadapay: { label: 'SadaPay', color: 'cyan' },
    };
    
    return methodMap[method] || { label: method, color: 'gray' };
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, paymentFilter, debouncedSearch, dateFrom, dateTo]);

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
      
      // Add date range filters
      if (dateFrom) {
        params.append('dateFrom', dateFrom.toISOString().split('T')[0]);
      }
      if (dateTo) {
        params.append('dateTo', dateTo.toISOString().split('T')[0]);
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
    const confirmed = window.confirm(
      `Are you sure you want to delete Booking #${bookingNumber}?\n\nThis action cannot be undone and will permanently remove all booking data including:\n• Customer information\n• Payment records\n• Slot reservations`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        notifications.show({
          title: '✅ Booking Deleted',
          message: `Booking #${bookingNumber} deleted successfully`,
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

  const handlePDFExport = (dateRange?: [Date | null, Date | null] | null) => {

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    // --- Centered Main Heading ---
    doc.setFontSize(28);
    doc.setTextColor(34, 139, 230); // blue
    doc.text('Cricket Booking Report', pageWidth / 2, 22, { align: 'center' });

    // --- Timeline/Date Range ---
    doc.setFontSize(13);
    doc.setTextColor(80, 80, 80);
    let timelineText = 'All Bookings';
    let filteredBookings = bookings;
    if (dateRange && dateRange[0] && dateRange[1]) {
      const from = dateRange[0];
      const to = dateRange[1];
      filteredBookings = bookings.filter(b => {
        const d = new Date(b.booking_date);
        return d >= from && d <= to;
      });
      timelineText = `Timeline: ${from.toLocaleDateString()} - ${to.toLocaleDateString()}`;
    }
    doc.text(timelineText, pageWidth / 2, 32, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 39, { align: 'center' });

    // --- Draw a line below header ---
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(10, 44, pageWidth - 10, 44);

    // --- Statistics Section (colorful badges style) ---
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + b.advance_payment + (b.remaining_payment_amount || 0), 0);
    const totalBookings = filteredBookings.length;
    const monthMap = new Map<string, { bookings: number; revenue: number }>();
    filteredBookings.forEach((b: Booking) => {
      const month = new Date(b.booking_date).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!monthMap.has(month)) monthMap.set(month, { bookings: 0, revenue: 0 });
      const entry = monthMap.get(month)!;
      entry.bookings += 1;
      entry.revenue += b.advance_payment + (b.remaining_payment_amount || 0);
    });

    // Draw "badges" for stats
    let statY = 52;
    const badgeHeight = 10;
    const badgePad = 4;
    let badgeX = 14;
    // Total Bookings badge
    doc.setFillColor(34, 139, 230); // blue
    doc.roundedRect(badgeX, statY, 40, badgeHeight, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`Bookings: ${totalBookings}`, badgeX + badgePad, statY + 7, { baseline: 'middle' });
    badgeX += 46;
    // Total Revenue badge
    doc.setFillColor(46, 204, 113); // green
    doc.roundedRect(badgeX, statY, 60, badgeHeight, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`Revenue: Rs ${totalRevenue.toLocaleString()}`, badgeX + badgePad, statY + 7, { baseline: 'middle' });
    badgeX += 66;
    // Month-wise badge (just show count of months)
    doc.setFillColor(255, 193, 7); // yellow
    doc.roundedRect(badgeX, statY, 48, badgeHeight, 2, 2, 'F');
    doc.setTextColor(80, 80, 80);
    doc.text(`Months: ${monthMap.size}`, badgeX + badgePad, statY + 7, { baseline: 'middle' });

    // Month-wise summary (below badges)
    let monthY = statY + badgeHeight + 8;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('Month-wise Summary:', 14, monthY);
    monthY += 6;
    monthMap.forEach((v, k) => {
      doc.setTextColor(34, 139, 230);
      doc.text(`${k}: `, 18, monthY);
      doc.setTextColor(46, 204, 113);
      doc.text(`${v.bookings} bookings`, 55, monthY);
      doc.setTextColor(80, 80, 80);
      doc.text(`, Rs ${v.revenue.toLocaleString()}`, 90, monthY);
      monthY += 6;
    });


    // --- Group bookings by status ---
    const statusOrder = ['completed', 'approved', 'pending'];
    const grouped: Record<string, Booking[]> = { completed: [], approved: [], pending: [] };
    filteredBookings.forEach((b: Booking) => {
      if (grouped[b.status]) grouped[b.status].push(b);
    });

    let tableY = monthY + 4;
    statusOrder.forEach((status: string) => {
      if (grouped[status].length === 0) return;
      doc.setFontSize(12);
      // Color status heading
      let statusColor: [number, number, number] = [120, 120, 120];
      if (status === 'completed') statusColor = [46, 204, 113];
      if (status === 'approved') statusColor = [34, 139, 230];
      if (status === 'pending') statusColor = [255, 193, 7];
      doc.setTextColor(...statusColor);
      doc.text(status.charAt(0).toUpperCase() + status.slice(1), 14, tableY);
      tableY += 4;
      const tableData = grouped[status].map((b: Booking) => {
        const { cash, online } = getPaymentBreakdown(b);
        const totalPaid = b.advance_payment + (b.remaining_payment_amount || 0);
        const slotHours = b.slots.map((s: any) => s.slot_hour);
        const slotRange = formatSlotRanges(slotHours);
        return [
          b.booking_number,
          b.customer.name,
          b.customer.phone,
          new Date(b.booking_date).toLocaleDateString(),
          slotRange,
          `Rs ${b.total_amount.toLocaleString()}`,
          `Rs ${totalPaid.toLocaleString()}`,
          `Rs ${cash.toLocaleString()}`,
          `Rs ${online.toLocaleString()}`,
          b.status,
        ];
      });
      autoTable(doc, {
        head: [['Booking #', 'Customer', 'Phone', 'Date', 'Time', 'Total', 'Paid', 'Cash', 'Online', 'Status']],
        body: tableData,
        startY: tableY,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [34, 139, 230] },
        columnStyles: {
          5: { fillColor: [220, 255, 220] }, // Highlight 'Total' column (light green)
        },
      });
      // @ts-ignore
      tableY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : tableY + 40;
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
    const data = bookings.map(b => {
      const { cash, online } = getPaymentBreakdown(b);
      const totalPaid = b.advance_payment + (b.status === 'completed' ? b.remaining_payment : 0);
      
      return {
        'Booking Number': b.booking_number,
        'Customer Name': b.customer.name,
        'Phone': b.customer.phone,
        'Email': b.customer.email || '',
        'Booking Date': new Date(b.booking_date).toLocaleDateString(),
        'Total Hours': b.total_hours,
        'Total Amount': b.total_amount,
        'Total Paid': totalPaid,
        'Cash Payments': cash,
        'Online Payments': online,
        'Advance Payment': b.advance_payment,
        'Advance Method': b.advance_payment_method,
        'Remaining Payment': b.remaining_payment,
        'Remaining Method': b.remaining_payment_method || '',
        'Status': b.status,
        'Created At': new Date(b.created_at).toLocaleString(),
        'Slots': formatSlotRanges(b.slots.map(s => s.slot_hour)),
      };
    });

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
              {isAdmin && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  size="sm"
                  onClick={() => setManualBookingOpened(true)}
                >
                  <Text visibleFrom="sm">Add Manual Booking</Text>
                  <Text hiddenFrom="sm">Add</Text>
                </Button>
              )}
              
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
                    onClick={() => setExportModalOpened(true)}
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

              {/* Export Options Modal */}
              <Modal
                opened={exportModalOpened}
                onClose={() => setExportModalOpened(false)}
                title="Export PDF Options"
                centered
                size="xs"
              >
                <Stack>
                  <Button fullWidth onClick={() => { setExportModalOpened(false); handlePDFExport(); }}>
                    Export All Data
                  </Button>
                  <DatePickerInput
                    type="range"
                    label="Select Timeline"
                    value={exportDateRange}
                    onChange={(value) => setExportDateRange(value as [Date | null, Date | null])}
                    mx="auto"
                    maw={220}
                  />
                  <Button
                    fullWidth
                    mt="sm"
                    onClick={() => {
                      setExportModalOpened(false);
                      handlePDFExport(exportDateRange);
                    }}
                    disabled={!exportDateRange[0] || !exportDateRange[1]}
                  >
                    Export Selected Timeline
                  </Button>
                </Stack>
              </Modal>
            </Group>
          </Group>

          {/* Direct Status Filter Buttons */}
          {isAdmin && (
            <Group gap="xs" mt="md" mb={-8}>
              {[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ].map((btn) => (
                <Button
                  key={btn.value}
                  size="xs"
                  variant={statusFilter === btn.value ? 'filled' : 'light'}
                  color={
                    btn.value === 'pending' ? 'orange' :
                    btn.value === 'approved' ? 'green' :
                    btn.value === 'completed' ? 'blue' :
                    btn.value === 'cancelled' ? 'red' : 'gray'
                  }
                  onClick={() => setStatusFilter(btn.value)}
                  style={{ fontWeight: 600, minWidth: 90 }}
                >
                  {btn.label}
                </Button>
              ))}
            </Group>
          )}
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
              {isAdmin && (
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
              )}
              {isAdmin && (
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
              )}
              <DatePickerInput
                placeholder="From Date"
                leftSection={<IconCalendarEvent size={16} />}
                value={dateFrom}
                onChange={(value) => setDateFrom(value && typeof value !== 'string' ? value : null)}
                clearable
                style={{ flex: '1 1 140px', minWidth: 140 }}
                size="sm"
                maxDate={dateTo || undefined}
              />
              <DatePickerInput
                placeholder="To Date"
                leftSection={<IconCalendarEvent size={16} />}
                value={dateTo}
                onChange={(value) => setDateTo(value && typeof value !== 'string' ? value : null)}
                clearable
                style={{ flex: '1 1 140px', minWidth: 140 }}
                size="sm"
                minDate={dateFrom || undefined}
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
          <Paper withBorder radius="md">
          
          <Table.ScrollContainer minWidth={800}>
            <Table striped style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Booking #</Table.Th>
                  <Table.Th>Customer</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Slots</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Total Paid</Table.Th>
                  <Table.Th>Cash</Table.Th>
                  <Table.Th>Online</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bookings.map((booking) => (
                  <Table.Tr
                    key={booking.id}
                    className={booking.status === 'completed' ? 'completed-row' : ''}
                  >
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
                      {(() => {
                        const totalPaid = booking.advance_payment + (booking.remaining_payment_amount || 0);
                        const discount = booking.status === 'completed' && totalPaid < booking.total_amount
                          ? booking.total_amount - totalPaid
                          : 0;
                        return (
                          <Stack gap={4}>
                            <Text size="sm" fw={700} c={totalPaid === booking.total_amount ? 'green' : 'orange'}>
                              Rs {totalPaid.toLocaleString()}
                            </Text>
                            {discount > 0 ? (
                              <Text size="xs" c="green" fw={600}>
                                Discount: Rs {discount.toLocaleString()}
                              </Text>
                            ) : totalPaid < booking.total_amount && booking.status !== 'completed' ? (
                              <Text size="xs" c="red">
                                Due: Rs {(booking.total_amount - totalPaid).toLocaleString()}
                              </Text>
                            ) : null}
                          </Stack>
                        );
                      })()}
                    </Table.Td>
                    <Table.Td>
                      {(() => {
                        const { cash } = getPaymentBreakdown(booking);
                        if (cash === 0) return <Text size="xs" c="dimmed">-</Text>;
                        return (
                          <Stack gap={4}>
                            <Text size="sm" fw={600}>
                              Rs {cash.toLocaleString()}
                            </Text>
                            <Group gap={4} wrap="nowrap">
                              {booking.advance_payment_method === 'cash' && (
                                <Badge size="xs" color="green" variant="dot" style={{ whiteSpace: 'nowrap' }}>Cash</Badge>
                              )}
                              {booking.status === 'completed' && booking.remaining_payment_method === 'cash' && (
                                <Badge size="xs" color="green" variant="dot" style={{ whiteSpace: 'nowrap' }}>Cash</Badge>
                              )}
                            </Group>
                          </Stack>
                        );
                      })()}
                    </Table.Td>
                    <Table.Td>
                      {(() => {
                        const { online } = getPaymentBreakdown(booking);
                        if (online === 0) return <Text size="xs" c="dimmed">-</Text>;
                        return (
                          <Stack gap={4}>
                            <Text size="sm" fw={600}>
                              Rs {online.toLocaleString()}
                            </Text>
                            <Group gap={4} wrap="nowrap">
                              {booking.advance_payment_method !== 'cash' && (
                                <Badge size="xs" color={getPaymentMethodBadge(booking.advance_payment_method).color} variant="dot" style={{ whiteSpace: 'nowrap' }}>
                                  {getPaymentMethodBadge(booking.advance_payment_method).label}
                                </Badge>
                              )}
                              {booking.status === 'completed' && booking.remaining_payment_method && booking.remaining_payment_method !== 'cash' && (
                                <Badge size="xs" color={getPaymentMethodBadge(booking.remaining_payment_method).color} variant="dot" style={{ whiteSpace: 'nowrap' }}>
                                  {getPaymentMethodBadge(booking.remaining_payment_method).label}
                                </Badge>
                              )}
                            </Group>
                          </Stack>
                        );
                      })()}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(booking.status)}
                        variant="light"
                        size="md"
                        style={{ textTransform: 'capitalize', letterSpacing: 0.2 }}
                      >
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                      {booking.remaining_payment > 0 && booking.status === 'approved' && (
                        <Text size="xs" c="red" fw={500} mt={4}>
                          Remaining: Rs {booking.remaining_payment.toLocaleString()}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {booking.advance_payment_proof ? (
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
                        ) : booking.advance_payment_method === 'cash' ? (
                          <Badge size="md" color="green" variant="filled">
                            💵 Cash
                          </Badge>
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
                        ) : booking.remaining_payment_method === 'cash' ? (
                          <Badge size="md" color="blue" variant="filled">
                            💵 Cash
                          </Badge>
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



















