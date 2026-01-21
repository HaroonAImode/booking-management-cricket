'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserRole {
  role: string;
  name: string;
  email: string;
  is_active: boolean;
}

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role, name, email, is_active')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } else {
        setRole(data);
      }
    } catch (error) {
      console.error('Error:', error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => role?.role === 'admin' && role?.is_active;
  const isGroundManager = () => role?.role === 'ground_manager' && role?.is_active;
  const canEditBookings = () => isAdmin();
  const canDeleteBookings = () => isAdmin();
  const canAddPayment = () => (isAdmin() || isGroundManager());
  const canManageUsers = () => isAdmin();

  return {
    role,
    loading,
    isAdmin: isAdmin(),
    isGroundManager: isGroundManager(),
    canEditBookings: canEditBookings(),
    canDeleteBookings: canDeleteBookings(),
    canAddPayment: canAddPayment(),
    canManageUsers: canManageUsers(),
    refresh: fetchUserRole,
  };
}
