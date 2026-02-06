/**
 * Version Check API - Shows deployed code version
 * Use to verify Vercel deployment
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: '2026-02-07-FIX',
    timestamp: new Date().toISOString(),
    fix: 'p_advance_payment_proof parameter included',
    commit: 'a4d14a1',
    status: 'UPDATED',
    parameters: [
      'p_customer_name',
      'p_booking_date',
      'p_total_hours',
      'p_total_amount',
      'p_advance_payment',
      'p_advance_payment_method',
      'p_advance_payment_proof', // ✅ THIS SHOULD BE HERE
      'p_slots',
      'p_customer_phone',
      'p_customer_notes',
    ],
  });
}
