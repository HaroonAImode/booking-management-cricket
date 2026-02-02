-- First, let's check if we need to drop the function first
DROP FUNCTION IF EXISTS public.verify_remaining_payment_with_extra_charges(
    TEXT, UUID, NUMERIC, NUMERIC, TEXT, TEXT, UUID
);

-- Now create the updated function with ALL parameters
CREATE OR REPLACE FUNCTION public.verify_remaining_payment_with_extra_charges(
    p_admin_notes TEXT,
    p_booking_id UUID,
    p_extra_charges JSONB,
    p_payment_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_proof_path TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_discount_amount NUMERIC DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_extra_charges_json JSONB := p_extra_charges;
    v_booking_record RECORD;
    v_original_remaining NUMERIC;
    v_final_payable NUMERIC;
    v_booking_status TEXT;
    v_booking_number TEXT;
    v_total_extra_charges NUMERIC := 0;
    v_actual_discount NUMERIC := 0;
    v_charge JSONB;
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
    
    -- Calculate total extra charges from JSON array
    IF v_extra_charges_json IS NOT NULL AND jsonb_array_length(v_extra_charges_json) > 0 THEN
        FOR i IN 0..jsonb_array_length(v_extra_charges_json)-1 LOOP
            v_charge := jsonb_array_element(v_extra_charges_json, i);
            v_total_extra_charges := v_total_extra_charges + COALESCE((v_charge->>'amount')::NUMERIC, 0);
        END LOOP;
    END IF;
    
    -- Calculate final payable (original + extra charges)
    v_final_payable := v_original_remaining + v_total_extra_charges;
    
    -- Validate payment amount
    IF p_payment_amount <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Payment amount must be greater than zero'
        );
    END IF;
    
    -- CRITICAL: Payment must be at least original remaining amount
    IF p_payment_amount < v_original_remaining THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Payment must be at least Rs %s (original remaining amount)', v_original_remaining)
        );
    END IF;
    
    -- Validate discount
    IF p_discount_amount < 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Discount amount cannot be negative'
        );
    END IF;
    
    -- Validate discount doesn't exceed extra charges
    IF p_discount_amount > v_total_extra_charges THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Discount (Rs %s) cannot exceed extra charges amount (Rs %s)', 
                          p_discount_amount, v_total_extra_charges)
        );
    END IF;
    
    -- Validate payment amount with discount
    v_actual_discount := p_discount_amount;
    
    -- Calculate expected payment with discount
    DECLARE
        v_expected_payment NUMERIC := v_final_payable - p_discount_amount;
    BEGIN
        -- Allow small rounding differences (1 rupee)
        IF ABS(p_payment_amount - v_expected_payment) > 1 THEN
            RETURN json_build_object(
                'success', false,
                'error', format('Payment amount mismatch. Expected: Rs %s, Provided: Rs %s', 
                              v_expected_payment, p_payment_amount)
            );
        END IF;
    END;
    
    -- Handle extra charges if any
    IF v_total_extra_charges > 0 THEN
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
    -- Pass the ACTUAL payment amount
    SELECT public.verify_remaining_payment(
        p_booking_id,
        p_payment_method,
        p_payment_amount,
        p_payment_proof_path,
        p_admin_notes
    ) INTO v_result;
    
    -- Update booking with discount amount
    IF v_actual_discount > 0 THEN
        UPDATE bookings 
        SET discount_amount = v_actual_discount,
            updated_at = NOW()
        WHERE id = p_booking_id;
    END IF;
    
    -- Add extra charges info to the result
    v_result := jsonb_set(
        v_result::jsonb,
        '{total_extra_charges}',
        to_jsonb(v_total_extra_charges)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.verify_remaining_payment_with_extra_charges(
    TEXT, UUID, JSONB, NUMERIC, TEXT, TEXT, UUID, NUMERIC
) TO authenticated, service_role;