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
  // Gold header banner with gradient effect
  doc.setFillColor(...gold);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Add subtle pattern to header
  doc.setDrawColor(255, 230, 150);
  doc.setLineWidth(0.5);
  for (let i = 0; i < pageWidth; i += 10) {
    doc.line(i, 0, i + 5, 45);
  }
  
  // Arena name with shadow effect
  doc.setTextColor(...black);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('POWERPLAY CRICKET ARENA', pageWidth / 2, 22, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Premium Cricket Ground & Sports Facility', pageWidth / 2, 32, { align: 'center' });
  
  // Invoice title with decorative line
  doc.setDrawColor(...black);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 80, 38, pageWidth / 2 + 80, 38);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('BOOKING CONFIRMATION INVOICE', pageWidth / 2, 42, { align: 'center' });
  
  y = 55;

  // ==================== BOOKING INFO CARD ====================
  // Card background
  doc.setFillColor(...goldLight);
  doc.roundedRect(15, y, pageWidth - 30, 50, 5, 5, 'F');
  doc.setDrawColor(...gold);
  doc.setLineWidth(1.5);
  doc.roundedRect(15, y, pageWidth - 30, 50, 5, 5, 'S');
  
  y += 12;
  
  // Left Column: Customer Details
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS', 22, y);
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(22, y + 2, 60, y + 2);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text(booking.customer.name, 22, y + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  doc.text(`📱 ${booking.customer.phone || 'Not provided'}`, 22, y + 16);
  
  // Right Column: Invoice Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('INVOICE DETAILS', pageWidth - 80, y);
  doc.line(pageWidth - 80, y + 2, pageWidth - 22, y + 2);
  
  // Invoice Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(220, 20, 60); // Red for invoice number
  doc.text(`#${booking.booking_number}`, pageWidth - 80, y + 10);
  
  // Invoice Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  const invoiceDate = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  doc.text(`📅 ${invoiceDate}`, pageWidth - 80, y + 16);
  
  // Booking Date
  const bookingDateFormatted = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  doc.text(`📅 Booking: ${bookingDateFormatted}`, pageWidth - 80, y + 22);
  
  y += 35;

  // ==================== BOOKING DETAILS SECTION ====================
  // Section header
  doc.setFillColor(...gold);
  doc.roundedRect(15, y, pageWidth - 30, 12, 3, 3, 'F');
  doc.setTextColor(...black);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('📋 BOOKING DETAILS', 22, y + 8);
  
  y += 20;
  
  // Time slots
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Time Slots:', 22, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...black);
  const slotRanges = formatSlotRanges(booking.slots.map(s => s.slot_hour));
  doc.text(slotRanges, 55, y);
  
  y += 8;
  
  // Duration
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Duration:', 22, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...black);
  doc.text(`${booking.total_hours} hour${booking.total_hours !== 1 ? 's' : ''}`, 55, y);
  
  // Calculate rate breakdown
  const regularSlots = booking.slots.filter(s => !s.is_night_rate).length;
  const nightSlots = booking.slots.filter(s => s.is_night_rate).length;
  const regularRate = regularSlots > 0 ? booking.slots.find(s => !s.is_night_rate)?.hourly_rate || 0 : 0;
  const nightRate = nightSlots > 0 ? booking.slots.find(s => s.is_night_rate)?.hourly_rate || 0 : 0;
  
  if (regularSlots > 0 || nightSlots > 0) {
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Rate Breakdown:', 22, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...black);
    
    let rateText = '';
    if (regularSlots > 0) {
      rateText += `${regularSlots}h @ PKR ${regularRate.toLocaleString()}/hr`;
    }
    if (nightSlots > 0) {
      if (rateText) rateText += ' + ';
      rateText += `${nightSlots}h night @ PKR ${nightRate.toLocaleString()}/hr`;
    }
    doc.text(rateText, 70, y);
  }
  
  y += 8;
  
  // Status badge
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Status:', 22, y);
  
  let statusText = '';
  let statusBg: [number, number, number] = [220, 220, 220];
  let statusColor: [number, number, number] = black;
  
  switch (booking.status) {
    case 'pending':
      statusText = '⏳ PENDING APPROVAL';
      statusBg = [255, 245, 230]; // Light orange
      statusColor = [255, 140, 0];
      break;
    case 'approved':
      statusText = '✅ CONFIRMED';
      statusBg = [220, 255, 220]; // Light green
      statusColor = [0, 128, 0];
      break;
    case 'completed':
      statusText = '🏁 COMPLETED';
      statusBg = [230, 240, 255]; // Light blue
      statusColor = [0, 0, 150];
      break;
    case 'cancelled':
      statusText = '❌ CANCELLED';
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
  doc.setFontSize(10);
  doc.text(statusText, 60, y);
  doc.setTextColor(...black);
  
  y += 15;

  // ==================== PAYMENT SUMMARY TABLE ====================
  // Section header
  doc.setFillColor(...gold);
  doc.roundedRect(15, y, pageWidth - 30, 12, 3, 3, 'F');
  doc.setTextColor(...black);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('💰 PAYMENT SUMMARY', 22, y + 8);
  
  y += 20;
  
  // Table header
  doc.setFillColor(...lightGray);
  doc.rect(20, y, pageWidth - 40, 10, 'F');
  doc.setDrawColor(...darkGray);
  doc.setLineWidth(0.3);
  doc.rect(20, y, pageWidth - 40, 10, 'S');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Description', 25, y + 7);
  doc.text('Amount', pageWidth - 25, y + 7, { align: 'right' });
  
  y += 12;
  
  // Total Amount row
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('Total Booking Amount', 25, y + 7);
  doc.text(`PKR ${booking.total_amount.toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
  
  y += 12;
  
  // Advance Payment row
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  doc.text('Advance Payment Received', 30, y + 7);
  
  // Payment method badge
  const advanceMethod = booking.advance_payment_method === 'easypaisa' ? 'EasyPaisa' :
                        booking.advance_payment_method === 'sadapay' ? 'SadaPay' :
                        booking.advance_payment_method === 'cash' ? 'Cash' : 'N/A';
  
  doc.setFontSize(9);
  doc.setFillColor(...goldLight);
  doc.roundedRect(30, y - 2, doc.getTextWidth(advanceMethod) + 6, 6, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text(advanceMethod, 33, y + 2);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 150, 0); // Green
  doc.text(`- PKR ${booking.advance_payment.toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
  
  y += 12;
  
  // Remaining Amount row
  doc.setDrawColor(...darkGray);
  doc.setLineWidth(0.3);
  doc.line(25, y + 3, pageWidth - 25, y + 3);
  
  y += 8;
  
  doc.setFontSize(12);
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
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text(`Pay via: ${remainingMethod}`, 30, y + 15);
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0); // Red
    doc.text(`PKR ${booking.remaining_payment.toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
  }
  
  y += booking.remaining_payment > 0 ? 22 : 15;

  // ==================== PAYMENT STATUS MESSAGE ====================
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  if (booking.remaining_payment === 0) {
    doc.setFillColor(220, 255, 220); // Light green
    doc.roundedRect(20, y - 5, pageWidth - 40, 12, 3, 3, 'F');
    doc.setTextColor(0, 100, 0);
    doc.text('🎉 Your booking has been successfully confirmed!', pageWidth / 2, y + 3, { align: 'center' });
  } else {
    doc.setFillColor(255, 245, 230); // Light orange
    doc.roundedRect(20, y - 5, pageWidth - 40, 15, 3, 3, 'F');
    doc.setTextColor(180, 80, 0);
    doc.text('⚠️ Remaining Payment Due:', pageWidth / 2, y + 3, { align: 'center' });
    doc.setFontSize(13);
    doc.text(`PKR ${booking.remaining_payment.toLocaleString()}`, pageWidth / 2, y + 10, { align: 'center' });
  }
  
  y += 25;

  // ==================== IMPORTANT INFORMATION ====================
  // Information card
  doc.setFillColor(...goldLight);
  doc.roundedRect(15, y, pageWidth - 30, 50, 5, 5, 'F');
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.roundedRect(15, y, pageWidth - 30, 50, 5, 5, 'S');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('📝 IMPORTANT INFORMATION', 22, y + 8);
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(22, y + 10, 90, y + 10);
  
  y += 15;
  
  // Information points
  const infoPoints = [
    '🏏 Bats, wickets, and tapes will be provided by the facility.',
    '🎾 Bring your own tennis balls, or purchase them at the venue.',
    '⏰ Please arrive 15 minutes before your scheduled time.',
    '♻️ Keep the ground clean and dispose of trash properly.',
    '🚫 Follow all safety rules and guidelines during play.',
    '📞 Contact us if you need to reschedule or cancel your booking.'
  ];
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  
  infoPoints.forEach((point, index) => {
    const xPos = index < 3 ? 25 : pageWidth / 2 + 10;
    const row = index < 3 ? y + (index * 7) : y + ((index - 3) * 7);
    doc.text(point, xPos, row);
  });
  
  y += 42;

  // ==================== CONTACT & SOCIAL MEDIA ====================
  // Contact section
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, y, pageWidth - 30, 35, 5, 5, 'F');
  doc.setDrawColor(...darkGray);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, y, pageWidth - 30, 35, 5, 5, 'S');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('📞 CONTACT INFORMATION', pageWidth / 2, y + 8, { align: 'center' });
  
  y += 15;
  
  // Contact details in two columns
  // Left column - Contact
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Phone:', 30, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...black);
  doc.text('0340-2639174', 50, y);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Email:', 30, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...black);
  // Email with clickable indication
  doc.setTextColor(0, 102, 204); // Blue for clickable
  doc.text('Powerplaycricketarena@gmail.com', 50, y + 7);
  
  // Right column - Social Media (with clickable URLs)
  const instagramLink = 'https://www.instagram.com/powerplaycricketarena';
  const tiktokLink = 'https://www.tiktok.com/@powerplaycricketarena';
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Follow Us:', pageWidth - 100, y);
  doc.setFont('helvetica', 'normal');
  
  // Instagram
  doc.setTextColor(228, 64, 95); // Instagram pink
  doc.text('Instagram', pageWidth - 100, y + 7);
  doc.setFontSize(9);
  doc.setTextColor(0, 102, 204); // Blue for URL
  doc.text('@powerplaycricketarena', pageWidth - 100, y + 12);
  
  // TikTok
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...black); // TikTok black
  doc.text('TikTok', pageWidth - 50, y + 7);
  doc.setFontSize(9);
  doc.setTextColor(0, 102, 204); // Blue for URL
  doc.text('@powerplaycricketarena', pageWidth - 50, y + 12);
  
  // Add clickable indicators
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(0, 102, 204);
  doc.text('(Clickable links in digital copy)', pageWidth / 2, y + 22, { align: 'center' });
  
  y += 28;

  // ==================== FOOTER ====================
  // Footer background
  doc.setFillColor(...black);
  doc.rect(0, pageHeight - 35, pageWidth, 35, 'F');
  
  // Thank you message
  doc.setTextColor(...gold);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank You For Choosing Powerplay Cricket Arena!', pageWidth / 2, pageHeight - 25, { align: 'center' });
  
  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Your Premier Destination for Cricket Excellence', pageWidth / 2, pageHeight - 18, { align: 'center' });
  
  // Final message
  doc.setFontSize(9);
  doc.text('We look forward to serving you. See you on the pitch!', pageWidth / 2, pageHeight - 12, { align: 'center' });
  
  // Copyright and page number
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(`Invoice ID: ${booking.booking_number} • Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
  
  // Add page border for professional look
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');

  return doc;
}