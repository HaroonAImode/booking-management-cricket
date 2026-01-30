/**
 * Invoice Generation API
 * GET /api/invoices/[id] - Generate and download invoice PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import jsPDF from 'jspdf';
import { formatSlotRanges } from '@/lib/supabase/bookings';

/* ================= TYPES ================= */

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

/* ================= API HANDLER ================= */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();
    const params = await Promise.resolve(context.params);
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
        customer:customers(name, phone),
        slots:booking_slots(slot_hour, is_night_rate, hourly_rate)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const bookingData = booking as unknown as BookingData;
    const pdf = generateInvoicePDF(bookingData);

    const buffer = Buffer.from(pdf.output('arraybuffer'));
    const safeName = bookingData.customer.name.replace(/[^a-zA-Z0-9]/g, '_');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}_${bookingData.booking_number}_Invoice.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Invoice generation failed' }, { status: 500 });
  }
}

/* ================= PDF GENERATOR ================= */

function generateInvoicePDF(booking: BookingData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  /* ===== COLORS ===== */
  const gold: [number, number, number] = [245, 184, 0];
  const black: [number, number, number] = [20, 20, 20];
  const gray: [number, number, number] = [90, 90, 90];
  const lightGray: [number, number, number] = [240, 240, 240];
  const goldLight: [number, number, number] = [255, 252, 230];
  const linkBlue: [number, number, number] = [0, 102, 204];

  let y = 20;

  /* ================= HEADER ================= */
  doc.setFillColor(...gold);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...black);
  doc.text('POWERPLAY CRICKET ARENA', pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Premium Cricket Ground & Sports Facility', pageWidth / 2, 28, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('BOOKING CONFIRMATION INVOICE', pageWidth / 2, 40, { align: 'center' });

  y = 55;

  /* ================= CUSTOMER + INVOICE ================= */
  doc.setFillColor(...goldLight);
  doc.roundedRect(15, y, pageWidth - 30, 42, 4, 4, 'F');
  doc.setDrawColor(...gold);
  doc.roundedRect(15, y, pageWidth - 30, 42, 4, 4, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS', 22, y + 10);
  doc.text('INVOICE DETAILS', pageWidth - 75, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(booking.customer.name, 22, y + 20);
  doc.text(`Phone: ${booking.customer.phone || 'N/A'}`, 22, y + 27);

  doc.setFont('helvetica', 'bold');
  doc.text(`#${booking.booking_number}`, pageWidth - 75, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 75, y + 27);

  y += 55;

  /* ================= BOOKING DETAILS ================= */
  doc.setFillColor(...gold);
  doc.roundedRect(15, y, pageWidth - 30, 12, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOKING DETAILS', 22, y + 8);

  y += 18;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...gray);
  doc.text('Time Slots:', 22, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...black);
  doc.text(formatSlotRanges(booking.slots.map(s => s.slot_hour)), 60, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Duration:', 22, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${booking.total_hours} hour(s)`, 60, y);

  y += 15;

  /* ================= PAYMENT SUMMARY ================= */
  doc.setFillColor(...gold);
  doc.roundedRect(15, y, pageWidth - 30, 12, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT SUMMARY', 22, y + 8);

  y += 18;

  const col1 = 25;
  const col2 = pageWidth / 2 + 5;
  const col3 = pageWidth - 25;
  const rowHeight = 10;

  doc.setFillColor(...lightGray);
  doc.rect(20, y, pageWidth - 40, rowHeight, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', col1, y + 7);
  doc.text('PAYMENT METHOD', col2, y + 7);
  doc.text('AMOUNT (PKR)', col3, y + 7, { align: 'right' });

  y += rowHeight;

  const drawRow = (d: string, m: string, a: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.rect(20, y, pageWidth - 40, rowHeight, 'S');
    doc.text(d, col1, y + 7);
    doc.text(m, col2, y + 7);
    doc.text(a, col3, y + 7, { align: 'right' });
    y += rowHeight;
  };

  drawRow('Total Booking Amount', '-', booking.total_amount.toLocaleString(), true);
  drawRow('Advance Paid', booking.advance_payment_method.toUpperCase(), `- ${booking.advance_payment.toLocaleString()}`);
  drawRow(
    'Remaining Balance',
    booking.remaining_payment === 0 ? '-' : booking.remaining_payment_method?.toUpperCase() || '-',
    booking.remaining_payment === 0 ? 'PAID IN FULL' : booking.remaining_payment.toLocaleString(),
    true
  );

  y += 8;

  /* ================= IMPORTANT INFO ================= */
  doc.setFillColor(...goldLight);
  doc.roundedRect(15, y, pageWidth - 30, 42, 4, 4, 'F');
  doc.setDrawColor(...gold);
  doc.roundedRect(15, y, pageWidth - 30, 42, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IMPORTANT INFORMATION', 22, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gray);

  [
    '• Bats, wickets, and tapes will be provided.',
    '• Please arrive 15 minutes before your slot.',
    '• Keep the ground clean at all times.',
    '• Bring your own tennis balls, or purchase them at the venue.'
  ].forEach((t, i) => {
    doc.text(t, 22, y + 18 + i * 6);
  });

  /* ================= CONTACT + SOCIAL (CLICKABLE) ================= */
  const footerY = pageHeight - 42;

  doc.setDrawColor(...gold);
  doc.line(20, footerY, pageWidth - 20, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('CONTACT US', pageWidth / 2, footerY + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Phone: 0340-2639174', 30, footerY + 16);
  doc.text('Email: Powerplaycricketarena@gmail.com', pageWidth - 30, footerY + 16, { align: 'right' });

  // Social links (clickable)
  doc.setTextColor(...linkBlue);
  doc.textWithLink(
    'Instagram: @powerplaycricketarena',
    30,
    footerY + 24,
    { url: 'https://www.instagram.com/powerplaycricketarena?igsh=MTA0c3NiOWR5aW9xeg==' }
  );

  doc.textWithLink(
    'TikTok: @powerplaycricketarena',
    pageWidth - 30,
    footerY + 24,
    {
      url: 'https://www.tiktok.com/@powerplaycricketarena?_r=1&_t=ZS-93SLIpFxSew',
      align: 'right'
    }
  );

  /* ================= BORDER ================= */
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

  return doc;
}
