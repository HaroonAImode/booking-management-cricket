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
 * - Extra charges display and management
 * - Discount display
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
  Box,
  ThemeIcon,
  HoverCard,
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
  IconBottle,
  IconBallTennis,
  IconBandage,
  IconPackage,
  IconDiscount,
  IconInfoCircle,
  IconChevronLeft,
  IconChevronRight,
  IconFilterOff,
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

interface ExtraCharge {
  id: string;
  booking_id: string;
  category: 'mineral water' | 'tape' | 'ball' | 'other';
  amount: number;
  created_at: string;
  created_by?: string;
}

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
  extra_charges: ExtraCharge[];
  total_extra_charges?: number;
}

export default function AdminBookingsPage() {
  // Export modal state
  const [exportModalOpened, setExportModalOpened] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Role-based access control
  const { isAdmin, isGroundManager, canEditBookings, canDeleteBookings, loading: roleLoading } = useUserRole();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [viewingDate, setViewingDate] = useState<Date | null>(null);
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
      cash += booking.advance_payment || 0;
    } else {
      online += booking.advance_payment || 0;
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

  // Helper function to get extra charges display with correct categories
  const getExtraChargesDisplay = (booking: Booking) => {
    // Safely get extra charges array
    const extraCharges = Array.isArray(booking.extra_charges) ? booking.extra_charges : [];
    
    if (extraCharges.length === 0) {
      return (
        <Text size="xs" c="dimmed" ta="center">
          -
        </Text>
      );
    }

    const totalExtra = extraCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
    
    return (
      <Stack gap={4}>
        <HoverCard shadow="md" position="bottom" withinPortal>
          <HoverCard.Target>
            <Text size="sm" fw={600} c="blue" style={{ cursor: 'pointer' }}>
              Rs {totalExtra.toLocaleString()}
            </Text>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Stack gap="xs">
              <Text size="sm" fw={600}>Extra Charges Details:</Text>
              {extraCharges.map((charge, index) => (
                <Group key={index} justify="space-between" gap="xs">
                  <Group gap={6}>
                    <ThemeIcon size="xs" variant="light">
                      {getCategoryIcon(charge.category)}
                    </ThemeIcon>
                    <Text size="xs">{getCategoryLabel(charge.category)}</Text>
                  </Group>
                  <Text size="xs" fw={500}>Rs {charge.amount.toLocaleString()}</Text>
                </Group>
              ))}
              <Group justify="space-between" pt="xs" style={{ borderTop: '1px solid #dee2e6' }}>
                <Text size="sm" fw={600}>Total:</Text>
                <Text size="sm" fw={700}>Rs {totalExtra.toLocaleString()}</Text>
              </Group>
            </Stack>
          </HoverCard.Dropdown>
        </HoverCard>
        <Group gap={4} wrap="wrap" justify="center">
          {extraCharges.slice(0, 2).map((charge, index) => (
            <Badge key={index} size="xs" color="blue" variant="light">
              {getCategoryIcon(charge.category)} {getCategoryLabel(charge.category)}
            </Badge>
          ))}
          {extraCharges.length > 2 && (
            <Badge size="xs" color="gray" variant="light">
              +{extraCharges.length - 2} more
            </Badge>
          )}
        </Group>
      </Stack>
    );
  };

  // Helper function to get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'mineral water':
        return <IconBottle size={12} />;
      case 'tape':
        return <IconBandage size={12} />;
      case 'ball':
        return <IconBallTennis size={12} />;
      case 'other':
        return <IconPackage size={12} />;
      default:
        return null;
    }
  };

  // Helper function to get category label
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'mineral water':
        return 'Water';
      case 'tape':
        return 'Tape';
      case 'ball':
        return 'Ball';
      case 'other':
        return 'Other';
      default:
        return category;
    }
  };

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'completed': return 'blue';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  // Date navigation functions
  const handlePreviousDay = () => {
    // Use viewingDate if available, otherwise use dateFrom or today
    const currentDate = viewingDate || (dateFrom ? new Date(dateFrom) : new Date());
    const previousDay = new Date(currentDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setDateFrom(previousDay);
    setDateTo(previousDay);
  };

  const handleNextDay = () => {
    // Use viewingDate if available, otherwise use dateTo or today
    const currentDate = viewingDate || (dateTo ? new Date(dateTo) : new Date());
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setDateFrom(nextDay);
    setDateTo(nextDay);
  };

  // Clear all filters function
  const handleClearFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setSearchQuery('');
    setDateFrom(null);
    setDateTo(null);
    setViewingDate(null);
    notifications.show({
      title: 'Filters Cleared',
      message: 'All filters have been reset',
      color: 'blue',
      autoClose: 2000,
      icon: <IconFilterOff size={18} />,
    });
  };

  // Sync viewingDate with date filters
  useEffect(() => {
    if (dateFrom && dateTo) {
      // If date range is the same day, show that date
      const fromDate = new Date(dateFrom).toDateString();
      const toDate = new Date(dateTo).toDateString();
      if (fromDate === toDate) {
        setViewingDate(new Date(dateFrom));
      } else {
        // For date ranges, show the "from" date as reference
        setViewingDate(new Date(dateFrom));
      }
    } else if (dateFrom) {
      setViewingDate(new Date(dateFrom));
    } else if (dateTo) {
      setViewingDate(new Date(dateTo));
    } else {
      setViewingDate(null);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, paymentFilter, debouncedSearch, dateFrom, dateTo]);
  
  // Auto-refresh bookings every 5 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchBookings();
    }, 300000); // 5 minutes
    
    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
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
        // Ensure bookings have proper structure
        const safeBookings = (result.bookings || []).map((booking: any) => ({
          ...booking,
          extra_charges: Array.isArray(booking.extra_charges) ? booking.extra_charges : [],
          total_extra_charges: booking.total_extra_charges || 0,
          slots: Array.isArray(booking.slots) ? booking.slots : [],
          customer: booking.customer || { name: '', phone: '' },
          total_amount: booking.total_amount || 0,
          total_hours: booking.total_hours || 0,
          advance_payment: booking.advance_payment || 0,
          remaining_payment: booking.remaining_payment || 0,
          discount_amount: booking.discount_amount || 0,
        }));
        
        setBookings(safeBookings);
        setSummary(result.summary);
      } else {
        notifications.show({
          title: 'Error',
          message: result.error || 'Failed to fetch bookings',
          color: 'red',
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

  // UPDATED: handleDelete function with status-specific warnings
  const handleDelete = async (bookingId: string, bookingNumber: string, status: string) => {
    // Different warning messages based on booking status
    let warningMessage = `Are you sure you want to delete Booking #${bookingNumber}?`;
    
    if (status === 'completed') {
      warningMessage += `\n\n⚠️ WARNING: This is a COMPLETED booking with full payment.`;
    } else if (status === 'cancelled') {
      warningMessage += `\n\n⚠️ WARNING: This is a CANCELLED booking.`;
    }
    
    warningMessage += `\n\nThis action cannot be undone and will permanently remove all booking data including:\n• Customer information\n• Payment records\n• Slot reservations\n• Extra charges`;
    
    const confirmed = window.confirm(warningMessage);

    if (!confirmed) return;

    try {
      // Use query parameter instead of URL path parameter
      const response = await fetch(`/api/admin/bookings?id=${bookingId}`, {
        method: 'DELETE',
      });
      
      // Check if response is OK before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete API Error:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
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
      console.error('Delete booking error:', error);
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

  // Update handlePDFExport to include extra charges and discount
  const handlePDFExport = (dateRange?: [Date | null, Date | null] | null) => {
    // --- Timeline/Date Range ---
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

    // --- Calculate totals including extra charges and discount ---
    let totalCash = 0;
    let totalOnline = 0;
    let totalEasypaisa = 0;
    let totalSadaPay = 0;
    let totalExtraCharges = 0;
    let totalDiscount = 0;
    
    filteredBookings.forEach((b) => {
      if (b.status === 'pending') return;
      
      // Calculate extra charges - with safe access
      const bookingExtraCharges = Array.isArray(b.extra_charges) 
        ? b.extra_charges.reduce((sum, charge) => sum + (charge.amount || 0), 0) 
        : 0;
      totalExtraCharges += bookingExtraCharges;
      
      // Add discount
      totalDiscount += b.discount_amount || 0;
      
      // Advance payment
      if (b.advance_payment_method === 'cash') {
        totalCash += b.advance_payment || 0;
      } else if (b.advance_payment_method === 'easypaisa') {
        totalOnline += b.advance_payment || 0;
        totalEasypaisa += b.advance_payment || 0;
      } else if (b.advance_payment_method === 'sadapay') {
        totalOnline += b.advance_payment || 0;
        totalSadaPay += b.advance_payment || 0;
      }
      
      // Remaining payment (only if paid)
      if ((b.status === 'completed' || b.status === 'approved') && b.remaining_payment_method && b.remaining_payment_amount) {
        if (b.remaining_payment_method === 'cash') {
          totalCash += b.remaining_payment_amount;
        } else if (b.remaining_payment_method === 'easypaisa') {
          totalOnline += b.remaining_payment_amount;
          totalEasypaisa += b.remaining_payment_amount;
        } else if (b.remaining_payment_method === 'sadapay') {
          totalOnline += b.remaining_payment_amount;
          totalSadaPay += b.remaining_payment_amount;
        }
      }
    });

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // --- Centered Main Heading ---
    doc.setFontSize(28);
    doc.setTextColor(34, 139, 230); // blue
    doc.text('Cricket Booking Report', pageWidth / 2, 22, { align: 'center' });
    doc.text(timelineText, pageWidth / 2, 32, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 39, { align: 'center' });

    // --- Draw a line below header ---
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(10, 44, pageWidth - 10, 44);

    // --- Payment Summary ---
    let statY = 52;
    doc.setFontSize(11);
    doc.setTextColor(34, 139, 230);
    doc.text('Payment Summary:', 14, statY);
    statY += 7;
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Cash: Rs ${totalCash.toLocaleString()}`, 18, statY);
    statY += 6;
    doc.text(`Total Online: Rs ${totalOnline.toLocaleString()}  (Easypaisa: Rs ${totalEasypaisa.toLocaleString()}, SadaPay: Rs ${totalSadaPay.toLocaleString()})`, 18, statY);
    statY += 6;
    doc.text(`Total Extra Charges: Rs ${totalExtraCharges.toLocaleString()}`, 18, statY);
    statY += 6;
    doc.text(`Total Discount: Rs ${totalDiscount.toLocaleString()}`, 18, statY);
    statY += 8;

    // Table data for PDF
    const tableData = filteredBookings.map(b => {
      const { cash, online } = getPaymentBreakdown(b);
      const totalPaid = (b.advance_payment || 0) + (b.status === 'completed' ? (b.remaining_payment_amount || 0) : 0);
      const extraCharges = Array.isArray(b.extra_charges) ? b.extra_charges : [];
      const totalExtraCharges = extraCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
      
      return [
        b.booking_number || '',
        b.customer?.name || '',
        b.customer?.phone || '',
        new Date(b.booking_date).toLocaleDateString(),
        formatSlotRanges(Array.isArray(b.slots) ? b.slots.map(s => s.slot_hour) : []),
        `Rs ${(b.total_amount || 0).toLocaleString()}`,
        `Rs ${totalExtraCharges.toLocaleString()}`,
        `Rs ${(b.discount_amount || 0).toLocaleString()}`,
        `Rs ${totalPaid.toLocaleString()}`,
        `Rs ${cash.toLocaleString()}`,
        `Rs ${online.toLocaleString()}`,
        b.status?.charAt(0).toUpperCase() + b.status?.slice(1) || '',
      ];
    });

    // Table headers for PDF
    const headers = [
      ['Booking #', 'Customer', 'Phone', 'Date', 'Slots', 'Amount', 'Extra', 'Discount', 'Paid', 'Cash', 'Online', 'Status']
    ];

    // Add table to PDF
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: statY,
      theme: 'grid',
      headStyles: { fillColor: [34, 139, 230], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: 10, right: 10 },
    });

    // Save PDF
    doc.save(`bookings-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
    notifications.show({
      title: '✅ PDF Export Successful',
      message: 'PDF report has been downloaded',
      color: 'green',
      autoClose: 3000,
      icon: <IconFileTypePdf size={18} />,
    });
  };

  // Export to Excel updated to include extra charges and discount
  const exportToExcel = () => {
    const data = bookings.map(b => {
      const { cash, online } = getPaymentBreakdown(b);
      const totalPaid = (b.advance_payment || 0) + (b.status === 'completed' ? (b.remaining_payment_amount || 0) : 0);
      
      // Safely get extra charges
      const extraCharges = Array.isArray(b.extra_charges) ? b.extra_charges : [];
      const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
      const extraChargesList = extraCharges.map(c => `${c.category || ''}: Rs ${c.amount || 0}`).join(', ') || '';
      
      return {
        'Booking Number': b.booking_number || '',
        'Customer Name': b.customer?.name || '',
        'Phone': b.customer?.phone || '',
        'Email': b.customer?.email || '',
        'Booking Date': new Date(b.booking_date).toLocaleDateString(),
        'Total Hours': b.total_hours || 0,
        'Total Amount': b.total_amount || 0,
        'Extra Charges': extraChargesTotal,
        'Extra Charges Details': extraChargesList,
        'Discount Amount': b.discount_amount || 0,
        'Total Payable': (b.total_amount || 0) + extraChargesTotal,
        'Total Paid': totalPaid,
        'Cash Payments': cash,
        'Online Payments': online,
        'Advance Payment': b.advance_payment || 0,
        'Advance Method': b.advance_payment_method || '',
        'Remaining Payment': b.remaining_payment || 0,
        'Remaining Method': b.remaining_payment_method || '',
        'Status': b.status || '',
        'Created At': new Date(b.created_at).toLocaleString(),
        'Slots': formatSlotRanges(Array.isArray(b.slots) ? b.slots.map(s => s.slot_hour) : []),
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

  return (
    <Container 
      size="xl" 
      py={{ base: 'xs', sm: 'md' }}
      px={{ base: 'xs', sm: 'sm' }}
      className="animate-fade-in"
    >
      <Stack gap={{ base: 'md', sm: 'xl' }}>
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
                  <Badge variant="light" size="sm" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                    Total: {summary.total}
                  </Badge>
                  <Badge color="orange" variant="light" size="sm" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                    Pending: {summary.pending}
                  </Badge>
                  <Badge color="green" variant="light" size="sm" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                    Approved: {summary.approved}
                  </Badge>
                  <Badge color="blue" variant="light" size="sm" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                    Completed: {summary.completed}
                  </Badge>
                  {summary.totalExtraCharges > 0 && (
                    <Badge color="blue" variant="light" size="sm" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                      Extra Charges: Rs {summary.totalExtraCharges.toLocaleString()}
                    </Badge>
                  )}
                  {summary.totalDiscount > 0 && (
                    <Badge color="yellow" variant="light" size="sm" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                      Discount: Rs {summary.totalDiscount.toLocaleString()}
                    </Badge>
                  )}
                </Group>
              )}
            </div>

            <Group wrap="wrap" gap="xs">
              {isAdmin && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  size="sm"
                  onClick={() => setManualBookingOpened(true)}
                  style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}
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
                    style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}
                  >
                    <Text visibleFrom="sm">Export</Text>
                    <Text hiddenFrom="sm">Export</Text>
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
                  style={{ fontWeight: 600, minWidth: 70, fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}
                >
                  {btn.label}
                </Button>
              ))}
            </Group>
          )}
        </Stack>

        {/* Current Date Display & Navigation */}
        {viewingDate && (
          <Paper withBorder p={{ base: 'xs', sm: 'md' }} bg="blue.0">
            <Group justify="space-between" align="center" wrap="wrap" gap="sm">
              <Group gap="xs" align="flex-start">
                <IconCalendarEvent size={20} style={{ marginTop: 4 }} />
                <div>
                  <Text fw={600} size="lg" style={{ fontSize: 'clamp(0.9rem, 3vw, 1.1rem)' }}>
                    {dateFrom && dateTo && new Date(dateFrom).toDateString() !== new Date(dateTo).toDateString() ? (
                      <>
                        📅 Date Range: {new Date(dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(dateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </>
                    ) : (
                      <>
                        📅 {viewingDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </>
                    )}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                    {dateFrom && dateTo && new Date(dateFrom).toDateString() !== new Date(dateTo).toDateString() 
                      ? 'Showing bookings within this date range • Use Next/Previous for single day navigation' 
                      : 'Use Previous/Next buttons to navigate dates • Click "Clear Filters" to see all bookings'}
                  </Text>
                </div>
              </Group>
              <Group gap="xs">
                <Button
                  size="sm"
                  variant="light"
                  leftSection={<IconChevronLeft size={16} />}
                  onClick={handlePreviousDay}
                  style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}
                  title="Go to previous day"
                >
                  <Text visibleFrom="sm">Previous</Text>
                  <Text hiddenFrom="sm">Prev</Text>
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  rightSection={<IconChevronRight size={16} />}
                  onClick={handleNextDay}
                  style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}
                  title="Go to next day"
                >
                  <Text visibleFrom="sm">Next</Text>
                </Button>
              </Group>
            </Group>
          </Paper>
        )}

        {/* Filters */}
        <Paper withBorder p={{ base: 'xs', sm: 'sm' }}>
          <Stack gap="sm">
            <Group justify="space-between" align="center" wrap="wrap" gap="xs">
              <TextInput
                placeholder="Search by booking #, customer, phone..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="sm"
                style={{ flex: '1 1 200px', minWidth: 200 }}
              />
              <Button
                variant="outline"
                color="red"
                leftSection={<IconFilterOff size={16} />}
                onClick={handleClearFilters}
                size="sm"
              >
                <Text visibleFrom="sm">Clear Filters</Text>
                <Text hiddenFrom="sm">Clear</Text>
              </Button>
            </Group>
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
                color="cyan"
                leftSection={<IconCalendarEvent size={16} />}
                onClick={() => {
                  const today = new Date();
                  setDateFrom(today);
                  setDateTo(today);
                }}
                size="sm"
                style={{ flex: '0 0 auto', fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}
              >
                <Text visibleFrom="sm">Today</Text>
              </Button>
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={fetchBookings}
                loading={loading}
                size="sm"
                style={{ flex: '0 0 auto', fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}
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
            <Table.ScrollContainer minWidth={900}>
              <Table striped highlightOnHover style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Booking #</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Customer</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Date</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Slots</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Amount</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Total Paid</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Cash</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Online</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Payment Proofs</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Extra Charges</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Status</Table.Th>
                    <Table.Th style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', fontWeight: 700 }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {bookings.map((booking) => {
                    const totalPaid = (booking.advance_payment || 0) + (booking.remaining_payment_amount || 0);
                    const discount = booking.discount_amount || 0;
                    const { cash, online } = getPaymentBreakdown(booking);
                    
                    // Safely get extra charges
                    const extraCharges = Array.isArray(booking.extra_charges) ? booking.extra_charges : [];
                    const totalExtraCharges = extraCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
                    
                    // Safely get slots
                    const slots = Array.isArray(booking.slots) ? booking.slots : [];
                    const totalPayable = (booking.total_amount || 0) + totalExtraCharges;
                    
                    return (
                      <Table.Tr
                        key={booking.id}
                        className={booking.status === 'completed' ? 'completed-row' : ''}
                      >
                        <Table.Td>
                          <Text size="sm" fw={500} style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                            {booking.booking_number || ''}
                          </Text>
                          <Text size="xs" c="dimmed" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                            {new Date(booking.created_at).toLocaleDateString()}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{booking.customer?.name || ''}</Text>
                          <Text size="xs" c="dimmed" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                            {booking.customer?.phone || ''}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                            {new Date(booking.booking_date).toLocaleDateString()}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500} style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                            {formatSlotRanges(slots.map(s => s.slot_hour))}
                          </Text>
                          <Text size="xs" c="dimmed" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                            {slots.some(s => s.is_night_rate) && '🌙 Night rates'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text size="sm" fw={600} style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                              Rs {(booking.total_amount || 0).toLocaleString()}
                            </Text>
                            {totalExtraCharges > 0 && (
                              <Text size="xs" c="blue" fw={500} style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                                (+Rs {totalExtraCharges.toLocaleString()})
                              </Text>
                            )}
                            <Text size="xs" c="dimmed" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                              {booking.total_hours || 0} hours
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={4}>
                            <Text size="sm" fw={700} c={totalPaid === totalPayable ? 'green' : 'orange'} style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                              Rs {totalPaid.toLocaleString()}
                            </Text>
                            {discount > 0 ? (
                              <Group gap={4} wrap="nowrap">
                                <IconDiscount size={12} />
                                <Text size="xs" c="green" fw={600} style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                                  Discount: Rs {discount.toLocaleString()}
                                </Text>
                              </Group>
                            ) : totalPaid < totalPayable && booking.status !== 'completed' ? (
                              <Text size="xs" c="red" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                                Due: Rs {(totalPayable - totalPaid).toLocaleString()}
                              </Text>
                            ) : null}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          {cash === 0 ? (
                            <Text size="xs" c="dimmed" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>-</Text>
                          ) : (
                            <Stack gap={4}>
                              <Text size="sm" fw={600} style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                                Rs {cash.toLocaleString()}
                              </Text>
                              <Group gap={4} wrap="nowrap">
                                {booking.advance_payment_method === 'cash' && (
                                  <Badge size="xs" color="green" variant="dot" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)' }}>Cash</Badge>
                                )}
                                {booking.status === 'completed' && booking.remaining_payment_method === 'cash' && (
                                  <Badge size="xs" color="green" variant="dot" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)' }}>Cash</Badge>
                                )}
                              </Group>
                            </Stack>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {online === 0 ? (
                            <Text size="xs" c="dimmed" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>-</Text>
                          ) : (
                            <Stack gap={4}>
                              <Text size="sm" fw={600} style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                                Rs {online.toLocaleString()}
                              </Text>
                              <Group gap={4} wrap="nowrap">
                                {booking.advance_payment_method && booking.advance_payment_method !== 'cash' && (
                                  <Badge size="xs" color={getPaymentMethodBadge(booking.advance_payment_method).color} variant="dot" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)' }}>
                                    {getPaymentMethodBadge(booking.advance_payment_method).label}
                                  </Badge>
                                )}
                                {booking.status === 'completed' && booking.remaining_payment_method && booking.remaining_payment_method !== 'cash' && (
                                  <Badge size="xs" color={getPaymentMethodBadge(booking.remaining_payment_method).color} variant="dot" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 0.7rem)' }}>
                                    {getPaymentMethodBadge(booking.remaining_payment_method).label}
                                  </Badge>
                                )}
                              </Group>
                            </Stack>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={4}>
                            {/* Advance Payment Proof Button */}
                            {booking.advance_payment_method && booking.advance_payment_method !== 'cash' && booking.advance_payment_proof && (
                              <Button
                                size="xs"
                                variant="light"
                                color="blue"
                                leftSection={<IconEye size={14} />}
                                onClick={() => {
                                  setSelectedPaymentProof({
                                    path: booking.advance_payment_proof,
                                    number: booking.booking_number,
                                  });
                                  setPaymentModalOpened(true);
                                }}
                                style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}
                              >
                                Advance
                              </Button>
                            )}
                            {/* Remaining Payment Proof Button */}
                            {booking.status === 'completed' && booking.remaining_payment_method && booking.remaining_payment_method !== 'cash' && booking.remaining_payment_proof && (
                              <Button
                                size="xs"
                                variant="light"
                                color="green"
                                leftSection={<IconEye size={14} />}
                                onClick={() => {
                                  setSelectedPaymentProof({
                                    path: booking.remaining_payment_proof,
                                    number: booking.booking_number,
                                  });
                                  setPaymentModalOpened(true);
                                }}
                                style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}
                              >
                                Remaining
                              </Button>
                            )}
                            {/* Show dash if no proofs available */}
                            {(!booking.advance_payment_proof || booking.advance_payment_method === 'cash') && 
                             (!booking.remaining_payment_proof || booking.remaining_payment_method === 'cash' || booking.status !== 'completed') && (
                              <Text size="xs" c="dimmed" ta="center" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>-</Text>
                            )}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          {getExtraChargesDisplay(booking)}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={getStatusColor(booking.status)}
                            variant="light"
                            size="md"
                            style={{ textTransform: 'capitalize', letterSpacing: 0.2, fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}
                          >
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                          {booking.remaining_payment > 0 && booking.status === 'approved' && (
                            <Text size="xs" c="red" fw={500} mt={4} style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}>
                              Remaining: Rs {(booking.remaining_payment || 0).toLocaleString()}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            {/* Invoice Download Button */}
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
                                  leftSection={<IconCheck size={14} />}
                                  onClick={() => handleApprove(booking.id)}
                                  style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}
                                >
                                  <Text visibleFrom="sm">Approve</Text>
                                </Button>
                                <Button
                                  size="xs"
                                  color="red"
                                  variant="light"
                                  leftSection={<IconX size={14} />}
                                  onClick={() => {
                                    const reason = prompt('Reason for rejection:');
                                    if (reason) handleReject(booking.id, reason);
                                  }}
                                  style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}
                                >
                                  <Text visibleFrom="sm">Reject</Text>
                                </Button>
                              </>
                            )}
                            {booking.status === 'approved' && booking.remaining_payment > 0 && (
                              <Button
                                size="xs"
                                color="blue"
                                variant="filled"
                                leftSection={<IconCurrencyRupee size={14} />}
                                onClick={() => {
                                  setSelectedPaymentBooking({
                                    id: booking.id,
                                    number: booking.booking_number,
                                    remaining: booking.remaining_payment || 0,
                                  });
                                  setCompletePaymentOpened(true);
                                }}
                                style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)' }}
                              >
                                <Text visibleFrom="sm">Complete Payment</Text>
                                <Text hiddenFrom="sm">Pay</Text>
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
                                  // UPDATED: Pass booking status to handleDelete
                                  <Menu.Item
                                    leftSection={<IconTrash size={16} />}
                                    color="red"
                                    onClick={() => handleDelete(booking.id, booking.booking_number, booking.status)}
                                  >
                                    Delete Booking
                                  </Menu.Item>
                                )}
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
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