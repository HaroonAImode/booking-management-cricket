-- Update verify_remaining_payment_with_extra_charges to support split payments
-- This adds cash_amount, online_amount, and online_method parameters

DROP FUNCTION IF EXISTS public.verify_remaining_payment_with_extra_charges(
    TEXT, UUID, JSONB, NUMERIC, TEXT, TEXT, UUID, NUMERIC
);

-- Updated function with split payment support
CREATE OR REPLACE FUNCTION public.verify_remaining_payment_with_extra_charges(
    p_admin_notes TEXT,
    p_booking_id UUID,
    p_extra_charges JSONB,
    p_payment_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_proof_path TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_discount_amount NUMERIC DEFAULT 0,
    p_cash_amount NUMERIC DEFAULT 0,
    p_online_amount NUMERIC DEFAULT 0,
    p_online_method TEXT DEFAULT NULL
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

    -- Store original remaining payment
    v_original_remaining := v_booking_record.remaining_payment;

    -- Calculate total extra charges from JSONB array
    IF v_extra_charges_json IS NOT NULL AND jsonb_array_length(v_extra_charges_json) > 0 THEN
        FOR v_charge IN SELECT * FROM jsonb_array_elements(v_extra_charges_json)
        LOOP
            v_total_extra_charges := v_total_extra_charges + (v_charge->>'amount')::NUMERIC;
        END LOOP;
    END IF;

    -- Apply discount (cannot exceed total charges)
    v_actual_discount := LEAST(p_discount_amount, v_total_extra_charges);

    -- Calculate final payable amount
    v_final_payable := v_original_remaining + v_total_extra_charges - v_actual_discount;

    -- Validate payment amount matches final payable
    IF ABS(p_payment_amount - v_final_payable) > 0.01 THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Payment amount mismatch. Expected: %s, Received: %s', v_final_payable, p_payment_amount)
        );
    END IF;

    -- Validate split payment amounts (if provided) add up to total
    IF p_cash_amount > 0 OR p_online_amount > 0 THEN
        IF ABS((p_cash_amount + p_online_amount) - p_payment_amount) > 0.01 THEN
            RETURN json_build_object(
                'success', false,
                'error', format('Split payment amounts do not match total. Cash: %s, Online: %s, Total: %s', 
                    p_cash_amount, p_online_amount, p_payment_amount)
            );
        END IF;
    END IF;

    -- Update booking with complete payment information
    UPDATE bookings
    SET 
        status = 'completed',
        remaining_payment = 0,
        remaining_payment_method = p_payment_method,
        remaining_payment_proof = p_payment_proof_path,
        remaining_payment_completed_at = NOW(),
        remaining_payment_completed_by = p_created_by,
        extra_charges = v_extra_charges_json,
        discount_amount = COALESCE(discount_amount, 0) + v_actual_discount,
        total_amount = total_amount + v_total_extra_charges - v_actual_discount,
        admin_notes = p_admin_notes,
        updated_at = NOW(),
        -- Split payment columns (new)
        remaining_cash_amount = p_cash_amount,
        remaining_online_amount = p_online_amount,
        remaining_online_method = p_online_method
    WHERE id = p_booking_id;

    -- Return success with details
    RETURN json_build_object(
        'success', true,
        'booking_number', v_booking_record.booking_number,
        'original_remaining', v_original_remaining,
        'total_extra_charges', v_total_extra_charges,
        'actual_discount', v_actual_discount,
        'final_payment', p_payment_amount,
        'new_total_amount', v_booking_record.total_amount + v_total_extra_charges - v_actual_discount,
        'cash_amount', p_cash_amount,
        'online_amount', p_online_amount,
        'online_method', p_online_method
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in verify_remaining_payment_with_extra_charges: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_remaining_payment_with_extra_charges(
    TEXT, UUID, JSONB, NUMERIC, TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT
) TO authenticated;

-- Verification query to test the function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'verify_remaining_payment_with_extra_charges';
