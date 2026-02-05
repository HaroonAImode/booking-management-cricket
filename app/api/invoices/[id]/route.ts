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
    const whiteColor: [number, number, number] = [255, 255, 255];
    
    // Extract customer info first
    const customers = booking.customers as any;
    const customerName = (Array.isArray(customers) ? customers[0]?.name : customers?.name) || 'N/A';
    const customerPhone = (Array.isArray(customers) ? customers[0]?.phone : customers?.phone) || 'N/A';
    
    // Header - Full width gold banner
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(0, 0, 210, 25, 'F');
    
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('POWERPLAY CRICKET ARENA', 105, 12, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Premium Cricket Ground & Sports Facility', 105, 19, { align: 'center' });
    
    // Invoice title
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(10, 30, 190, 10, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('BOOKING CONFIRMATION INVOICE', 105, 37, { align: 'center' });
    
    // Customer Details and Invoice Details side by side with borders
    let yPos = 45;
    
    // Customer Details Box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(10, yPos, 90, 25);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER DETAILS', 15, yPos + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(customerName, 15, yPos + 11);
    doc.text(`Phone: ${customerPhone}`, 15, yPos + 17);
    
    // Invoice Details Box
    doc.rect(110, yPos, 90, 25);
    
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE DETAILS', 115, yPos + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`#BK-${booking.booking_number}`, 115, yPos + 11);
    doc.text(`Date: ${new Date(booking.booking_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`, 115, yPos + 17);
    
    // Booking Details Section
    yPos += 30;
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(10, yPos, 190, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    doc.text('BOOKING DETAILS', 105, yPos + 5.5, { align: 'center' });
    
    yPos += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const slotRanges = formatSlotRanges((slots || []).map((s: any) => s.slot_hour));
    doc.text(`Time Slots:`, 15, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${slotRanges}`, 50, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Duration:`, 15, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${booking.total_hours} hour(s)`, 50, yPos);
    
    // Payment Summary Section
    yPos += 10;
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(10, yPos, 190, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT SUMMARY', 105, yPos + 5.5, { align: 'center' });
    
    yPos += 10;
    
    // Payment table
    autoTable(doc, {
      startY: yPos,
      head: [['DESCRIPTION', 'PAYMENT METHOD', 'AMOUNT (PKR)']],
      body: [
        ['Total Booking Amount', '-', booking.total_amount.toLocaleString()],
        ['Advance Paid', booking.advance_payment_method || 'CASH', booking.advance_payment.toLocaleString()],
        ['Remaining Balance', booking.remaining_payment_method || '-', booking.remaining_payment > 0 ? booking.remaining_payment.toLocaleString() : 'PAID IN FULL'],
      ],
      theme: 'plain',
      headStyles: {
        fillColor: whiteColor,
        textColor: blackColor,
        fontStyle: 'bold',
        fontSize: 9,
        lineWidth: 0.5,
        lineColor: [200, 200, 200]
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineWidth: 0.5,
        lineColor: [200, 200, 200]
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 50, halign: 'center' },
        2: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 10, right: 10 }
    });
    
    // Important Information Section
    yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(10, yPos, 190, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANT INFORMATION', 105, yPos + 5.5, { align: 'center' });
    
    yPos += 12;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const infoItems = [
      '• Bats, wickets, and tapes will be provided.',
      '• Please arrive 15 minutes before your slot.',
      '• Keep the ground clean at all times.',
      '• Bring your own tennis balls, or purchase them at the venue.'
    ];
    
    infoItems.forEach(item => {
      doc.text(item, 15, yPos);
      yPos += 5;
    });
    
    // Contact Details Section
    yPos += 5;
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(10, yPos, 190, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    doc.text('CONTACT US', 105, yPos + 5.5, { align: 'center' });
    
    yPos += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    
    // Phone
    doc.text('Phone: 0340-8149114', 15, yPos);
    
    // Email
    yPos += 6;
    doc.text('Email: ', 15, yPos);
    doc.setTextColor(0, 0, 255);
    doc.textWithLink('Powerplaycricketarena@gmail.com', 33, yPos, { url: 'mailto:Powerplaycricketarena@gmail.com' });
    
    // Instagram
    yPos += 6;
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    doc.text('Instagram: ', 15, yPos);
    doc.setTextColor(0, 0, 255);
    doc.textWithLink('@powerplaycricketarena', 39, yPos, { url: 'https://www.instagram.com/powerplaycricketarena?igsh=MTA0c3NiOWR5aW9xeg==' });
    
    // TikTok
    yPos += 6;
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    doc.text('Tel.in: ', 15, yPos);
    doc.setTextColor(0, 0, 255);
    doc.textWithLink('@powerplaycricketarena', 32, yPos, { url: 'https://www.tiktok.com/@powerplaycricketarena?_r=1&_t=ZS-93SLIpFxSew' });
    
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${sanitizedName}_${booking.booking_number}.pdf`;
    
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
