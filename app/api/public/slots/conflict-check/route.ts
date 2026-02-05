/**
 * API Endpoint: Conflict Check for Slot Booking
 * Verifies if slots are still available before booking
 * Prevents race conditions when multiple users book simultaneously
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { date, slot_hours } = body;
    
    if (!date || !slot_hours || !Array.isArray(slot_hours)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Date and slot_hours array are required' 
        },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid date format. Use YYYY-MM-DD' 
        },
        { status: 400 }
      );
    }

    console.log('🔒 Conflict check requested:', { date, slot_hours });

    // Call the database function to check and lock slots
    const { data, error } = await supabase.rpc('check_and_lock_slots', {
      p_date: date,
      p_slot_hours: slot_hours
    });

    if (error) {
      console.error('❌ Conflict check RPC error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to verify slot availability',
          details: error.message 
        },
        { status: 500 }
      );
    }

    // Check if all slots are available
    const conflicts = data?.filter((slot: any) => !slot.is_available) || [];
    const allAvailable = conflicts.length === 0;

    console.log('✅ Conflict check result:', { 
      allAvailable, 
      conflicts: conflicts.length,
      data 
    });

    return NextResponse.json({
      success: true,
      all_available: allAvailable,
      conflicts: conflicts,
      checked_slots: data || [],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('💥 Conflict check API exception:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Also allow GET for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const slotsParam = searchParams.get('slots');
  
  if (!date || !slotsParam) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Date and slots parameters are required (e.g., ?date=2026-02-05&slots=14,15,16)' 
      },
      { status: 400 }
    );
  }

  const slot_hours = slotsParam.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

  // Call POST handler
  return POST(request);
}
