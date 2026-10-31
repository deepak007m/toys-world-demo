-- ============================================================
-- Toys World - Complete Razorpay Payment
-- Migration: 020_complete_razorpay_payment.sql
--
-- Finalizes one server-verified Razorpay payment atomically with
-- order confirmation and stock deduction.
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_razorpay_payment(
    p_order_id UUID,
    p_payment_attempt_id UUID,
    p_provider_payment_id TEXT
)
RETURNS TABLE (
    order_id UUID,
    order_number TEXT,
    order_status TEXT,
    payment_status TEXT,
    payment_attempt_id UUID,
    payment_attempt_status TEXT,
    provider_payment_id TEXT,
    paid_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_order RECORD;
    v_attempt RECORD;
    v_item RECORD;
    v_product_id UUID;
    v_stock_quantity INTEGER;
    v_item_count INTEGER := 0;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'PAYMENT_NOT_AUTHENTICATED: Authentication is required.';
    END IF;

    IF p_order_id IS NULL THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: The order could not be found.';
    END IF;

    IF p_payment_attempt_id IS NULL THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_FOUND: The payment attempt could not be found.';
    END IF;

    IF pg_catalog.btrim(COALESCE(p_provider_payment_id, '')) = ''
       OR pg_catalog.length(pg_catalog.btrim(p_provider_payment_id)) > 128 THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_MISMATCH: The provider payment ID is not valid.';
    END IF;

    SELECT
        o.id,
        o.order_number,
        o.user_id,
        o.status,
        o.payment_status,
        o.total_amount,
        o.currency,
        o.paid_at
    INTO v_order
    FROM public.orders AS o
    WHERE o.id = p_order_id
      AND o.user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: The order could not be found.';
    END IF;

    SELECT
        pa.id,
        pa.order_id,
        pa.provider,
        pa.provider_order_id,
        pa.provider_payment_id,
        pa.amount,
        pa.currency,
        pa.status,
        pa.paid_at
    INTO v_attempt
    FROM public.payment_attempts AS pa
    WHERE pa.id = p_payment_attempt_id
      AND pa.order_id = v_order.id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_FOUND: The payment attempt could not be found.';
    END IF;

    IF v_attempt.provider <> 'razorpay' THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_MISMATCH: The payment provider does not match Razorpay.';
    END IF;

    IF v_attempt.provider_order_id IS NULL
       OR pg_catalog.btrim(v_attempt.provider_order_id) = '' THEN
        RAISE EXCEPTION 'PAYMENT_ORDER_MISMATCH: The provider order is not attached.';
    END IF;

    IF v_attempt.amount <> v_order.total_amount
       OR v_attempt.currency <> v_order.currency THEN
        RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH: The payment amount or currency does not match the order.';
    END IF;

    IF v_attempt.status = 'SUCCEEDED' THEN
        IF v_attempt.provider_payment_id <> pg_catalog.btrim(p_provider_payment_id) THEN
            RAISE EXCEPTION 'PAYMENT_ATTEMPT_MISMATCH: The provider payment ID does not match the finalized payment.';
        END IF;

        RETURN QUERY
        SELECT
            v_order.id,
            v_order.order_number,
            v_order.status,
            v_order.payment_status,
            v_attempt.id,
            v_attempt.status,
            v_attempt.provider_payment_id,
            v_attempt.paid_at;
        RETURN;
    END IF;

    IF v_order.payment_status = 'PAID'
       OR v_order.status IN ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED') THEN
        RAISE EXCEPTION 'PAYMENT_ALREADY_FINALIZED: The order has already been finalized.';
    END IF;

    IF v_order.status NOT IN ('PENDING', 'CONFIRMED')
       OR v_order.payment_status NOT IN ('PENDING', 'FAILED') THEN
        RAISE EXCEPTION 'ORDER_NOT_PAYABLE: The order is not eligible for payment finalization.';
    END IF;

    IF v_attempt.status <> 'PENDING' THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_MISMATCH: The payment attempt is not pending verification.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.payment_attempts AS other_attempt
        WHERE other_attempt.order_id = v_order.id
          AND other_attempt.status = 'SUCCEEDED'
          AND other_attempt.id <> v_attempt.id
    ) THEN
        RAISE EXCEPTION 'PAYMENT_ALREADY_FINALIZED: Another payment attempt already finalized this order.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.payment_attempts AS other_attempt
        WHERE other_attempt.provider = 'razorpay'
          AND other_attempt.provider_payment_id = pg_catalog.btrim(p_provider_payment_id)
          AND other_attempt.id <> v_attempt.id
    ) THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_MISMATCH: The provider payment ID is already attached to another attempt.';
    END IF;

    FOR v_product_id IN
        SELECT p.id
        FROM public.products AS p
        JOIN (
            SELECT DISTINCT oi.product_id
            FROM public.order_items AS oi
            WHERE oi.order_id = v_order.id
              AND oi.product_id IS NOT NULL
        ) AS ordered_products
          ON ordered_products.product_id = p.id
        ORDER BY p.id
        FOR UPDATE OF p
    LOOP
        NULL;
    END LOOP;

    FOR v_item IN
        SELECT
            oi.product_id,
            SUM(oi.quantity)::INTEGER AS ordered_quantity
        FROM public.order_items AS oi
        WHERE oi.order_id = v_order.id
        GROUP BY oi.product_id
        ORDER BY oi.product_id
    LOOP
        v_item_count := v_item_count + 1;

        IF v_item.product_id IS NULL THEN
            RAISE EXCEPTION 'STOCK_CONFLICT: An ordered product is no longer available.';
        END IF;

        SELECT p.stock_quantity
        INTO v_stock_quantity
        FROM public.products AS p
        WHERE p.id = v_item.product_id;

        IF NOT FOUND OR v_stock_quantity < v_item.ordered_quantity THEN
            RAISE EXCEPTION 'STOCK_CONFLICT: One or more ordered products no longer have enough stock.';
        END IF;

        UPDATE public.products AS p
        SET stock_quantity = p.stock_quantity - v_item.ordered_quantity
        WHERE p.id = v_item.product_id;
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'STOCK_CONFLICT: The order has no fulfillable items.';
    END IF;

    UPDATE public.payment_attempts AS pa
    SET
        provider_payment_id = pg_catalog.btrim(p_provider_payment_id),
        status = 'SUCCEEDED',
        paid_at = COALESCE(pa.paid_at, NOW()),
        failure_code = NULL,
        failure_message = NULL
    WHERE pa.id = v_attempt.id;

    UPDATE public.orders AS o
    SET
        payment_status = 'PAID',
        status = 'CONFIRMED',
        paid_at = COALESCE(o.paid_at, NOW())
    WHERE o.id = v_order.id;

    RETURN QUERY
    SELECT
        o.id,
        o.order_number,
        o.status,
        o.payment_status,
        pa.id,
        pa.status,
        pa.provider_payment_id,
        pa.paid_at
    FROM public.orders AS o
    JOIN public.payment_attempts AS pa
      ON pa.id = v_attempt.id
    WHERE o.id = v_order.id;
EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
        RAISE;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'PAYMENT_FINALIZATION_FAILED: The payment could not be finalized.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_razorpay_payment(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_razorpay_payment(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_razorpay_payment(UUID, UUID, TEXT) TO authenticated;
