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
// SLOTS
// ========================================

/**
 * Get available slots for a specific date using database function
 */
export async function getAvailableSlots(
  date: string
): Promise<{ data: SlotInfo[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('get_available_slots', {
      p_date: date,
    });

    if (error) {
      console.error('Get available slots error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as SlotInfo[], error: null };
  } catch (err) {
    console.error('Get available slots exception:', err);
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

    const { data, error } = await supabase
      .from('booking_slots')
      .select('slot_hour, status')
      .eq('slot_date', date)
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
 * Format date for SQL (YYYY-MM-DD)
 */
export function formatDateForSQL(date: Date): string {
  return date.toISOString().split('T')[0];
}
