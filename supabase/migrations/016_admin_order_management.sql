-- ============================================================
-- Toys World — Admin Order Management
-- Migration: 016_admin_order_management.sql
--
-- Provides a narrow, admin-only status update path. Order
-- financial and historical snapshot fields remain immutable.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
    p_order_id UUID,
    p_status TEXT DEFAULT NULL,
    p_payment_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    status TEXT,
    payment_status TEXT,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED: Authentication is required.';
    END IF;

    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'ADMIN_REQUIRED: Administrator access is required.';
    END IF;

    IF p_order_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_ORDER: An order ID is required.';
    END IF;

    IF p_status IS NULL AND p_payment_status IS NULL THEN
        RAISE EXCEPTION 'INVALID_STATUS: At least one status is required.';
    END IF;

    IF p_status IS NOT NULL
       AND p_status NOT IN (
           'PENDING',
           'CONFIRMED',
           'PROCESSING',
           'SHIPPED',
           'DELIVERED',
           'CANCELLED'
       ) THEN
        RAISE EXCEPTION 'INVALID_STATUS: The order status is not valid.';
    END IF;

    IF p_payment_status IS NOT NULL
       AND p_payment_status NOT IN (
           'PENDING',
           'PAID',
           'FAILED',
           'REFUNDED',
           'COD_PENDING'
       ) THEN
        RAISE EXCEPTION 'INVALID_PAYMENT_STATUS: The payment status is not valid.';
    END IF;

    UPDATE public.orders AS o
    SET
        status = COALESCE(p_status, o.status),
        payment_status = COALESCE(p_payment_status, o.payment_status)
    WHERE o.id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: The order could not be found.';
    END IF;

    RETURN QUERY
    SELECT o.id, o.status, o.payment_status, o.updated_at
    FROM public.orders AS o
    WHERE o.id = p_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT, TEXT)
FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT, TEXT)
FROM anon;

GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT, TEXT)
TO authenticated;
