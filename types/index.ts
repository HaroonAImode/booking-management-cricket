/**
 * Application-wide Type Definitions
 * 
 * Purpose: Common TypeScript types used throughout the application.
 * Includes types for components, forms, API responses, etc.
 */

import { Database } from './database';

// Helper type to extract table types
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

// ========================================
// BOOKING SYSTEM TYPES (New Schema v2)
// ========================================

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  alternate_phone?: string;
  address?: string;
  notes?: string;
  total_bookings: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface BookingRecord {
  id: string;
  booking_number: string;
  customer_id: string;
  booking_date: string;
  total_hours: number;
  total_amount: number;
  advance_payment: number;
  advance_payment_method?: string;
  advance_payment_proof?: string;
  advance_payment_date?: string;
  remaining_payment: number;
  remaining_payment_method?: string;
  remaining_payment_proof?: string;
  remaining_payment_date?: string;
  is_fully_paid: boolean;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  cancelled_reason?: string;
  cancelled_at?: string;
  customer_notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingSlot {
  id: string;
  booking_id: string;
  slot_date: string;
  slot_time: string;
  slot_hour: number;
  is_night_rate: boolean;
  hourly_rate: number;
  status: 'available' | 'pending' | 'booked' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  payment_type: 'advance' | 'remaining' | 'refund';
  amount: number;
  payment_method: string;
  payment_proof?: string;
  payment_date: string;
  received_by?: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  notification_type: 'new_booking' | 'payment_received' | 'booking_cancelled' | 'slot_conflict' | 'system';
  title: string;
  message: string;
  booking_id?: string;
  customer_id?: string;
  is_read: boolean;
  read_at?: string;
  read_by?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

export interface SystemSettings {
  id: string;
  setting_key: string;
  setting_value: string;
  description?: string;
  updated_at: string;
}

// ========================================
// SLOT INFORMATION (from RPC function)
// ========================================

export interface SlotInfo {
  slot_hour: number;
  slot_time: string;
  is_available: boolean;
  current_status: 'available' | 'pending' | 'booked' | 'cancelled';
  hourly_rate: number;
}

// ========================================
// FORM DATA TYPES
// ========================================

export interface CustomerFormData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  alternate_phone?: string;
  notes?: string;
}

export interface BookingFormData {
  // Customer info
  customer: CustomerFormData;
  
  // Booking details
  booking_date: Date | null;
  selected_slots: number[];
  
  // Payment info
  advance_payment_method: string;
  payment_proof_file: File | null;
  customer_notes?: string;
}

export interface BookingSummary {
  customer: CustomerFormData;
  booking_date: string;
  selected_slots: number[];
  total_hours: number;
  total_amount: number;
  advance_payment: number;
  remaining_payment: number;
  advance_payment_method: string;
  payment_proof_url: string;
  customer_notes?: string;
  day_slots: number[];
  night_slots: number[];
}

// ========================================
// OLD SCHEMA TYPES (Keep for backward compatibility)
// ========================================

// Commonly used table types
export type Ground = Tables<'grounds'>;
export type Booking = Tables<'bookings'>;
export type Profile = Tables<'profiles'>;

// Booking with related data
export interface BookingWithDetails extends Booking {
  ground?: Ground;
  profile?: Profile;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

// User session type
export interface UserSession {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

