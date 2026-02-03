/**
 * PUBLIC API for getting available slots
 * No authentication required
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Parse the date to ensure it's valid
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date' },
        { status: 400 }
      );
    }

    console.log('🔍 Public slots API called for date:', date);
    
    // Call the RPC function
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_date: date
    });

    if (error) {
      console.error('Public slots RPC error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch available slots', details: error.message },
        { status: 500 }
      );
    }

    console.log('📦 Raw RPC data received:', Array.isArray(data) ? data.length : 0, 'slots');
    
    // Ensure data is an array
    const slotData = Array.isArray(data) ? data : [];
    
    // Process slots data
    const processedSlots = slotData.map((slot: any) => {
      // Convert PostgreSQL boolean to JavaScript boolean
      const isAvailable = typeof slot.is_available === 'boolean' 
        ? slot.is_available 
        : slot.is_available === true || slot.is_available === 'true' || slot.is_available === 't' || slot.is_available === '1';
      
      // Get status from database
      let status = (slot.current_status || 'available').toString().toLowerCase();
      if (!isAvailable && status === 'available') {
        status = 'booked';
      }
      
      // Calculate hourly rate
      const hour = parseInt(slot.slot_hour) || 0;
      const isNightRate = hour >= 17 || hour < 7;
      const hourlyRate = isNightRate ? 2000 : 1500;
      
      return {
        slot_hour: hour,
        slot_time: slot.slot_time || `${hour.toString().padStart(2, '0')}:00`,
        is_available: isAvailable,
        current_status: status,
        hourly_rate: hourlyRate,
        is_night_rate: isNightRate
      };
    });

    console.log('✅ Processed slots count:', processedSlots.length);

    return NextResponse.json({
      success: true,
      date,
      slots: processedSlots,
      count: processedSlots.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Public slots API exception:', error);
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