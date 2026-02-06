-- ========================================
-- FIX: Payment Validation with Discount
-- ========================================
-- ISSUE: Getting error "Expected: 3500.00, Received: 3400"
-- ROOT CAUSE: Old function version comparing against remaining_payment instead of (remaining + extra - discount)
--
-- Example:
-- - Remaining Payment: Rs 3500
-- - Extra Charges: Rs 100
-- - Total Payable: Rs 3600
-- - Discount: Rs 200
-- - Expected Payment: Rs 3400 ✅
-- - BUT OLD FUNCTION CHECKS: paymentAmount == 3500 ❌
-- ========================================

-- First drop ALL versions of the function
DROP FUNCTION IF EXISTS public.verify_remaining_payment_with_extra_charges(
    TEXT, UUID, JSONB, NUMERIC, TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT
);

DROP FUNCTION IF EXISTS public.verify_remaining_payment_with_extra_charges(
    TEXT, UUID, JSONB, NUMERIC, TEXT, TEXT, UUID, NUMERIC
);

-- Create the CORRECT function with split payment support
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
    
    -- Process extra charges JSONB
    IF p_extra_charges IS NOT NULL THEN
        v_json_type := jsonb_typeof(p_extra_charges);
        
        -- If it's a string, try to parse it
        IF v_json_type = 'string' THEN
            BEGIN
                p_extra_charges := p_extra_charges::jsonb;
                v_json_type := jsonb_typeof(p_extra_charges);
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN json_build_object(
                        'success', false,
                        'error', format('Invalid JSON in extra_charges: %s', p_extra_charges)
                    );
            END;
        END IF;
        
        RAISE NOTICE 'JSON type: %, Value: %', v_json_type, p_extra_charges;
        
        IF v_json_type = 'array' AND jsonb_array_length(p_extra_charges) > 0 THEN
            -- Calculate total extra charges
            SELECT COALESCE(SUM((item->>'amount')::NUMERIC), 0)
            INTO v_total_extra_charges
            FROM jsonb_array_elements(p_extra_charges) AS item
            WHERE item->>'amount' IS NOT NULL;
        ELSIF v_json_type != 'null' AND v_json_type != 'array' THEN
            RETURN json_build_object(
                'success', false,
                'error', format('Invalid extra_charges format. Expected array, got: %s', v_json_type)
            );
        END IF;
    END IF;
    
    -- ✅ CRITICAL FIX: Calculate final payable = remaining + extra charges
    v_final_payable := v_original_remaining + v_total_extra_charges;
    
    RAISE NOTICE '📊 Payment Calculation: Remaining: %, Extra: %, Total Payable: %, Discount: %, Payment: %', 
        v_original_remaining, v_total_extra_charges, v_final_payable, p_discount_amount, p_payment_amount;
    
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
    
    -- Validate discount doesn't exceed total payable
    IF p_discount_amount > v_final_payable THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Discount (Rs %s) cannot exceed total payable (Rs %s)', 
                          p_discount_amount, v_final_payable)
        );
    END IF;
    
    -- ✅ CRITICAL FIX: Calculate expected payment with discount    v_actual_discount := p_discount_amount;
    v_expected_payment := v_final_payable - p_discount_amount;
    
    RAISE NOTICE '✅ Expected Payment: % (Payable: % - Discount: %)', 
        v_expected_payment, v_final_payable, p_discount_amount;
    
    -- ✅ CRITICAL FIX: Validate payment matches expected (with 1 rupee tolerance for rounding)
    IF ABS(p_payment_amount - v_expected_payment) > 1 THEN
        RETURN json_build_object(
            'success', false,
            'error', format(E'Payment amount mismatch!\n\nBreakdown:\n- Remaining Payment: Rs %s\n- Extra Charges: Rs %s\n- Total Payable: Rs %s\n- Discount Applied: Rs %s\n- Expected Payment: Rs %s\n- Received Payment: Rs %s\n\nDifference: Rs %s', 
                          ROUND(v_original_remaining, 2),
                          ROUND(v_total_extra_charges, 2),
                          ROUND(v_final_payable, 2),
                          ROUND(p_discount_amount, 2),
                          ROUND(v_expected_payment, 2),
                          ROUND(p_payment_amount, 2),
                          ROUND(p_payment_amount - v_expected_payment, 2))
        );
    END IF;
    
    -- Handle extra charges if any
    IF v_total_extra_charges > 0 AND p_created_by IS NOT NULL THEN
        PERFORM public.add_extra_charges_during_payment(
            p_booking_id,
            p_extra_charges,
            p_created_by
        );
    ELSIF v_total_extra_charges > 0 AND p_created_by IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Created_by (admin ID) is required when adding extra charges'
        );
    END IF;
    
    -- Calculate new totals
    v_new_total := v_booking_record.total_amount + v_total_extra_charges;
    
    -- Update booking with payment details
    UPDATE bookings SET
        status = 'completed',
        remaining_payment = 0, -- Payment complete
        remaining_payment_amount = p_payment_amount, -- Actual amount paid (after discount)
        total_amount = v_new_total,
        discount_amount = COALESCE(v_booking_record.discount_amount, 0) + p_discount_amount,
        remaining_payment_method = p_payment_method,
        remaining_payment_proof = p_payment_proof_path,
        remaining_payment_date = NOW(),
        admin_notes = p_admin_notes, -- FIXED: Changed from completion_admin_notes to admin_notes
        completed_at = NOW(),
        completed_by = p_created_by,
        -- Split payment fields
        remaining_cash_amount = p_cash_amount,
        remaining_online_amount = p_online_amount,
        remaining_online_method = p_online_method,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    -- Build success response
    v_result := json_build_object(
        'success', true,
        'booking_number', v_booking_number,
        'original_remaining', v_original_remaining,
        'total_extra_charges', v_total_extra_charges,
        'actual_discount', v_actual_discount,
        'final_payment', p_payment_amount,
        'new_total_amount', v_new_total,
        'customer_id', v_customer_id,
        'cash_amount', p_cash_amount,
        'online_amount', p_online_amount,
        'online_method', p_online_method
    );
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in verify_remaining_payment_with_extra_charges: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', format('Database error: %s', SQLERRM)
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.verify_remaining_payment_with_extra_charges(
    TEXT, UUID, JSONB, NUMERIC, TEXT, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT
) TO authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';

-- ========================================
-- TEST THE FIX
-- ========================================
-- Run this to verify the fix works:
/*
SELECT * FROM public.verify_remaining_payment_with_extra_charges(
    'Test payment',                       -- p_admin_notes
    'YOUR_BOOKING_ID'::UUID,              -- p_booking_id (replace with actual ID)
    '[{"category":"ball","amount":100}]'::JSONB, -- p_extra_charges
    3400.00,                              -- p_payment_amount (final amount after discount)
    'cash',                               -- p_payment_method
    NULL,                                 -- p_payment_proof_path
    'YOUR_ADMIN_ID'::UUID,                -- p_created_by (replace with actual admin ID)
    200.00,                               -- p_discount_amount
    3000.00,                              -- p_cash_amount
    400.00,                               -- p_online_amount
    'sadapay'                             -- p_online_method
);
*/

-- ========================================
-- SUCCESS INDICATORS
-- ========================================
-- ✅ Function accepts discount parameter
-- ✅ Validates payment = (remaining + extra - discount)
-- ✅ User can complete payment with discount applied
-- ✅ No more "Expected: 3500, Received: 3400" error
