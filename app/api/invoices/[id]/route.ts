/**
 * Invoice Generation API
 * GET /api/invoices/[id] - Generate and download invoice PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import jsPDF from 'jspdf';
import { formatSlotRanges } from '@/lib/supabase/bookings';

interface BookingData {
  id: string;
  booking_number: string;
  booking_date: string;
  total_hours: number;
  total_amount: number;
  advance_payment: number;
  remaining_payment: number;
  advance_payment_method: string;
  remaining_payment_method: string | null;
  advance_payment_proof: string | null;
  remaining_payment_proof: string | null;
  status: string;
  created_at: string;
  customer: {
    name: string;
    phone: string;
  };
  slots: Array<{
    slot_hour: number;
    is_night_rate: boolean;
    hourly_rate: number;
  }>;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();
    const params = await Promise.resolve(context.params);
    const bookingId = params.id;

    // Fetch booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        booking_date,
        total_hours,
        total_amount,
        advance_payment,
        remaining_payment,
        advance_payment_method,
        remaining_payment_method,
        advance_payment_proof,
        remaining_payment_proof,
        status,
        created_at,
        customer:customers(name, phone),
        slots:booking_slots(slot_hour, is_night_rate, hourly_rate)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const bookingData = booking as unknown as BookingData;

    // Generate PDF
    const pdf = await generateInvoicePDF(bookingData, supabase);

    // Return PDF as download
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    const customerName = bookingData.customer.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${customerName}_${bookingData.booking_number}_Invoice.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

async function generateInvoicePDF(booking: BookingData, supabase: any): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colors - Professional Black & Gold theme
  const gold: [number, number, number] = [245, 184, 0]; // F5B800
  const black: [number, number, number] = [26, 26, 26]; // 1A1A1A
  const darkGray: [number, number, number] = [64, 64, 64];
  const lightGray: [number, number, number] = [240, 240, 240];
  const goldLight: [number, number, number] = [255, 252, 230];
  
  let y = 20;

  // ==================== HEADER ====================
  // Gold header banner
  doc.setFillColor(...gold);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Arena name
  doc.setTextColor(...black);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('POWERPLAY CRICKET ARENA', pageWidth / 2, 20, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Premium Cricket Ground & Sports Facility', pageWidth / 2, 28, { align: 'center' });
  
  // Invoice title with spacing
  doc.setDrawColor(...black);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 75, 35, pageWidth / 2 + 75, 35);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('BOOKING CONFIRMATION INVOICE', pageWidth / 2, 42, { align: 'center' });
  
  y = 55;

  // ==================== BOOKING INFO CARD ====================
  // Card background
  doc.setFillColor(...goldLight);
  doc.roundedRect(15, y, pageWidth - 30, 45, 5, 5, 'F');
  doc.setDrawColor(...gold);
  doc.setLineWidth(1.5);
  doc.roundedRect(15, y, pageWidth - 30, 45, 5, 5, 'S');
  
  y += 10;
  
  // Left Column: Customer Details
  doc.setTextColor(...darkGray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS', 22, y);
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(22, y + 2, 55, y + 2);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text(booking.customer.name, 22, y + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...darkGray);
  doc.text(`Phone: ${booking.customer.phone || 'Not provided'}`, 22, y + 16);
  
  // Right Column: Invoice Details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('INVOICE DETAILS', pageWidth - 75, y);
  doc.line(pageWidth - 75, y + 2, pageWidth - 22, y + 2);
  
  // Invoice Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(220, 20, 60); // Red for invoice number
  doc.text(`#${booking.booking_number}`, pageWidth - 75, y + 10);
  
  // Invoice Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...darkGray);
  const invoiceDate = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  doc.text(`Date: ${invoiceDate}`, pageWidth - 75, y + 16);
  
  // Booking Date
  const bookingDateFormatted = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  doc.text(`Booking: ${bookingDateFormatted}`, pageWidth - 75, y + 22);
  
  y += 35;

  // ==================== BOOKING DETAILS SECTION ====================
  // Section header
  doc.setFillColor(...gold);
  doc.roundedRect(15, y, pageWidth - 30, 12, 3, 3, 'F');
  doc.setTextColor(...black);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOKING DETAILS', 22, y + 8);
  
  y += 20;
  
  // Time slots
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Time Slots:', 22, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...black);
  const slotRanges = formatSlotRanges(booking.slots.map(s => s.slot_hour));
  doc.text(slotRanges, 55, y);
  
  y += 8;
  
  // Duration
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Duration:', 22, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...black);
  doc.text(`${booking.total_hours} hour${booking.total_hours !== 1 ? 's' : ''}`, 55, y);
  
  // Calculate rate breakdown - FIXED: Check for actual rates
  const regularSlots = booking.slots.filter(s => !s.is_night_rate);
  const nightSlots = booking.slots.filter(s => s.is_night_rate);
  const regularRate = regularSlots.length > 0 ? regularSlots[0].hourly_rate || 0 : 0;
  const nightRate = nightSlots.length > 0 ? nightSlots[0].hourly_rate || 0 : 0;
  
  // Only show rate breakdown if we have valid rates
  if ((regularSlots.length > 0 && regularRate > 0) || (nightSlots.length > 0 && nightRate > 0)) {
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Rate Breakdown:', 22, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...black);
    
    let rateText = '';
    if (regularSlots.length > 0 && regularRate > 0) {
      rateText += `${regularSlots.length}h @ PKR ${regularRate.toLocaleString()}/hr`;
    }
    if (nightSlots.length > 0 && nightRate > 0) {
      if (rateText) rateText += ' + ';
      rateText += `${nightSlots.length}h night @ PKR ${nightRate.toLocaleString()}/hr`;
    }
    
    if (rateText) {
      doc.text(rateText, 70, y);
    } else {
      doc.text('Standard rate applied', 70, y);
    }
  }
  
  y += 8;
  
  // Status badge
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Status:', 22, y);
  
  let statusText = '';
  let statusBg: [number, number, number] = [220, 220, 220];
  let statusColor: [number, number, number] = black;
  
  switch (booking.status) {
    case 'pending':
      statusText = 'PENDING APPROVAL';
      statusBg = [255, 245, 230]; // Light orange
      statusColor = [255, 140, 0];
      break;
    case 'approved':
      statusText = 'CONFIRMED';
      statusBg = [220, 255, 220]; // Light green
      statusColor = [0, 128, 0];
      break;
    case 'completed':
      statusText = 'COMPLETED';
      statusBg = [230, 240, 255]; // Light blue
      statusColor = [0, 0, 150];
      break;
    case 'cancelled':
      statusText = 'CANCELLED';
      statusBg = [255, 230, 230]; // Light red
      statusColor = [200, 0, 0];
      break;
    default:
      statusText = booking.status.toUpperCase();
  }
  
  // Draw status badge
  const statusWidth = doc.getTextWidth(statusText) + 10;
  doc.setFillColor(...statusBg);
  doc.roundedRect(55, y - 4, statusWidth, 8, 4, 4, 'F');
  doc.setTextColor(...statusColor);
  doc.setFontSize(9);
  doc.text(statusText, 60, y);
  doc.setTextColor(...black);
  
  y += 15;

  // ==================== PAYMENT SUMMARY TABLE ====================
  // Section header
  doc.setFillColor(...gold);
  doc.roundedRect(15, y, pageWidth - 30, 12, 3, 3, 'F');
  doc.setTextColor(...black);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT SUMMARY', 22, y + 8);
  
  y += 20;
  
  // Table header
  doc.setFillColor(...lightGray);
  doc.rect(20, y, pageWidth - 40, 10, 'F');
  doc.setDrawColor(...darkGray);
  doc.setLineWidth(0.3);
  doc.rect(20, y, pageWidth - 40, 10, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Description', 25, y + 7);
  doc.text('Amount', pageWidth - 25, y + 7, { align: 'right' });
  
  y += 12;
  
  // Total Amount row
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('Total Booking Amount', 25, y + 7);
  doc.text(`PKR ${booking.total_amount.toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
  
  y += 12;
  
  // Advance Payment row - IMPROVED STYLING
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  doc.text('Advance Payment Received', 30, y + 7);
  
  // Payment method badge - IMPROVED WITH RED/BOLD
  const advanceMethod = booking.advance_payment_method === 'easypaisa' ? 'EasyPaisa' :
                        booking.advance_payment_method === 'sadapay' ? 'SadaPay' :
                        booking.advance_payment_method === 'cash' ? 'Cash' : 'N/A';
  
  // Add payment method badge in front of "Advance Payment Received"
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 20, 60); // Red color for badge
  const methodX = 30 + doc.getTextWidth('Advance Payment Received ') + 2;
  doc.text(`[${advanceMethod}]`, methodX, y + 7);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 150, 0); // Green for amount
  doc.text(`- PKR ${booking.advance_payment.toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
  
  y += 12;
  
  // Remaining Amount row
  doc.setDrawColor(...darkGray);
  doc.setLineWidth(0.3);
  doc.line(25, y + 3, pageWidth - 25, y + 3);
  
  y += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('Balance Due', 25, y + 7);
  
  if (booking.remaining_payment === 0) {
    doc.setTextColor(0, 150, 0); // Green
    doc.text('PAID IN FULL', pageWidth - 25, y + 7, { align: 'right' });
  } else {
    if (booking.remaining_payment_method) {
      const remainingMethod = booking.remaining_payment_method === 'easypaisa' ? 'EasyPaisa' :
                             booking.remaining_payment_method === 'sadapay' ? 'SadaPay' :
                             booking.remaining_payment_method === 'cash' ? 'Cash' : 'N/A';
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text(`Pay via: ${remainingMethod}`, 30, y + 15);
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0); // Red
    doc.text(`PKR ${booking.remaining_payment.toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
  }
  
  y += booking.remaining_payment > 0 ? 22 : 15;

  // ==================== PAYMENT STATUS MESSAGE ====================
  // Moved up to make space for important information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  if (booking.remaining_payment === 0) {
    doc.setFillColor(220, 255, 220); // Light green
    doc.roundedRect(20, y - 5, pageWidth - 40, 12, 3, 3, 'F');
    doc.setTextColor(0, 100, 0);
    doc.text('Your booking has been successfully confirmed!', pageWidth / 2, y + 3, { align: 'center' });
  } else {
    doc.setFillColor(255, 245, 230); // Light orange
    doc.roundedRect(20, y - 5, pageWidth - 40, 12, 3, 3, 'F');
    doc.setTextColor(180, 80, 0);
    doc.text('Remaining Payment Due:', pageWidth / 2, y + 3, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`PKR ${booking.remaining_payment.toLocaleString()}`, pageWidth / 2, y + 8, { align: 'center' });
  }
  
  y += 18;

  // ==================== IMPORTANT INFORMATION WITH CONTACT ====================
  // Single combined section to save space
  const combinedSectionHeight = 60; // Enough space for info + contact
  
  // Information card
  doc.setFillColor(...goldLight);
  doc.roundedRect(15, y, pageWidth - 30, combinedSectionHeight, 5, 5, 'F');
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.roundedRect(15, y, pageWidth - 30, combinedSectionHeight, 5, 5, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('IMPORTANT INFORMATION', 22, y + 8);
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(22, y + 10, 70, y + 10);
  
  y += 12;
  
  // Information points - Compact with smaller font
  const infoPoints = [
    '• Bats, wickets, and tapes will be provided by the facility.',
    '• Bring your own tennis balls, or purchase them at the venue.',
    '• Please arrive 15 minutes before your scheduled time.',
    '• Keep the ground clean and dispose of trash properly.'
  ];
  
  doc.setFontSize(8); // Smaller font to fit better
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  
  infoPoints.forEach((point, index) => {
    doc.text(point, 25, y + (index * 5.5)); // Reduced line spacing
  });
  
  y += 25; // After information points
  
  // Add separator line
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(25, y, pageWidth - 25, y);
  
  y += 5;
  
  // Contact information - Compact version
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('CONTACT US', 22, y);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  doc.text('Phone: 0340-2639174', 25, y + 8);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 102, 204); // Blue for email
  doc.text('Email: Powerplaycricketarena@gmail.com', 25, y + 16);
  
  y += 30;

  // ==================== SIMPLE FOOTER WITH INVOICE INFO ====================
  // Add a simple line and invoice info at the bottom
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  
  y += 5;
  
  // Invoice info in small font at bottom
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  const generatedText = `Invoice: ${booking.booking_number} • Generated: ${new Date().toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;
  doc.text(generatedText, pageWidth / 2, y, { align: 'center' });
  
  // Add page border for professional look
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');

  return doc;
}