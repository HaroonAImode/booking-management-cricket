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
  
  // Colors - Black & Yellow theme
  const yellow: [number, number, number] = [245, 184, 0]; // F5B800
  const black: [number, number, number] = [26, 26, 26]; // 1A1A1A
  const gray: [number, number, number] = [128, 128, 128];
  const lightYellow: [number, number, number] = [255, 252, 230];
  
  let y = 20;

  // ==================== HEADER ====================
  // Yellow header banner
  doc.setFillColor(...yellow);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Arena name
  doc.setTextColor(...black);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('POWERPLAY CRICKET ARENA', pageWidth / 2, 18, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Premium Cricket Ground Booking', pageWidth / 2, 28, { align: 'center' });
  
  // Invoice title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOKING CONFIRMATION', pageWidth / 2, 36, { align: 'center' });
  
  y = 50;

  // ==================== BOOKING INFO ====================
  doc.setFillColor(...lightYellow);
  doc.roundedRect(15, y, pageWidth - 30, 45, 3, 3, 'F');
  doc.setDrawColor(...yellow);
  doc.setLineWidth(1);
  doc.roundedRect(15, y, pageWidth - 30, 45, 3, 3, 'S');
  
  y += 10;
  
  // Customer Details - Left
  doc.setTextColor(...black);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Name:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(booking.customer.name, 20, y + 6);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Phone Number:', 20, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(booking.customer.phone || 'N/A', 20, y + 20);
  
  // Booking Details - Right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Booking ID:', pageWidth - 70, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(220, 20, 60); // Crimson for booking number
  doc.text(booking.booking_number, pageWidth - 70, y + 6);
  
  doc.setTextColor(...black);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', pageWidth - 70, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }), pageWidth - 70, y + 20);
  
  y += 40;

  // ==================== BOOKING DETAILS ====================
  doc.setFillColor(...yellow);
  doc.rect(15, y, pageWidth - 30, 10, 'F');
  doc.setTextColor(...black);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOKING DETAILS', 20, y + 7);
  
  y += 18;
  
  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const bookingDateFormatted = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  doc.text(bookingDateFormatted, 55, y);
  
  y += 8;
  
  // Time slots
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Time:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const slotRanges = formatSlotRanges(booking.slots.map(s => s.slot_hour));
  doc.text(slotRanges, 55, y);
  
  y += 8;
  
  // Total hours
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Duration:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${booking.total_hours} hour${booking.total_hours !== 1 ? 's' : ''}`, 55, y);
  
  y += 8;
  
  // Status
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 20, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  
  let statusText = '';
  let statusColor: [number, number, number] = black;
  switch (booking.status) {
    case 'pending':
      statusText = 'PENDING APPROVAL';
      statusColor = [255, 165, 0];
      break;
    case 'approved':
      statusText = 'CONFIRMED';
      statusColor = [34, 139, 34]; // Forest Green
      break;
    case 'completed':
      statusText = 'COMPLETED';
      statusColor = [34, 139, 34];
      break;
    case 'cancelled':
      statusText = 'CANCELLED';
      statusColor = [220, 20, 60];
      break;
    default:
      statusText = booking.status.toUpperCase();
  }
  
  doc.setTextColor(...statusColor);
  doc.text(statusText, 55, y);
  doc.setTextColor(...black);
  
  y += 18;

  // ==================== PAYMENT SUMMARY ====================
  doc.setFillColor(...yellow);
  doc.rect(15, y, pageWidth - 30, 10, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('PAYMENT SUMMARY', 20, y + 7);
  
  y += 18;
  
  // Total Amount
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount:', 20, y);
  doc.setFontSize(12);
  doc.text(`PKR ${booking.total_amount.toLocaleString()}`, pageWidth - 20, y, { align: 'right' });
  
  y += 10;
  
  // Advance Payment
  doc.setFontSize(10);
  doc.text('Advance Received:', 20, y);
  const advanceMethod = booking.advance_payment_method === 'easypaisa' ? ' (Easypaisa)' :
                        booking.advance_payment_method === 'sadapay' ? ' (SadaPay)' :
                        booking.advance_payment_method === 'cash' ? ' (Cash)' : '';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(advanceMethod, 65, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(34, 139, 34); // Green
  doc.text(`PKR ${booking.advance_payment.toLocaleString()}`, pageWidth - 20, y, { align: 'right' });
  
  y += 10;
  
  // Remaining Amount
  doc.setTextColor(...black);
  doc.setFontSize(10);
  doc.text('Remaining Amount:', 20, y);
  
  if (booking.remaining_payment_method) {
    const remainingMethod = booking.remaining_payment_method === 'easypaisa' ? ' (Easypaisa)' :
                           booking.remaining_payment_method === 'sadapay' ? ' (SadaPay)' :
                           booking.remaining_payment_method === 'cash' ? ' (Cash)' : '';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(remainingMethod, 65, y);
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  if (booking.remaining_payment === 0) {
    doc.setTextColor(34, 139, 34);
    doc.text('PAID', pageWidth - 20, y, { align: 'right' });
  } else {
    doc.setTextColor(220, 20, 60); // Red
    doc.text(`PKR ${booking.remaining_payment.toLocaleString()}`, pageWidth - 20, y, { align: 'right' });
  }
  
  y += 3;
  doc.setDrawColor(...gray);
  doc.setLineWidth(0.3);
  doc.line(20, y, pageWidth - 20, y);
  
  y += 10;
  
  // Payment Status Box
  doc.setTextColor(...black);
  if (booking.remaining_payment === 0) {
    doc.setFillColor(220, 255, 220); // Light green
    doc.roundedRect(20, y - 4, pageWidth - 40, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 100, 0);
    doc.text('Your booking has been successfully confirmed!', pageWidth / 2, y + 3, { align: 'center' });
  } else {
    doc.setFillColor(255, 245, 230); // Light orange
    doc.roundedRect(20, y - 4, pageWidth - 40, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(180, 80, 0);
    doc.text(`Remaining Payment Due: PKR ${booking.remaining_payment.toLocaleString()}`, pageWidth / 2, y + 3, { align: 'center' });
  }
  doc.setTextColor(...black);
  
  y += 20;

  // ==================== IMPORTANT NOTES ====================
  doc.setFillColor(...lightYellow);
  doc.roundedRect(15, y, pageWidth - 30, 42, 3, 3, 'F');
  doc.setDrawColor(...yellow);
  doc.setLineWidth(1);
  doc.roundedRect(15, y, pageWidth - 30, 42, 3, 3, 'S');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('IMPORTANT NOTES:', 20, y + 8);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const notes = [
    '- Bats, wickets, and tapes will be provided.',
    '- You are required to bring your own tennis balls, or you may purchase them from us.',
    '- Please ensure to arrive on time.',
    '- Keep the ground clean and follow all safety rules.'
  ];
  
  let noteY = y + 16;
  notes.forEach(note => {
    doc.text(note, 22, noteY);
    noteY += 7;
  });
  
  y += 50;

  // ==================== FOOTER ====================
  doc.setFillColor(...black);
  doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
  
  // Thank you message
  doc.setTextColor(...yellow);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for choosing Powerplay Cricket Arena!', pageWidth / 2, pageHeight - 15, { align: 'center' });
  
  // Additional message
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('We look forward to welcoming you. See you at the ground!', pageWidth / 2, pageHeight - 9, { align: 'center' });
  
  // Contact info
  doc.setFontSize(8);
  doc.text('Contact: +92-XXX-XXXXXXX  |  Email: info@powerplaycricket.com', pageWidth / 2, pageHeight - 4, { align: 'center' });

  return doc;
}

// Helper function to fetch image and convert to base64
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}
