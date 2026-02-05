/**
 * Invoice Generation API
 * GET /api/invoices/[id] - Generate and download invoice PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* ================= TYPES ================= */

/**
 * @typedef {Object} Slot
 * @property {number} slot_hour
 * @property {boolean} is_night_rate
 * @property {number} hourly_rate
 */

/**
 * @typedef {Object} Customer
 * @property {string} name
 * @property {string} phone
 */

/**
 * @typedef {Object} BookingData
 * @property {string} id
 * @property {string} booking_number
 * @property {string} booking_date
 * @property {number} total_hours
 * @property {number} total_amount
 * @property {number} advance_payment
 * @property {number} remaining_payment
 * @property {string} advance_payment_method
 * @property {string|null} remaining_payment_method
 * @property {string} status
 * @property {string} created_at
 * @property {Customer} customer
 * @property {Slot[]} slots
 */

/* ================= SLOT FORMATTING ================= */

/**
 * Format slot ranges from array of hours
 * @param {number[]} hours - Array of slot hours
 * @returns {string} Formatted slot ranges
 */
function formatSlotRanges(hours) {
  if (!hours || hours.length === 0) return 'No slots selected';
  
  const sortedHours = [...hours].sort((a, b) => a - b);
  const ranges = [];
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

/**
 * Format hour to time string
 * @param {number} hour - Hour (0-23)
 * @returns {string} Formatted time
 */
function formatTime(hour) {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}${ampm}`;
}

/* ================= API HANDLER ================= */

export async function GET(
  request: NextRequest,
  { params }
) {
  try {
    const supabase = createClient();
    const bookingId = params.id;

    console.log('🔍 Fetching invoice for booking:', bookingId);

    // Fetch booking data with customer details via JOIN
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
      console.error('❌ Booking not found:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Booking not found' 
      }, { status: 404 });
    }

    // Fetch slots for this booking
    const { data: slots } = await supabase
      .from('booking_slots')
      .select('slot_hour, is_night_rate, hourly_rate')
      .eq('booking_id', bookingId);

    console.log('✅ Booking data fetched:', booking.booking_number);

    // Create a simple HTML invoice instead of PDF to avoid jsPDF issues
    const invoiceHtml = generateInvoiceHTML(booking, slots || []);
    
    // Return HTML that can be printed or saved as PDF by the browser
    return new NextResponse(invoiceHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${booking.booking_number}_invoice.html"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    console.error('❌ Invoice generation error:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Invoice generation failed',
      details: err.message 
    }, { status: 500 });
  }
}

/* ================= HTML INVOICE GENERATOR ================= */

/**
 * Generate HTML invoice instead of PDF (more reliable for deployment)
 * @param {any} booking - Booking data
 * @param {any[]} slots - Booking slots
 * @returns {string} HTML invoice
 */
function generateInvoiceHTML(booking, slots) {
  const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const invoiceDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const slotRanges = formatSlotRanges(slots.map(s => s.slot_hour));
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${booking.booking_number}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
        }
        
        body {
            background: #fff;
            color: #1a1a1a;
            padding: 20px;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 3px solid #F5B800;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(245, 184, 0, 0.2);
        }
        
        .header {
            background: linear-gradient(135deg, #F5B800 0%, #FFC933 100%);
            padding: 30px;
            text-align: center;
            color: #1a1a1a;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 900;
            margin-bottom: 5px;
            letter-spacing: 1px;
        }
        
        .header h2 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            opacity: 0.9;
        }
        
        .header .invoice-title {
            font-size: 24px;
            font-weight: 800;
            background: #1a1a1a;
            color: #F5B800;
            display: inline-block;
            padding: 10px 30px;
            border-radius: 8px;
            margin-top: 10px;
        }
        
        .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            padding: 25px;
            background: #FFF9E6;
        }
        
        .info-box {
            background: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #F5B800;
        }
        
        .info-box h3 {
            color: #1a1a1a;
            margin-bottom: 15px;
            font-size: 16px;
            font-weight: 700;
            border-bottom: 2px solid #F5B800;
            padding-bottom: 8px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
        }
        
        .info-row:last-child {
            border-bottom: none;
        }
        
        .info-label {
            font-weight: 600;
            color: #666;
        }
        
        .info-value {
            font-weight: 700;
            color: #1a1a1a;
        }
        
        .booking-details {
            padding: 25px;
            background: white;
        }
        
        .section-title {
            background: #F5B800;
            color: #1a1a1a;
            padding: 12px 20px;
            font-size: 18px;
            font-weight: 800;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .slots-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 10px;
            margin: 20px 0;
        }
        
        .slot-card {
            background: #1a1a1a;
            color: white;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #F5B800;
        }
        
        .slot-time {
            font-size: 18px;
            font-weight: 800;
            margin-bottom: 5px;
        }
        
        .slot-rate {
            font-size: 14px;
            color: #F5B800;
            font-weight: 600;
        }
        
        .payment-summary {
            background: #1a1a1a;
            color: white;
            padding: 25px;
            border-radius: 10px;
            margin: 20px 0;
        }
        
        .payment-summary h3 {
            color: #F5B800;
            margin-bottom: 20px;
            font-size: 20px;
            font-weight: 800;
        }
        
        .payment-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #333;
        }
        
        .payment-row.total {
            border-top: 2px solid #F5B800;
            border-bottom: none;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 18px;
            font-weight: 800;
            color: #F5B800;
        }
        
        .footer {
            background: #FFF9E6;
            padding: 25px;
            text-align: center;
            border-top: 3px solid #F5B800;
        }
        
        .footer h3 {
            color: #1a1a1a;
            margin-bottom: 15px;
            font-size: 16px;
            font-weight: 700;
        }
        
        .footer p {
            color: #666;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .contact-info {
            display: flex;
            justify-content: space-around;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        
        .contact-item {
            margin: 10px;
        }
        
        .contact-item a {
            color: #1a1a1a;
            text-decoration: none;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        
        .contact-item a:hover {
            color: #F5B800;
        }
        
        @media print {
            body {
                padding: 0;
            }
            
            .invoice-container {
                border: none;
                box-shadow: none;
            }
            
            .no-print {
                display: none;
            }
            
            .print-btn {
                display: none;
            }
        }
        
        .print-btn {
            background: #F5B800;
            color: #1a1a1a;
            border: none;
            padding: 12px 30px;
            font-size: 16px;
            font-weight: 700;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 20px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .print-btn:hover {
            background: #FFD95E;
            transform: translateY(-2px);
            transition: all 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <h1>POWERPLAY CRICKET ARENA</h1>
            <h2>Premium Cricket Ground & Sports Facility</h2>
            <div class="invoice-title">BOOKING CONFIRMATION INVOICE</div>
        </div>
        
        <div class="info-section">
            <div class="info-box">
                <h3>CUSTOMER DETAILS</h3>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${booking.customers?.name || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${booking.customers?.phone || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Booking Date:</span>
                    <span class="info-value">${bookingDate}</span>
                </div>
            </div>
            
            <div class="info-box">
                <h3>INVOICE DETAILS</h3>
                <div class="info-row">
                    <span class="info-label">Invoice #:</span>
                    <span class="info-value">${booking.booking_number}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Invoice Date:</span>
                    <span class="info-value">${invoiceDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value" style="color: ${booking.status === 'confirmed' ? '#10B981' : '#F59E0B'}; font-weight: 800;">
                        ${booking.status.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
        
        <div class="booking-details">
            <div class="section-title">BOOKING DETAILS</div>
            
            <div class="info-row">
                <span class="info-label">Time Slots:</span>
                <span class="info-value">${slotRanges}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Duration:</span>
                <span class="info-value">${booking.total_hours} hour(s)</span>
            </div>
            
            ${slots.length > 0 ? `
            <h3 style="margin: 25px 0 15px 0; color: #1a1a1a;">Selected Slots:</h3>
            <div class="slots-grid">
                ${slots.map(slot => {
                    const hour = slot.slot_hour;
                    const time = hour % 12 || 12;
                    const ampm = hour < 12 ? 'AM' : 'PM';
                    const rate = slot.is_night_rate ? 2000 : 1500;
                    return `
                    <div class="slot-card">
                        <div class="slot-time">${time}:00 ${ampm}</div>
                        <div class="slot-rate">Rs ${rate}/hr</div>
                    </div>
                    `;
                }).join('')}
            </div>
            ` : ''}
        </div>
        
        <div class="payment-summary">
            <h3>PAYMENT SUMMARY</h3>
            
            <div class="payment-row">
                <span>Total Booking Amount:</span>
                <span style="font-weight: 700;">Rs ${booking.total_amount?.toLocaleString() || '0'}</span>
            </div>
            
            <div class="payment-row">
                <span>Advance Paid (${booking.advance_payment_method || 'N/A'}):</span>
                <span style="color: #10B981; font-weight: 700;">- Rs ${booking.advance_payment?.toLocaleString() || '0'}</span>
            </div>
            
            ${booking.remaining_payment > 0 ? `
            <div class="payment-row">
                <span>Remaining Balance (${booking.remaining_payment_method || 'To be paid'}):</span>
                <span style="color: #F59E0B; font-weight: 700;">Rs ${booking.remaining_payment?.toLocaleString() || '0'}</span>
            </div>
            ` : `
            <div class="payment-row">
                <span>Remaining Balance:</span>
                <span style="color: #10B981; font-weight: 700;">PAID IN FULL ✓</span>
            </div>
            `}
            
            <div class="payment-row total">
                <span>NET AMOUNT:</span>
                <span>Rs ${(booking.total_amount - (booking.advance_payment || 0))?.toLocaleString() || '0'}</span>
            </div>
        </div>
        
        <div class="footer">
            <h3>IMPORTANT INFORMATION</h3>
            <p>• Bats, wickets, and tapes will be provided.</p>
            <p>• Please arrive 15 minutes before your slot.</p>
            <p>• Keep the ground clean at all times.</p>
            <p>• Bring your own tennis balls, or purchase them at the venue.</p>
            <p>• Cancellation must be made 24 hours in advance for refund.</p>
            
            <div class="contact-info">
                <div class="contact-item">
                    <strong>📞 Phone:</strong> 0340-2639174
                </div>
                <div class="contact-item">
                    <strong>✉️ Email:</strong> Powerplaycricketarena@gmail.com
                </div>
                <div class="contact-item">
                    <a href="https://www.instagram.com/powerplaycricketarena?igsh=MTA0c3NiOWR5aW9xeg==" target="_blank">
                        📷 Instagram: @powerplaycricketarena
                    </a>
                </div>
                <div class="contact-item">
                    <a href="https://www.tiktok.com/@powerplaycricketarena?_r=1&_t=ZS-93SLIpFxSew" target="_blank">
                        🎵 TikTok: @powerplaycricketarena
                    </a>
                </div>
            </div>
            
            <button class="print-btn" onclick="window.print()">
                🖨️ Print Invoice
            </button>
            
            <p style="margin-top: 20px; font-size: 12px; color: #888;">
                Thank you for choosing Powerplay Cricket Arena! We look forward to serving you.
            </p>
        </div>
    </div>
    
    <script>
        // Auto-print option (optional)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('print') === 'true') {
            window.print();
        }
    </script>
</body>
</html>`;
}