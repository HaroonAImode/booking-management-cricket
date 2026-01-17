/**
 * Bookings Page (Public Route)
 * 
 * Purpose: Public booking page with calendar-first flow
 * NEW FLOW:
 * 1. Customer views calendar and availability FIRST
 * 2. Selects date and time slots
 * 3. THEN fills booking form
 * No login required - direct booking with payment proof.
 */

'use client';

import CalendarFirstBooking from '@/components/CalendarFirstBooking';

export default function BookingsPage() {
  return <CalendarFirstBooking />;
}

