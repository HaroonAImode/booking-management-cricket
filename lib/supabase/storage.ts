/**
 * Supabase Storage Utilities for Payment Proofs
 * 
 * Handles file uploads, signed URLs, and storage management
 */

import { createClient } from './client';

const BUCKET_NAME = 'payment-proofs';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

/**
 * Upload payment proof image
 * @param file - File object from input
 * @param bookingId - UUID of the booking
 * @param bookingDate - Date of the booking
 * @returns Uploaded file path or error
 */
export async function uploadPaymentProof(
  file: File,
  bookingId: string,
  bookingDate: string
): Promise<{ data: string | null; error: string | null }> {
  try {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        data: null,
        error: 'Invalid file type. Only PNG and JPEG images are allowed.',
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        data: null,
        error: 'File size exceeds 5MB limit.',
      };
    }

    const supabase = createClient();
    
    // Generate file path: payment-proofs/YYYY-MM-DD/booking-id-timestamp.ext
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filePath = `${bookingDate}/${bookingId}-${timestamp}.${fileExt}`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return {
        data: null,
        error: error.message || 'Failed to upload payment proof',
      };
    }

    // Return the full path
    return {
      data: `${BUCKET_NAME}/${data.path}`,
      error: null,
    };
  } catch (err) {
    console.error('Upload payment proof error:', err);
    return {
      data: null,
      error: 'An unexpected error occurred during upload',
    };
  }
}

/**
 * Generate signed URL for admin to view payment proof
 * (Requires admin authentication)
 * @param filePath - Full path to file (e.g., "payment-proofs/2026-01-17/uuid-123.jpg")
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Signed URL or error
 */
export async function getPaymentProofSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<{ data: string | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Remove bucket name if included in path
    const cleanPath = filePath.replace(`${BUCKET_NAME}/`, '');

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(cleanPath, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return {
        data: null,
        error: error.message || 'Failed to generate signed URL',
      };
    }

    return {
      data: data.signedUrl,
      error: null,
    };
  } catch (err) {
    console.error('Get signed URL error:', err);
    return {
      data: null,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Get public URL for file (note: bucket is private, so this won't work without signed URL)
 * This is kept for reference but won't be functional with current setup
 * @param filePath - Path to file
 * @returns Public URL
 */
export function getPaymentProofPublicUrl(filePath: string): string {
  const supabase = createClient();
  const cleanPath = filePath.replace(`${BUCKET_NAME}/`, '');
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(cleanPath);

  return data.publicUrl;
}

/**
 * Delete payment proof (admin only)
 * @param filePath - Full path to file
 * @returns Success or error
 */
export async function deletePaymentProof(
  filePath: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();
    const cleanPath = filePath.replace(`${BUCKET_NAME}/`, '');

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([cleanPath]);

    if (error) {
      console.error('Storage delete error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete payment proof',
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (err) {
    console.error('Delete payment proof error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred during deletion',
    };
  }
}

/**
 * List all payment proofs in a specific folder (admin only)
 * @param folderPath - Folder path (e.g., "2026-01-17")
 * @returns List of files or error
 */
export async function listPaymentProofs(
  folderPath?: string
): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Storage list error:', error);
      return {
        data: null,
        error: error.message || 'Failed to list payment proofs',
      };
    }

    return {
      data,
      error: null,
    };
  } catch (err) {
    console.error('List payment proofs error:', err);
    return {
      data: null,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Validate file before upload (client-side check)
 * @param file - File to validate
 * @returns Validation result
 */
export function validatePaymentProofFile(file: File): {
  valid: boolean;
  error: string | null;
} {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only PNG and JPEG images are allowed.',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size exceeds 5MB limit.',
    };
  }

  // Check if file is actually an image (additional check)
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'File must be an image.',
    };
  }

  return {
    valid: true,
    error: null,
  };
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
