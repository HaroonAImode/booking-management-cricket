-- Drop and recreate with STRICT validation
DROP FUNCTION IF EXISTS public.verify_remaining_payment_with_extra_charges(
    TEXT, UUID, NUMERIC, NUMERIC, TEXT, TEXT, UUID
);

CREATE OR REPLACE FUNCTION public.verify_remaining_payment_with_extra_charges(
    p_admin_notes TEXT,
    p_booking_id UUID,
    p_extra_charges_total NUMERIC,
    p_payment_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_proof_path TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_extra_charges_json JSONB;
    v_booking_record RECORD;
    v_original_remaining NUMERIC;
    v_final_payable NUMERIC;
    v_booking_status TEXT;
    v_booking_number TEXT;
    v_actual_discount NUMERIC := 0;
BEGIN
    -- Get current booking details
    SELECT 
        remaining_payment,
        status,
        booking_number,
        total_amount,
        advance_payment,
        discount_amount
    INTO v_booking_record
    FROM bookings
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Booking not found'
        );
    END IF;
    
    -- Store values
    v_original_remaining := v_booking_record.remaining_payment;
    v_booking_status := v_booking_record.status;
    v_booking_number := v_booking_record.booking_number;
    
    -- Validate booking status
    IF v_booking_status != 'approved' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only approved bookings can have payment verified'
        );
    END IF;
    
    -- Validate remaining payment exists
    IF v_original_remaining <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No remaining payment due for this booking'
        );
    END IF;
    
    -- Calculate final payable (original + extra charges)
    v_final_payable := v_original_remaining + COALESCE(p_extra_charges_total, 0);
    
    -- Validate payment amount
    IF p_payment_amount <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Payment amount must be greater than zero'
        );
    END IF;
    
    -- CRITICAL FIX: Payment must be at least v_final_payable (no skipping extra charges!)
    IF p_payment_amount < v_final_payable THEN
        -- Calculate actual discount (not just unpaid extra charges)
        v_actual_discount := v_final_payable - p_payment_amount;
        
        -- If discount is exactly the extra charges amount, that's wrong!
        -- The customer should pay for extra charges
        IF v_actual_discount = COALESCE(p_extra_charges_total, 0) THEN
            RETURN json_build_object(
                'success', false,
                'error', format('Payment must include extra charges. Total payable: Rs %s (original Rs %s + extra Rs %s)', 
                              v_final_payable, v_original_remaining, COALESCE(p_extra_charges_total, 0))
            );
        END IF;
        
        -- Log actual discount (not extra charges as discount)
        RAISE NOTICE 'Actual discount applied: Rs %', v_actual_discount;
    ELSIF p_payment_amount > v_final_payable THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Payment amount (Rs %s) exceeds total payable (Rs %s)', 
                          p_payment_amount, v_final_payable)
        );
    END IF;
    
    -- Handle extra charges if any
    IF COALESCE(p_extra_charges_total, 0) > 0 THEN
        -- Create JSON array for extra charges
        v_extra_charges_json := jsonb_build_array(
            jsonb_build_object(
                'category', 'other',
                'amount', p_extra_charges_total
            )
        );
        
        -- Add extra charges (p_created_by is REQUIRED)
        IF p_created_by IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'User ID (created_by) is required when adding extra charges'
            );
        END IF;
        
        -- Call add_extra_charges_during_payment 
        PERFORM public.add_extra_charges_during_payment(
            p_booking_id,
            v_extra_charges_json,
            p_created_by
        );
    END IF;
    
    -- Call original verify_remaining_payment function
    -- Pass the ACTUAL payment amount (which should be v_final_payable or more with discount)
    SELECT public.verify_remaining_payment(
        p_booking_id,
        p_payment_method,
        p_payment_amount,
        p_payment_proof_path,
        p_admin_notes
    ) INTO v_result;
    
    -- Add extra charges info to the result (not as discount!)
    v_result := jsonb_set(
        v_result::jsonb,
        '{total_extra_charges}',
        to_jsonb(COALESCE(p_extra_charges_total, 0))
    )::json;
    
    -- Also add actual discount info if any
    IF v_actual_discount > 0 THEN
        v_result := jsonb_set(
            v_result::jsonb,
            '{actual_discount}',
            to_jsonb(v_actual_discount)
        )::json;
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in verify_remaining_payment_with_extra_charges: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_remaining_payment_with_extra_charges(
    TEXT, UUID, NUMERIC, NUMERIC, TEXT, TEXT, UUID
) TO authenticated, service_role;