/**
 * PUBLIC API for getting available slots
 * No authenticationn required
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
        { error: 'Date parameter is required' },
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
        { error: 'Failed to fetch available slots' },
        { status: 500 }
      );
    }

    console.log('📦 Raw RPC data received:', data?.length || 0, 'slots');
    
    // Process the data for public consumption
    const processedSlots = (data || []).map((slot: any) => {
      // CRITICAL: Convert PostgreSQL boolean to JavaScript boolean
      const isAvailable = typeof slot.is_available === 'boolean' 
        ? slot.is_available 
        : slot.is_available === true || slot.is_available === 'true' || slot.is_available === 't' || slot.is_available === '1';
      
      // Get status from database
      let status = slot.current_status || 'available';
      if (!isAvailable && status === 'available') {
        status = 'booked'; // If not available but marked as available in DB, it's booked
      }
      
      return {
        slot_hour: slot.slot_hour,
        slot_time: slot.slot_time || `${slot.slot_hour.toString().padStart(2, '0')}:00`,
        is_available: isAvailable,
        current_status: status.toLowerCase(),
        hourly_rate: typeof slot.hourly_rate === 'number' 
          ? slot.hourly_rate 
          : parseFloat(slot.hourly_rate || '1500')
      };
    });

    console.log('✅ Processed slots count:', processedSlots.length);
    if (processedSlots.length > 0) {
      console.log('Sample slots 17-23:', processedSlots.slice(17, 23));
    }

    return NextResponse.json({
      success: true,
      date,
      slots: processedSlots,
      count: processedSlots.length
    });
  } catch (error: any) {
    console.error('Public slots API exception:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}