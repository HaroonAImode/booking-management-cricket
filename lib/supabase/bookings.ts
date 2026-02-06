/**
 * Supabase Booking Utilities
 * 
 * Database operations for public booking system
 */

import { createClient } from './client';

// ========================================
// TYPES
// ========================================

export interface Settings {
  day_rate: number;
  night_rate: number;
  night_start_hour: number;
  night_end_hour: number;
  advance_payment_required: number;
}

export interface SlotInfo {
  slot_hour: number;
  slot_time: string;
  is_available: boolean;
  current_status: 'available' | 'pending' | 'booked' | 'cancelled';
  hourly_rate: number;
}

export interface CreateCustomerData {
  name: string;
  phone?: string;
  notes?: string;
}

export interface CreateBookingData {
  customer_id: string;
  booking_date: string;
  total_hours: number;
  total_amount: number;
  advance_payment: number;
  advance_payment_method: string;
  advance_payment_proof: string;
  customer_notes?: string;
}

export interface CreateBookingSlotData {
  booking_id: string;
  slot_date: string;
  slot_time: string;
  slot_hour: number;
  is_night_rate: boolean;
  hourly_rate: number;
}

// ========================================
// SETTINGS
// ========================================

/**
 * Fetch system settings (rates, timings)
 */
export async function fetchSettings(): Promise<{ data: Settings | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get booking rates using RPC function
    const { data, error } = await supabase.rpc('get_booking_rates');

    if (error) {
      console.error('Fetch settings error:', error);
      return { data: null, error: error.message };
    }

    // Add advance payment required (default 50% if not set)
    const settings: Settings = {
      day_rate: data.day_rate,
      night_rate: data.night_rate,
      night_start_hour: data.night_start_hour,
      night_end_hour: data.night_end_hour,
      advance_payment_required: 500, // Default advance payment
    };

    return { data: settings as Settings, error: null };
  } catch (err) {
    console.error('Fetch settings exception:', err);
    return { data: null, error: 'Failed to fetch settings' };
  }
}

// ========================================
// SLOTS - UPDATED TO FIX THE BUG
// ========================================

/**
 * Get available slots for a specific date using database function
 */
export async function getAvailableSlots(
  date: string
): Promise<{ data: SlotInfo[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    console.log('🔍 getAvailableSlots called with date:', date);
    
    // Ensure date is in YYYY-MM-DD format (strip time if present)
    let cleanDate = date;
    if (date.includes('T')) {
      cleanDate = date.split('T')[0];
    }
    
    console.log('🔍 Clean date for RPC:', cleanDate);
    
    // Call RPC - function now accepts TEXT parameter
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_date: cleanDate
    });

    console.log('🔍 RPC response:', { 
      hasData: !!data, 
      dataLength: data?.length,
      error: error?.message 
    });

    if (error) {
      console.error('❌ Get available slots error:', error);
      return { data: null, error: error.message };
    }

    // Process and transform the data to match SlotInfo interface
    const processedData = (data || []).map((slot: any) => {
      // Ensure slot_time is in correct format (convert "08:00" or "08:00:00" to "08:00")
      let slotTime = slot.slot_time;
      if (typeof slotTime === 'string') {
        if (slotTime.includes(':')) {
          const parts = slotTime.split(':');
          if (parts.length >= 2) {
            slotTime = `${parts[0].padStart(2, '0')}:${parts[1]}`;
          }
        }
      } else {
        slotTime = `${slot.slot_hour.toString().padStart(2, '0')}:00`;
      }
      
      // Ensure is_available is boolean
      const isAvailable = slot.is_available === true || 
                         slot.is_available === 'true' || 
                         slot.is_available === 't' ||
                         slot.is_available === '1';
      
      // Ensure current_status is valid
      const validStatuses = ['available', 'pending', 'booked', 'cancelled'];
      let currentStatus = (slot.current_status || 'available').toLowerCase();
      if (!validStatuses.includes(currentStatus)) {
        currentStatus = 'available';
      }
      
      // Parse hourly rate
      const hourlyRate = typeof slot.hourly_rate === 'number' 
        ? slot.hourly_rate 
        : parseFloat(slot.hourly_rate || '1500');
      
      return {
        slot_hour: slot.slot_hour,
        slot_time: slotTime,
        is_available: isAvailable,
        current_status: currentStatus as 'available' | 'pending' | 'booked' | 'cancelled',
        hourly_rate: hourlyRate
      };
    });

    console.log('✅ Processed slots:', processedData.length);
    console.log('📊 Sample slots:', processedData.slice(0, 3));
    
    // Debug log for slots 17-23 (the problem hours)
    if (processedData.length > 0) {
      const debugSlots = processedData.filter((s: SlotInfo) => s.slot_hour >= 17 && s.slot_hour <= 23);
      console.log('🔍 Slots 17-23 details:', debugSlots.map((s: SlotInfo) => ({
        hour: s.slot_hour,
        status: s.current_status,
        available: s.is_available
      })));
    }
    
    return { data: processedData, error: null };
  } catch (err) {
    console.error('💥 Get available slots exception:', err);
    return { data: null, error: 'Failed to fetch available slots' };
  }
}

/**
 * Check if specific slots are available (client-side validation)
 */
export async function checkSlotsAvailability(
  date: string,
  slotHours: number[]
): Promise<{ available: boolean; conflictingSlots: number[]; error: string | null }> {
  try {
    const supabase = createClient();

    // Ensure date is in correct format
    const cleanDate = date.includes('T') ? date.split('T')[0] : date;
    
    const { data, error } = await supabase
      .from('booking_slots')
      .select('slot_hour, status')
      .eq('slot_date', cleanDate)
      .in('slot_hour', slotHours)
      .in('status', ['pending', 'booked']);

    if (error) {
      console.error('Check slots availability error:', error);
      return { available: false, conflictingSlots: [], error: error.message };
    }

    const conflictingSlots = data.map((slot) => slot.slot_hour);
    const available = conflictingSlots.length === 0;

    return { available, conflictingSlots, error: null };
  } catch (err) {
    console.error('Check slots availability exception:', err);
    return { available: false, conflictingSlots: [], error: 'Failed to check availability' };
  }
}

// ========================================
// CALCULATE AMOUNT
// ========================================

/**
 * Calculate total booking amount using database function
 */
export async function calculateBookingAmount(
  date: string,
  slotHours: number[]
): Promise<{ data: number | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('calculate_booking_amount', {
      p_slot_date: date,
      p_slot_hours: slotHours,
    });

    if (error) {
      console.error('Calculate booking amount error:', error);
      return { data: null, error: error.message };
    }

    return { data: parseFloat(data), error: null };
  } catch (err) {
    console.error('Calculate booking amount exception:', err);
    return { data: null, error: 'Failed to calculate amount' };
  }
}

// ========================================
// CREATE BOOKING
// ========================================

/**
 * Create a new customer
 */
export async function createCustomer(
  customerData: CreateCustomerData
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select('id')
      .single();

    if (error) {
      console.error('Create customer error:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Create customer exception:', err);
    return { data: null, error: 'Failed to create customer' };
  }
}

/**
 * Create a new booking
 */
export async function createBooking(
  bookingData: CreateBookingData
): Promise<{ data: { id: string; booking_number: string } | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          ...bookingData,
          advance_payment_date: new Date().toISOString(),
          remaining_payment: bookingData.total_amount - bookingData.advance_payment,
        },
      ])
      .select('id, booking_number')
      .single();

    if (error) {
      console.error('Create booking error:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Create booking exception:', err);
    return { data: null, error: 'Failed to create booking' };
  }
}

/**
 * Create booking slots
 */
export async function createBookingSlots(
  slots: CreateBookingSlotData[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from('booking_slots').insert(
      slots.map((slot) => ({
        ...slot,
        status: 'pending', // All new bookings start as pending
      }))
    );

    if (error) {
      console.error('Create booking slots error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Create booking slots exception:', err);
    return { success: false, error: 'Failed to create booking slots' };
  }
}

/**
 * Complete booking creation using atomic database function
 * Prevents double booking with database-level transaction safety
 */
export async function createCompleteBooking(params: {
  customer: CreateCustomerData;
  booking: Omit<CreateBookingData, 'customer_id'>;
  slots: Omit<CreateBookingSlotData, 'booking_id'>[];
}): Promise<{
  data: { booking_id: string; booking_number: string } | null;
  error: string | null;
}> {
  try {
    const supabase = createClient();

    // Prepare slots data as JSONB array
    const slotsJson = params.slots.map((slot) => ({
      slot_hour: slot.slot_hour,
      slot_time: slot.slot_time,
      slot_date: slot.slot_date,
      is_night_rate: slot.is_night_rate,
      hourly_rate: slot.hourly_rate,
    }));

    // Call atomic database function
    const { data, error } = await supabase.rpc('create_booking_with_slots', {
      p_customer_name: params.customer.name,
      p_booking_date: params.booking.booking_date,
      p_total_hours: params.booking.total_hours,
      p_total_amount: params.booking.total_amount,
      p_advance_payment: params.booking.advance_payment,
      p_advance_payment_method: params.booking.advance_payment_method,
      p_advance_payment_proof: params.booking.advance_payment_proof,
      p_slots: slotsJson,
      p_customer_phone: params.customer.phone || null,
      p_customer_notes: params.booking.customer_notes || null,
    });

    if (error) {
      console.error('Create booking RPC error:', error);
      return { data: null, error: error.message };
    }

    // The RPC function returns an array with one result
    const result = Array.isArray(data) ? data[0] : data;

    if (!result.success) {
      return { data: null, error: result.error_message || 'Booking failed' };
    }

    return {
      data: {
        booking_id: result.booking_id,
        booking_number: result.booking_number,
      },
      error: null,
    };
  } catch (err) {
    console.error('Create complete booking exception:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Cleanup expired pending bookings (call periodically)
 * Returns number of bookings released
 */
export async function cleanupExpiredBookings(): Promise<{
  data: { total_released: number; released_bookings: any[] } | null;
  error: string | null;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('cleanup_expired_bookings');

    if (error) {
      console.error('Cleanup expired bookings error:', error);
      return { data: null, error: error.message };
    }

    const result = Array.isArray(data) ? data[0] : data;

    return {
      data: {
        total_released: result.total_released || 0,
        released_bookings: result.released_bookings || [],
      },
      error: null,
    };
  } catch (err) {
    console.error('Cleanup expired bookings exception:', err);
    return { data: null, error: 'Failed to cleanup expired bookings' };
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check if a time is in night rate period
 */
export function isNightRate(hour: number, nightStartHour: number, nightEndHour: number): boolean {
  // Handle overnight period (e.g., 17:00 to 06:00)
  if (nightStartHour > nightEndHour) {
    return hour >= nightStartHour || hour < nightEndHour;
  }

  // Handle same-day period (e.g., 00:00 to 05:00)
  return hour >= nightStartHour && hour < nightEndHour;
}

/**
 * Format time for display (24-hour to 12-hour AM/PM)
 * @param hour - Hour in 24-hour format (0-23)
 * @returns Formatted time string (e.g., "2:00 PM", "12:00 AM")
 */
export function formatTimeDisplay(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

/**
 * Format time range (e.g., "2:00 PM - 3:00 PM")
 * @param startHour - Start hour in 24-hour format
 * @param endHour - End hour in 24-hour format (optional, defaults to startHour + 1)
 * @returns Formatted time range string
 */
export function formatTimeRange(startHour: number, endHour?: number): string {
  const end = endHour !== undefined ? endHour : startHour + 1;
  return `${formatTimeDisplay(startHour)} - ${formatTimeDisplay(end)}`;
}

/**
 * Format slot hour with range (e.g., "2:00 PM - 3:00 PM")
 * @param slotHour - Hour in 24-hour format
 * @returns Formatted slot time range
 */
export function formatSlotTime(slotHour: number): string {
  return formatTimeRange(slotHour);
}

/**
 * Convert 24-hour time string to 12-hour format
 * @param time24 - Time in 24-hour format (e.g., "14:00:00" or "14:00")
 * @returns Formatted time (e.g., "2:00 PM")
 */
export function convert24To12Hour(time24: string): string {
  const [hourStr] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  return formatTimeDisplay(hour);
}

/**
 * Format date object to 12-hour time
 * @param date - Date object or ISO string
 * @returns Formatted time (e.g., "2:30 PM")
 */
export function formatDateTime12Hour(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Merge continuous slot hours into ranges
 * @param slotHours - Array of slot hours (e.g., [14, 15, 16, 19, 20])
 * @returns Array of ranges (e.g., [[14, 17], [19, 21]])
 */
export function mergeSlotRanges(slotHours: number[]): number[][] {
  if (slotHours.length === 0) return [];
  
  // Sort the hours
  const sorted = [...slotHours].sort((a, b) => a - b);
  const ranges: number[][] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0] + 1; // End is exclusive (slot 14 means 14:00-15:00)
  
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      // Continuous slot, extend the range
      rangeEnd = sorted[i] + 1;
    } else {
      // Gap found, save current range and start new one
      ranges.push([rangeStart, rangeEnd]);
      rangeStart = sorted[i];
      rangeEnd = sorted[i] + 1;
    }
  }
  
  // Add the last range
  ranges.push([rangeStart, rangeEnd]);
  
  return ranges;
}

/**
 * Format slot hours as human-readable ranges
 * @param slotHours - Array of slot hours (e.g., [14, 15, 16, 19, 20])
 * @returns Formatted string (e.g., "2:00 PM - 5:00 PM, 7:00 PM - 9:00 PM")
 */
export function formatSlotRanges(slotHours: number[]): string {
  if (slotHours.length === 0) return '';
  
  const ranges = mergeSlotRanges(slotHours);
  
  return ranges.map(([start, end]) => {
    if (end === start + 1) {
      // Single slot (e.g., just 14:00-15:00)
      return formatTimeRange(start);
    }
    // Multiple continuous slots
    return `${formatTimeDisplay(start)} - ${formatTimeDisplay(end)}`;
  }).join(', ');
}

/**
 * Format slot hours with night indicators
 * @param slotHours - Array of slot hours
 * @param nightStartHour - Night rate start hour (default 17)
 * @param nightEndHour - Night rate end hour (default 7)
 * @returns Formatted string with 🌙 for night slots
 */
export function formatSlotRangesWithNightIndicator(
  slotHours: number[],
  nightStartHour: number = 17,
  nightEndHour: number = 7
): string {
  if (slotHours.length === 0) return '';
  
  const ranges = mergeSlotRanges(slotHours);
  
  return ranges.map(([start, end]) => {
    // Check if any slot in this range is a night slot
    const hasNightSlot = slotHours.some(hour => 
      hour >= start && hour < end && isNightRate(hour, nightStartHour, nightEndHour)
    );
    
    const rangeText = end === start + 1
      ? formatTimeRange(start)
      : `${formatTimeDisplay(start)} - ${formatTimeDisplay(end)}`;
    
    return hasNightSlot ? `${rangeText} 🌙` : rangeText;
  }).join(', ');
}

/**
 * Format date for SQL (YYYY-MM-DD)
 */
export function formatDateForSQL(date: Date | string | null): string {
  if (!date) {
    throw new Error('Date is required');
  }
  
  // If already a string in YYYY-MM-DD format, return it
  if (typeof date === 'string') {
    return date;
  }
  
  // Convert to Date if not already
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Validate it's a valid date
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  return dateObj.toISOString().split('T')[0];
}

/**
 * Safely format extra charges for display
 */
export const formatExtraCharges = (charges: Array<{ category: string; amount: number }> | null | undefined) => {
  if (!charges || !Array.isArray(charges) || charges.length === 0) return '-';
  
  const total = charges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  const categories = charges.map(charge => 
    `${charge.category || 'Unknown'}: Rs ${charge.amount || 0}`
  ).join(', ');
  
  return `Rs ${total.toLocaleString()} (${categories})`;
};

/**
 * Calculate total extra charges for a booking with null safety
 */
export const calculateTotalExtraCharges = (charges: Array<{ amount: number }> | null | undefined) => {
  if (!charges || !Array.isArray(charges) || charges.length === 0) return 0;
  
  return charges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
};

/**
 * Get category label for extra charges
 */
export const getExtraChargeCategoryLabel = (category: string) => {
  switch (category) {
    case 'mineral water':
      return 'Mineral Water';
    case 'tape':
      return 'Tape';
    case 'ball':
      return 'Ball';
    case 'other':
      return 'Other';
    default:
      return category;
  }
};

/**
 * Safely format slot ranges
 */
export const safeFormatSlotRanges = (slotHours: number[] | null | undefined): string => {
  if (!slotHours || !Array.isArray(slotHours) || slotHours.length === 0) {
    return '';
  }
  
  return formatSlotRanges(slotHours);
};

/**
 * Safely get booking customer name
 */
export const getBookingCustomerName = (booking: any): string => {
  return booking?.customer?.name || '';
};

/**
 * Safely get booking customer phone
 */
export const getBookingCustomerPhone = (booking: any): string => {
  return booking?.customer?.phone || '';
};