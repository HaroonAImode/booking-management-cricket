runned last time  :
-- First, drop the function if it exists
DROP FUNCTION IF EXISTS public.verify_remaining_payment_with_extra_charges(
    TEXT, UUID, JSONB, NUMERIC, TEXT, TEXT, UUID, NUMERIC
);

-- Create the updated function WITHOUT payment_history table reference
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
    v_booking_record RECORD;
    v_original_remaining NUMERIC;
    v_final_payable NUMERIC;
    v_booking_status TEXT;
    v_booking_number TEXT;
    v_total_extra_charges NUMERIC := 0;
    v_actual_discount NUMERIC := 0;
    v_expected_payment NUMERIC;
    v_json_type TEXT;
    v_new_total NUMERIC;
    v_customer_id UUID;
BEGIN
    -- Get current booking details
    SELECT 
        remaining_payment,
        status,
        booking_number,
        total_amount,
        advance_payment,
        discount_amount,
        customer_id
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
    v_original_remaining := COALESCE(v_booking_record.remaining_payment, 0);
    v_booking_status := v_booking_record.status;
    v_booking_number := v_booking_record.booking_number;
    v_customer_id := v_booking_record.customer_id;
    
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
    
    -- FIXED: Better JSONB handling - accept string JSON and convert
    IF p_extra_charges IS NOT NULL THEN
        v_json_type := jsonb_typeof(p_extra_charges);
        
        -- If it's a string that looks like JSON, try to parse it
        IF v_json_type = 'string' THEN
            BEGIN
                -- Try to parse the string as JSON
                p_extra_charges := p_extra_charges::jsonb;
                v_json_type := jsonb_typeof(p_extra_charges);
            EXCEPTION
                WHEN OTHERS THEN
                    -- If parsing fails, it's invalid JSON
                    RETURN json_build_object(
                        'success', false,
                        'error', format('Invalid JSON in extra_charges: %s', p_extra_charges)
                    );
            END;
        END IF;
        
        RAISE NOTICE 'JSON type after processing: %, Value: %', v_json_type, p_extra_charges;
        
        IF v_json_type = 'array' AND jsonb_array_length(p_extra_charges) > 0 THEN
            -- Extract amount from each charge safely
            SELECT COALESCE(SUM((item->>'amount')::NUMERIC), 0)
            INTO v_total_extra_charges
            FROM jsonb_array_elements(p_extra_charges) AS item
            WHERE item->>'amount' IS NOT NULL;
        ELSIF v_json_type != 'null' AND v_json_type != 'array' THEN
            -- Invalid JSON type
            RETURN json_build_object(
                'success', false,
                'error', format('Invalid extra_charges format. Expected array, got: %s', v_json_type)
            );
        END IF;
    END IF;
    
    -- Log for debugging
    RAISE NOTICE 'Complete Payment Debug: Original remaining: %, Extra charges: %, Total extra: %, JSON type: %', 
        v_original_remaining, p_extra_charges, v_total_extra_charges, v_json_type;
    
    -- Calculate final payable (original + extra charges)
    v_final_payable := v_original_remaining + v_total_extra_charges;
    
    RAISE NOTICE 'Complete Payment Debug: Final payable: %, Discount param: %, Payment provided: %', 
        v_final_payable, p_discount_amount, p_payment_amount;
    
    -- Validate payment amount
    IF p_payment_amount <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Payment amount must be greater than zero'
        );
    END IF;
    
    -- Validate discount
    IF p_discount_amount < 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Discount amount cannot be negative'
        );
    END IF;
    
    -- Allow discount on TOTAL payable, not just extra charges
    IF p_discount_amount > v_final_payable THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Discount (Rs %s) cannot exceed total payable amount (Rs %s)', 
                          p_discount_amount, v_final_payable)
        );
    END IF;
    
    -- Calculate expected payment with discount
    v_actual_discount := p_discount_amount;
    v_expected_payment := v_final_payable - p_discount_amount;
    
    RAISE NOTICE 'Complete Payment Debug: Expected payment: %, Actual payment: %', 
        v_expected_payment, p_payment_amount;
    
    -- Allow small rounding differences (1 rupee)
    IF ABS(p_payment_amount - v_expected_payment) > 1 THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Payment amount mismatch. Total Payable: Rs %s (Remaining: Rs %s + Extra: Rs %s), Discount: Rs %s, Expected Payment: Rs %s, Provided: Rs %s', 
                          ROUND(v_final_payable, 2),
                          ROUND(v_original_remaining, 2),
                          ROUND(v_total_extra_charges, 2),
                          ROUND(p_discount_amount, 2),
                          ROUND(v_expected_payment, 2),
                          ROUND(p_payment_amount, 2))
        );
    END IF;
    
    -- Handle extra charges if any
    IF v_total_extra_charges > 0 AND p_created_by IS NOT NULL THEN
        -- Call add_extra_charges_during_payment
        PERFORM public.add_extra_charges_during_payment(
            p_booking_id,
            p_extra_charges,
            p_created_by
        );
    ELSIF v_total_extra_charges > 0 AND p_created_by IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User ID (created_by) is required when adding extra charges'
        );
    END IF;
    
    -- Calculate new total including extra charges and discount
    v_new_total := v_booking_record.total_amount + v_total_extra_charges - v_actual_discount;
    
    RAISE NOTICE 'Complete Payment Debug: Old total: %, New total: % (Extra: %, Discount: %)', 
        v_booking_record.total_amount, v_new_total, v_total_extra_charges, v_actual_discount;
    
    -- Update the booking with ALL calculations
    UPDATE bookings 
    SET 
        remaining_payment_amount = COALESCE(remaining_payment_amount, 0) + p_payment_amount,
        remaining_payment = 0, -- Mark as fully paid
        remaining_payment_method = p_payment_method,
        remaining_payment_proof = COALESCE(p_payment_proof_path, remaining_payment_proof),
        status = 'completed',
        discount_amount = v_actual_discount, -- Set the actual discount
        total_amount = v_new_total, -- Update total with extra charges and discount
        updated_at = NOW()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking_record;
    
    -- Create notification when payment is completed
    INSERT INTO notifications (
        customer_id,
        notification_type,
        title,
        message,
        booking_id,
        priority
    )
    VALUES (
        v_customer_id,
        'payment_completed',
        'Payment Completed',
        format('Full payment verified for booking %s. Amount: Rs %s, Extra charges: Rs %s, Discount: Rs %s', 
               v_booking_number, p_payment_amount, v_total_extra_charges, v_actual_discount),
        p_booking_id,
        'normal'
    );
    
    -- Return success result
    v_result := json_build_object(
        'success', true,
        'booking_number', v_booking_number,
        'total_extra_charges', v_total_extra_charges,
        'actual_discount', v_actual_discount,
        'payment_amount', p_payment_amount,
        'new_total_amount', v_new_total,
        'message', 'Payment verified and booking completed successfully'
    );
    
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