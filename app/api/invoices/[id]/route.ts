/**
 * Invoice Generation API
 * GET /api/invoices/[id] - Generate and download invoice PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}${ampm}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const params = await context.params;
    const bookingId = params.id;

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
        status,
        created_at,
        customers!customer_id (
          name,
          phone
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const { data: slots } = await supabase
      .from('booking_slots')
      .select('slot_hour, is_night_rate, hourly_rate')
      .eq('booking_id', bookingId);

    const doc = new jsPDF();
    
    const goldColor: [number, number, number] = [245, 184, 0];
    const blackColor: [number, number, number] = [26, 26, 26];
    
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('POWERPLAY', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Cricket Ground Booking', 105, 23, { align: 'center' });
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 105, 45, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 60;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice No:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(booking.booking_number, 50, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Date:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 50, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(booking.status === 'completed' ? 0 : 255, booking.status === 'completed' ? 128 : 140, booking.status === 'completed' ? 0 : 0);
    doc.text(booking.status.toUpperCase(), 50, yPos);
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    
    yPos = 60;
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 120, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    
    const customers = booking.customers as any;
    const customerName = (Array.isArray(customers) ? customers[0]?.name : customers?.name) || 'N/A';
    const customerPhone = (Array.isArray(customers) ? customers[0]?.phone : customers?.phone) || 'N/A';
    
    doc.text(customerName, 120, yPos);
    yPos += 7;
    doc.text(`Phone: ${customerPhone}`, 120, yPos);
    
    yPos += 15;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('BOOKING DETAILS', 105, yPos + 5, { align: 'center' });
    
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    doc.text(`Booking Date: ${bookingDate}`, 20, yPos);
    yPos += 7;
    doc.text(`Total Hours: ${booking.total_hours}`, 20, yPos);
    yPos += 7;
    
    const slotRanges = formatSlotRanges((slots || []).map((s: any) => s.slot_hour));
    doc.text(`Time Slots: ${slotRanges}`, 20, yPos);
    
    yPos += 15;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount']],
      body: [
        ['Total Booking Amount', `Rs ${booking.total_amount.toLocaleString()}`],
        ['Advance Payment', `Rs ${booking.advance_payment.toLocaleString()}`],
        ['Remaining Payment', `Rs ${booking.remaining_payment.toLocaleString()}`],
      ],
      theme: 'striped',
      headStyles: {
        fillColor: goldColor,
        textColor: blackColor,
        fontStyle: 'bold',
        fontSize: 11
      },
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Methods:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 7;
    doc.text(`Advance: ${booking.advance_payment_method || 'N/A'}`, 20, yPos);
    if (booking.remaining_payment_method) {
      yPos += 7;
      doc.text(`Remaining: ${booking.remaining_payment_method}`, 20, yPos);
    }
    
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text('Thank you for choosing PowerPlay!', 105, pageHeight - 20, { align: 'center' });
    doc.text('For queries, contact us at: support@powerplay.com', 105, pageHeight - 15, { align: 'center' });
    
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Invoice_${booking.booking_number}_${sanitizedName}.pdf`;
    
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Invoice generation failed', details: err.message }, { status: 500 });
  }
}
