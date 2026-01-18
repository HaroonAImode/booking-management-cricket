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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
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
  const yellow: [number, number, number] = [255, 215, 0]; // Gold
  const black: [number, number, number] = [0, 0, 0];
  const gray: [number, number, number] = [128, 128, 128];
  const lightGray: [number, number, number] = [245, 245, 245];
  
  let y = 20;

  // ==================== HEADER ====================
  // Yellow header banner
  doc.setFillColor(...yellow);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Arena name
  doc.setTextColor(...black);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('POWERPLAY CRICKET ARENA', pageWidth / 2, 15, { align: 'center' });
  
  // Cricket emoji/icon
  doc.setFontSize(28);
  doc.text('🏏', pageWidth / 2 - 60, 15);
  doc.text('🏏', pageWidth / 2 + 55, 15);
  
  // Invoice title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('BOOKING INVOICE', pageWidth / 2, 27, { align: 'center' });
  
  y = 45;

  // ==================== BOOKING INFO BOX ====================
  // Light gray background box
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, y, pageWidth - 30, 35, 3, 3, 'F');
  
  // Border
  doc.setDrawColor(...yellow);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, y, pageWidth - 30, 35, 3, 3, 'S');
  
  y += 8;
  
  // Left column
  doc.setTextColor(...black);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Name:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(booking.customer.name, 20, y + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Phone Number:', 20, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(booking.customer.phone || 'N/A', 20, y + 17);
  
  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Booking ID:', pageWidth - 80, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 0, 0);
  doc.text(booking.booking_number, pageWidth - 80, y + 5);
  
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', pageWidth - 80, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }), pageWidth - 80, y + 17);
  
  y += 40;

  // ==================== BOOKING DETAILS ====================
  doc.setFillColor(...yellow);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  doc.setTextColor(...black);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOKING DETAILS', 20, y + 5.5);
  
  y += 15;
  
  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }), 50, y);
  
  y += 7;
  
  // Time slots
  doc.setFont('helvetica', 'bold');
  doc.text('Time Slots:', 20, y);
  doc.setFont('helvetica', 'normal');
  const slotRanges = formatSlotRanges(booking.slots.map(s => s.slot_hour));
  doc.text(slotRanges, 50, y);
  
  y += 7;
  
  // Total hours
  doc.setFont('helvetica', 'bold');
  doc.text('Total Hours:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${booking.total_hours} hour${booking.total_hours !== 1 ? 's' : ''}`, 50, y);
  
  y += 7;
  
  // Status
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 20, y);
  doc.setFont('helvetica', 'bold');
  
  // Color-coded status
  let statusText = '';
  let statusColor: [number, number, number] = black;
  switch (booking.status) {
    case 'pending':
      statusText = 'PENDING APPROVAL';
      statusColor = [255, 165, 0]; // Orange
      break;
    case 'approved':
      statusText = 'APPROVED';
      statusColor = [0, 128, 255]; // Blue
      break;
    case 'completed':
      statusText = 'COMPLETED';
      statusColor = [0, 200, 0]; // Green
      break;
    case 'cancelled':
      statusText = 'CANCELLED';
      statusColor = [255, 0, 0]; // Red
      break;
    default:
      statusText = booking.status.toUpperCase();
  }
  
  doc.setTextColor(...statusColor);
  doc.text(statusText, 50, y);
  doc.setTextColor(...black);
  
  y += 15;

  // ==================== PAYMENT SUMMARY ====================
  doc.setFillColor(...yellow);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT SUMMARY', 20, y + 5.5);
  
  y += 15;
  
  // Payment table
  const tableStartY = y;
  const colWidths = [80, 50, 50];
  const rowHeight = 10;
  
  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(15, y, pageWidth - 30, rowHeight, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 20, y + 6.5);
  doc.text('Method', 100, y + 6.5);
  doc.text('Amount', pageWidth - 50, y + 6.5, { align: 'right' });
  
  y += rowHeight;
  
  // Total amount row
  doc.setFont('helvetica', 'normal');
  doc.text('Total Booking Amount', 20, y + 6.5);
  doc.text('-', 100, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`PKR ${booking.total_amount.toLocaleString()}`, pageWidth - 20, y + 6.5, { align: 'right' });
  
  y += rowHeight;
  
  // Advance payment row
  doc.setFont('helvetica', 'normal');
  doc.text('Advance Payment', 20, y + 6.5);
  const advanceMethod = booking.advance_payment_method === 'easypaisa' ? 'Easypaisa' :
                        booking.advance_payment_method === 'sadapay' ? 'SadaPay' :
                        booking.advance_payment_method === 'cash' ? 'Cash' :
                        booking.advance_payment_method || '-';
  doc.text(advanceMethod, 100, y + 6.5);
  doc.setTextColor(0, 150, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`- PKR ${booking.advance_payment.toLocaleString()}`, pageWidth - 20, y + 6.5, { align: 'right' });
  doc.setTextColor(...black);
  
  y += rowHeight;
  
  // Remaining payment row
  const isPaid = booking.remaining_payment === 0;
  doc.setFont('helvetica', 'normal');
  doc.text('Remaining Payment', 20, y + 6.5);
  
  if (booking.remaining_payment_method) {
    const remainingMethod = booking.remaining_payment_method === 'easypaisa' ? 'Easypaisa' :
                           booking.remaining_payment_method === 'sadapay' ? 'SadaPay' :
                           booking.remaining_payment_method === 'cash' ? 'Cash' :
                           booking.remaining_payment_method;
    doc.text(remainingMethod, 100, y + 6.5);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...gray);
    doc.text('Pending', 100, y + 6.5);
    doc.setTextColor(...black);
  }
  
  doc.setFont('helvetica', 'bold');
  if (isPaid) {
    doc.setTextColor(0, 150, 0);
    doc.text('PAID', pageWidth - 20, y + 6.5, { align: 'right' });
  } else {
    doc.setTextColor(255, 0, 0);
    doc.text(`PKR ${booking.remaining_payment.toLocaleString()}`, pageWidth - 20, y + 6.5, { align: 'right' });
  }
  doc.setTextColor(...black);
  
  y += rowHeight;
  
  // Divider line
  doc.setDrawColor(...yellow);
  doc.setLineWidth(1);
  doc.line(15, y, pageWidth - 15, y);
  
  y += 8;
  
  // Payment status
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Status:', 20, y);
  
  if (isPaid) {
    doc.setTextColor(0, 200, 0);
    doc.setFontSize(13);
    doc.text('✓ FULLY PAID', 60, y);
  } else {
    doc.setTextColor(255, 100, 0);
    doc.setFontSize(13);
    doc.text(`⚠ DUE: PKR ${booking.remaining_payment.toLocaleString()}`, 60, y);
  }
  doc.setTextColor(...black);
  
  y += 15;

  // ==================== PAYMENT PROOFS ====================
  if (booking.advance_payment_proof || booking.remaining_payment_proof) {
    doc.setFillColor(...yellow);
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT PROOFS', 20, y + 5.5);
    
    y += 12;
    
    try {
      let xPos = 20;
      const imgWidth = 35;
      const imgHeight = 35;
      
      // Advance payment proof
      if (booking.advance_payment_proof) {
        const { data: signedUrl } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(booking.advance_payment_proof, 60);
        
        if (signedUrl?.signedUrl) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Advance Payment:', xPos, y);
          
          try {
            const imgData = await fetchImageAsBase64(signedUrl.signedUrl);
            doc.addImage(imgData, 'JPEG', xPos, y + 2, imgWidth, imgHeight);
            xPos += imgWidth + 10;
          } catch (err) {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.text('(Image not available)', xPos, y + 15);
            xPos += imgWidth + 10;
          }
        }
      }
      
      // Remaining payment proof
      if (booking.remaining_payment_proof) {
        const { data: signedUrl } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(booking.remaining_payment_proof, 60);
        
        if (signedUrl?.signedUrl) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Remaining Payment:', xPos, y);
          
          try {
            const imgData = await fetchImageAsBase64(signedUrl.signedUrl);
            doc.addImage(imgData, 'JPEG', xPos, y + 2, imgWidth, imgHeight);
          } catch (err) {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.text('(Image not available)', xPos, y + 15);
          }
        }
      }
      
      y += imgHeight + 10;
    } catch (error) {
      console.error('Error adding payment proof images:', error);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Payment proofs attached', 20, y + 5);
      y += 15;
    }
  }

  // ==================== IMPORTANT NOTES ====================
  doc.setFillColor(255, 255, 230); // Light yellow
  doc.roundedRect(15, y, pageWidth - 30, 35, 3, 3, 'F');
  doc.setDrawColor(...yellow);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, y, pageWidth - 30, 35, 3, 3, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('IMPORTANT NOTES:', 20, y + 7);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('• Bats, wickets, and tapes are provided at the arena', 22, y + 13);
  doc.text('• Please bring your own tennis balls or purchase from us', 22, y + 19);
  doc.text('• Arrive 5 minutes before your scheduled time', 22, y + 25);
  doc.text('• Keep the ground clean and follow all safety rules', 22, y + 31);
  
  y += 43;

  // ==================== FOOTER ====================
  // Footer background
  doc.setFillColor(...black);
  doc.rect(0, pageHeight - 30, pageWidth, 30, 'F');
  
  // Thank you message
  doc.setTextColor(...yellow);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank You for Booking with Powerplay Cricket Arena!', pageWidth / 2, pageHeight - 20, { align: 'center' });
  
  // Contact details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('📞 Contact: +92-XXX-XXXXXXX  |  📧 Email: info@powerplaycricket.com  |  🌐 www.powerplaycricket.com', pageWidth / 2, pageHeight - 13, { align: 'center' });
  
  // Generated date
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on ${new Date().toLocaleString('en-US')}`, pageWidth / 2, pageHeight - 7, { align: 'center' });

  return doc;
}

// Helper function to fetch image and convert to base64
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}
