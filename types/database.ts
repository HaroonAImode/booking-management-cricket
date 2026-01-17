/**
 * Database Type Definitions
 * 
 * Purpose: TypeScript types for Supabase database tables.
 * Generate these types automatically using Supabase CLI:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 * 
 * Manual types are provided below as placeholders.
 * Update these based on your actual database schema.
 */

export interface Database {
  public: {
    Tables: {
      // Cricket Grounds table
      grounds: {
        Row: {
          id: string;
          name: string;
          type: 'full_size' | 'practice_nets' | 'indoor';
          description: string | null;
          capacity: number;
          hourly_rate: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'full_size' | 'practice_nets' | 'indoor';
          description?: string | null;
          capacity: number;
          hourly_rate: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'full_size' | 'practice_nets' | 'indoor';
          description?: string | null;
          capacity?: number;
          hourly_rate?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Bookings table
      bookings: {
        Row: {
          id: string;
          ground_id: string;
          user_id: string;
          booking_date: string;
          start_time: string;
          end_time: string;
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
          total_amount: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ground_id: string;
          user_id: string;
          booking_date: string;
          start_time: string;
          end_time: string;
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
          total_amount: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ground_id?: string;
          user_id?: string;
          booking_date?: string;
          start_time?: string;
          end_time?: string;
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
          total_amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // User profiles table
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          role: 'user' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
