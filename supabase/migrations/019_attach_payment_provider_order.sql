-- ============================================================
-- Toys World — Attach Payment Provider Order
-- Migration: 019_attach_payment_provider_order.sql
--
-- Securely attaches an external provider order identifier to an
-- existing payment attempt. The external provider call itself
-- belongs in a server-side Edge Function.
-- ============================================================

CREATE OR REPLACE FUNCTION public.attach_payment_provider_order(
    p_payment_attempt_id UUID,
    p_provider TEXT,
    p_provider_order_id TEXT
)
RETURNS TABLE (
    id UUID,
    order_id UUID,
    attempt_number INTEGER,
    provider TEXT,
    provider_order_id TEXT,
    amount NUMERIC,
    currency TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_provider TEXT;
    v_provider_order_id TEXT;
    v_attempt RECORD;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED: Authentication is required.';
    END IF;

    IF p_payment_attempt_id IS NULL THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_FOUND: The payment attempt could not be found.';
    END IF;

    IF p_provider IS NULL THEN
        RAISE EXCEPTION 'INVALID_PROVIDER: A payment provider is required.';
    END IF;

    v_provider := pg_catalog.lower(pg_catalog.btrim(p_provider));

    IF v_provider = ''
       OR pg_catalog.length(v_provider) > 64
       OR v_provider !~ '^[a-z0-9][a-z0-9._-]*$' THEN
        RAISE EXCEPTION 'INVALID_PROVIDER: The payment provider is not valid.';
    END IF;

    IF p_provider_order_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_PROVIDER_ORDER_ID: A provider order ID is required.';
    END IF;

    v_provider_order_id := pg_catalog.btrim(p_provider_order_id);

    IF v_provider_order_id = ''
       OR pg_catalog.length(v_provider_order_id) > 255 THEN
        RAISE EXCEPTION 'INVALID_PROVIDER_ORDER_ID: The provider order ID is not valid.';
    END IF;

    SELECT
        pa.id,
        pa.order_id,
        pa.attempt_number,
        pa.provider,
        pa.provider_order_id,
        pa.amount,
        pa.currency,
        pa.status
    INTO v_attempt
    FROM public.payment_attempts AS pa
    JOIN public.orders AS o
      ON o.id = pa.order_id
    WHERE pa.id = p_payment_attempt_id
      AND o.user_id = v_user_id
    FOR UPDATE OF pa;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_FOUND: The payment attempt could not be found.';
    END IF;

    IF v_attempt.provider <> v_provider THEN
        RAISE EXCEPTION 'PROVIDER_MISMATCH: The payment provider does not match the payment attempt.';
    END IF;

    IF v_attempt.provider_order_id IS NOT NULL THEN
        IF v_attempt.provider_order_id = v_provider_order_id THEN
            RETURN QUERY
            SELECT
                v_attempt.id,
                v_attempt.order_id,
                v_attempt.attempt_number,
                v_attempt.provider,
                v_attempt.provider_order_id,
                v_attempt.amount,
                v_attempt.currency,
                v_attempt.status;
            RETURN;
        END IF;

        RAISE EXCEPTION 'PROVIDER_ORDER_CONFLICT: A different provider order ID is already attached.';
    END IF;

    IF v_attempt.status NOT IN ('CREATED', 'PENDING') THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_ATTACHABLE: The payment attempt is no longer attachable.';
    END IF;

    BEGIN
        UPDATE public.payment_attempts AS pa
        SET
            provider_order_id = v_provider_order_id,
            status = 'PENDING'
        WHERE pa.id = v_attempt.id;
    EXCEPTION
        WHEN unique_violation THEN
            RAISE EXCEPTION 'PROVIDER_ORDER_CONFLICT: The provider order ID is already attached to another payment attempt.';
    END;

    RETURN QUERY
    SELECT
        pa.id,
        pa.order_id,
        pa.attempt_number,
        pa.provider,
        pa.provider_order_id,
        pa.amount,
        pa.currency,
        pa.status
    FROM public.payment_attempts AS pa
    WHERE pa.id = v_attempt.id;
EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
        RAISE;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'PAYMENT_PROVIDER_ATTACH_FAILED: The provider order could not be attached.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attach_payment_provider_order(UUID, TEXT, TEXT)
FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.attach_payment_provider_order(UUID, TEXT, TEXT)
FROM anon;

GRANT EXECUTE ON FUNCTION public.attach_payment_provider_order(UUID, TEXT, TEXT)
TO authenticated;
