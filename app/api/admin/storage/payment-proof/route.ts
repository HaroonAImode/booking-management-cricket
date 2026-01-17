/**
 * Storage API for Payment Proofs
 * GET /api/admin/storage/payment-proof - Get signed URL for payment proof
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/supabase/api-auth';
import { createClient } from '@/lib/supabase/server';

export const GET = withAdminAuth(async (request, { adminProfile }) => {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { success: false, error: 'Image path is required' },
        { status: 400 }
      );
    }

    // Get server-side Supabase client
    const supabase = await createClient();
    
    // Remove 'payment-proofs/' prefix if it exists
    const cleanPath = path.replace('payment-proofs/', '');

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(cleanPath, 3600);

    if (error || !data) {
      console.error('Signed URL error:', error);
      return NextResponse.json(
        { success: false, error: error?.message || 'Failed to generate signed URL' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      url: data.signedUrl,
    });
  } catch (error) {
    console.error('Storage API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
