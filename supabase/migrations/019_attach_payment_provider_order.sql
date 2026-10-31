-- ============================================================
-- Toys World — Attach Payment Provider Order
-- Migration: 019_attach_payment_provider_order.sql
--
-- Securely manages the provider-order boundary for an existing
-- payment attempt. The external provider call itself belongs in
-- a server-side Edge Function.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prepare_payment_provider_order(
    p_payment_attempt_id UUID,
    p_provider TEXT
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

    IF v_attempt.status = 'PENDING' THEN
        RAISE EXCEPTION 'PAYMENT_PROVIDER_ORDER_PENDING: Provider order creation is already in progress or requires reconciliation.';
    END IF;

    IF v_attempt.status <> 'CREATED' THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_ATTACHABLE: The payment attempt is no longer ready for provider-order creation.';
    END IF;

    UPDATE public.payment_attempts AS pa
    SET status = 'PENDING'
    WHERE pa.id = v_attempt.id;

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
        RAISE EXCEPTION 'PAYMENT_PROVIDER_PREPARE_FAILED: The payment attempt could not be prepared.';
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_payment_provider_order(
    p_payment_attempt_id UUID,
    p_provider TEXT,
    p_failure_code TEXT,
    p_failure_message TEXT
)
RETURNS TABLE (
    id UUID,
    order_id UUID,
    attempt_number INTEGER,
    provider TEXT,
    provider_order_id TEXT,
    amount NUMERIC,
    currency TEXT,
    status TEXT,
    failure_code TEXT,
    failure_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_provider TEXT;
    v_attempt RECORD;
    v_failure_code TEXT;
    v_failure_message TEXT;
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

    v_failure_code := pg_catalog.btrim(COALESCE(p_failure_code, ''));
    v_failure_message := pg_catalog.btrim(COALESCE(p_failure_message, ''));

    IF v_failure_code = '' OR pg_catalog.length(v_failure_code) > 100 THEN
        RAISE EXCEPTION 'INVALID_FAILURE_CODE: The payment failure code is not valid.';
    END IF;

    IF v_failure_message = '' OR pg_catalog.length(v_failure_message) > 500 THEN
        RAISE EXCEPTION 'INVALID_FAILURE_MESSAGE: The payment failure message is not valid.';
    END IF;

    SELECT
        pa.id,
        pa.order_id,
        pa.attempt_number,
        pa.provider,
        pa.provider_order_id,
        pa.amount,
        pa.currency,
        pa.status,
        pa.failure_code,
        pa.failure_message
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
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_ATTACHABLE: A provider order is already attached.';
    END IF;

    IF v_attempt.status <> 'PENDING' THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_ATTACHABLE: The payment attempt is not pending provider-order creation.';
    END IF;

    UPDATE public.payment_attempts AS pa
    SET
        status = 'FAILED',
        failure_code = v_failure_code,
        failure_message = v_failure_message,
        failed_at = NOW()
    WHERE pa.id = v_attempt.id;

    RETURN QUERY
    SELECT
        pa.id,
        pa.order_id,
        pa.attempt_number,
        pa.provider,
        pa.provider_order_id,
        pa.amount,
        pa.currency,
        pa.status,
        pa.failure_code,
        pa.failure_message
    FROM public.payment_attempts AS pa
    WHERE pa.id = v_attempt.id;
EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
        RAISE;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'PAYMENT_PROVIDER_FAIL_FAILED: The payment attempt could not be marked failed.';
END;
$$;

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

    IF v_attempt.status <> 'PENDING' THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_ATTACHABLE: The payment attempt is not pending provider-order attachment.';
    END IF;

    BEGIN
        UPDATE public.payment_attempts AS pa
        SET provider_order_id = v_provider_order_id
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

REVOKE EXECUTE ON FUNCTION public.prepare_payment_provider_order(UUID, TEXT)
FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prepare_payment_provider_order(UUID, TEXT)
FROM anon;
GRANT EXECUTE ON FUNCTION public.prepare_payment_provider_order(UUID, TEXT)
TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fail_payment_provider_order(UUID, TEXT, TEXT, TEXT)
FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fail_payment_provider_order(UUID, TEXT, TEXT, TEXT)
FROM anon;
GRANT EXECUTE ON FUNCTION public.fail_payment_provider_order(UUID, TEXT, TEXT, TEXT)
TO authenticated;

REVOKE EXECUTE ON FUNCTION public.attach_payment_provider_order(UUID, TEXT, TEXT)
FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.attach_payment_provider_order(UUID, TEXT, TEXT)
FROM anon;
GRANT EXECUTE ON FUNCTION public.attach_payment_provider_order(UUID, TEXT, TEXT)
TO authenticated;
