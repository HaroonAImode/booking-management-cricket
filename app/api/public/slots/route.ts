/**
 * PUBLIC API for getting available slots
 * No authentication required
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client - use await since createClient might be async
    const supabase = await createClient();
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

    // Ensure date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);
    
    if (parsedDate < today) {
      return NextResponse.json(
        { success: false, error: 'Cannot view slots for past dates' },
        { status: 400 }
      );
    }

    console.log('🔍 Public slots API called for date:', date);
    
    try {
      // Call the RPC function with error handling
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_date: date
      });

      if (error) {
        console.error('❌ Public slots RPC error:', error);
        
        // Try alternative approach if RPC fails
        console.log('🔄 Trying alternative slot fetching method...');
        const fallbackData = await getSlotsFallback(supabase, date);
        
        return NextResponse.json({
          success: true,
          date,
          slots: fallbackData,
          count: fallbackData.length,
          timestamp: new Date().toISOString(),
          note: 'Used fallback method'
        });
      }

      console.log('📦 Raw RPC data received:', Array.isArray(data) ? data.length : 0, 'slots');
      
      // Ensure data is an array
      const slotData = Array.isArray(data) ? data : [];
      
      // Process slots data with robust error handling
      const processedSlots = slotData.map((slot: any) => {
        try {
          // Convert PostgreSQL boolean to JavaScript boolean
          const isAvailable = typeof slot.is_available === 'boolean' 
            ? slot.is_available 
            : slot.is_available === true || 
              slot.is_available === 'true' || 
              slot.is_available === 't' || 
              slot.is_available === '1' ||
              slot.is_available === 1;
          
          // Get status from database
          let status = 'available';
          if (slot.current_status) {
            status = slot.current_status.toString().toLowerCase();
          }
          
          // Validate status
          const validStatuses = ['available', 'pending', 'booked', 'cancelled', 'past'];
          if (!validStatuses.includes(status)) {
            status = isAvailable ? 'available' : 'booked';
          }
          
          // Calculate hourly rate
          const hour = parseInt(slot.slot_hour) || 0;
          const isNightRate = hour >= 17 || hour < 7;
          const hourlyRate = isNightRate ? 2000 : 1500;
          
          // Determine if slot is past current time (for today's date)
          let finalStatus = status;
          const now = new Date();
          const isToday = parsedDate.toDateString() === now.toDateString();
          
          if (isToday && hour < now.getHours() && status === 'available') {
            finalStatus = 'past';
          }
          
          return {
            slot_hour: hour,
            slot_time: slot.slot_time || `${hour.toString().padStart(2, '0')}:00`,
            is_available: finalStatus === 'available',
            current_status: finalStatus,
            hourly_rate: hourlyRate,
            is_night_rate: isNightRate
          };
        } catch (slotError) {
          console.error('Error processing slot:', slotError, slot);
          // Return default slot structure
          const hour = parseInt(slot?.slot_hour) || 0;
          return {
            slot_hour: hour,
            slot_time: `${hour.toString().padStart(2, '0')}:00`,
            is_available: false,
            current_status: 'booked',
            hourly_rate: hour >= 17 || hour < 7 ? 2000 : 1500,
            is_night_rate: hour >= 17 || hour < 7
          };
        }
      });

      console.log('✅ Processed slots count:', processedSlots.length);
      
      // Log sample data for debugging
      if (processedSlots.length > 0) {
        console.log('📊 Sample slots (hours 17-23):', 
          processedSlots.filter(s => s.slot_hour >= 17 && s.slot_hour <= 23)
        );
      }

      return NextResponse.json({
        success: true,
        date,
        slots: processedSlots,
        count: processedSlots.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (rpcError: any) {
      console.error('❌ RPC call exception:', rpcError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection error',
          details: rpcError.message 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('💥 Public slots API exception:', error);
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

// Fallback function if RPC fails
async function getSlotsFallback(supabase: any, date: string): Promise<any[]> {
  try {
    console.log('🔄 Using fallback slot fetching for date:', date);
    
    // Get all bookings for the date
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        booking_slots!inner (
          slot_hour,
          slot_date,
          status
        )
      `)
      .eq('booking_slots.slot_date', date);
    
    if (bookingsError) {
      console.error('Fallback bookings error:', bookingsError);
      return generateDefaultSlots();
    }
    
    // Get all booked/pending slot hours
    const bookedSlots = new Set<number>();
    const pendingSlots = new Set<number>();
    
    bookings?.forEach((booking: any) => {
      booking.booking_slots?.forEach((slot: any) => {
        if (booking.status === 'approved' || booking.status === 'completed') {
          bookedSlots.add(slot.slot_hour);
        } else if (booking.status === 'pending') {
          pendingSlots.add(slot.slot_hour);
        }
      });
    });
    
    // Generate 24-hour slots
    const slots = [];
    const now = new Date();
    const isToday = new Date(date).toDateString() === now.toDateString();
    const currentHour = isToday ? now.getHours() : -1;
    
    for (let hour = 0; hour < 24; hour++) {
      let status = 'available';
      let isAvailable = true;
      
      if (bookedSlots.has(hour)) {
        status = 'booked';
        isAvailable = false;
      } else if (pendingSlots.has(hour)) {
        status = 'pending';
        isAvailable = false;
      } else if (isToday && hour < currentHour) {
        status = 'past';
        isAvailable = false;
      }
      
      const isNightRate = hour >= 17 || hour < 7;
      
      slots.push({
        slot_hour: hour,
        slot_time: `${hour.toString().padStart(2, '0')}:00`,
        is_available: isAvailable,
        current_status: status,
        hourly_rate: isNightRate ? 2000 : 1500,
        is_night_rate: isNightRate
      });
    }
    
    console.log('✅ Fallback slots generated:', slots.length);
    return slots;
    
  } catch (error) {
    console.error('💥 Fallback slot generation error:', error);
    return generateDefaultSlots();
  }
}

// Generate default slots when all else fails
function generateDefaultSlots(): any[] {
  console.log('⚠️ Generating default slots structure');
  const slots = [];
  const now = new Date();
  const currentHour = now.getHours();
  
  for (let hour = 0; hour < 24; hour++) {
    const isNightRate = hour >= 17 || hour < 7;
    const isPast = hour < currentHour;
    
    slots.push({
      slot_hour: hour,
      slot_time: `${hour.toString().padStart(2, '0')}:00`,
      is_available: !isPast,
      current_status: isPast ? 'past' : 'available',
      hourly_rate: isNightRate ? 2000 : 1500,
      is_night_rate: isNightRate
    });
  }
  
  return slots;
}