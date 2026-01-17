/**
 * Bookings Page (Public Route)
 * 
 * Purpose: Public booking page for customers to book cricket ground time slots.
 * No login required - customers can directly book and submit payment proof.
 */

'use client';

import BookingForm from '@/components/BookingForm';

export default function BookingsPage() {
  return <BookingForm />;
}

