-- ============================================================
-- Toys World — Payment Attempt Creation
-- Migration: 018_create_payment_attempt.sql
--
-- Creates the authenticated, ownership-checked path for creating
-- one provider-independent payment attempt. Provider integration,
-- verification, webhooks, refunds, and stock behavior belong to
-- later phases.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_payment_attempt(
    p_order_id UUID,
    p_idempotency_key UUID,
    p_provider TEXT
)
RETURNS TABLE (
    id UUID,
    order_id UUID,
    attempt_number INTEGER,
    provider TEXT,
    provider_order_id TEXT,
    provider_payment_id TEXT,
    amount NUMERIC,
    currency TEXT,
    status TEXT,
    failure_code TEXT,
    failure_message TEXT,
    idempotency_key UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_provider TEXT;
    v_order RECORD;
    v_existing_attempt RECORD;
    v_active_attempt RECORD;
    v_succeeded_attempt BOOLEAN;
    v_next_attempt_number INTEGER;
    v_created_attempt RECORD;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED: Authentication is required.';
    END IF;

    IF p_order_id IS NULL THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: The order could not be found.';
    END IF;

    IF p_idempotency_key IS NULL THEN
        RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY: A valid payment idempotency key is required.';
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

    -- Lock the owned order before reading attempts or calculating the
    -- next attempt number. This also prevents concurrent active attempts.
    SELECT
        o.id,
        o.status,
        o.payment_status,
        o.total_amount,
        o.currency
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
        pa.attempt_number,
        pa.provider,
        pa.provider_order_id,
        pa.provider_payment_id,
        pa.amount,
        pa.currency,
        pa.status,
        pa.failure_code,
        pa.failure_message,
        pa.idempotency_key,
        pa.created_at,
        pa.updated_at,
        pa.paid_at,
        pa.failed_at,
        pa.cancelled_at,
        pa.expired_at
    INTO v_existing_attempt
    FROM public.payment_attempts AS pa
    WHERE pa.order_id = v_order.id
      AND pa.idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_attempt.provider <> v_provider THEN
            RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: The payment idempotency key belongs to another provider.';
        END IF;

        RETURN QUERY
        SELECT
            v_existing_attempt.id,
            v_existing_attempt.order_id,
            v_existing_attempt.attempt_number,
            v_existing_attempt.provider,
            v_existing_attempt.provider_order_id,
            v_existing_attempt.provider_payment_id,
            v_existing_attempt.amount,
            v_existing_attempt.currency,
            v_existing_attempt.status,
            v_existing_attempt.failure_code,
            v_existing_attempt.failure_message,
            v_existing_attempt.idempotency_key,
            v_existing_attempt.created_at,
            v_existing_attempt.updated_at,
            v_existing_attempt.paid_at,
            v_existing_attempt.failed_at,
            v_existing_attempt.cancelled_at,
            v_existing_attempt.expired_at;
        RETURN;
    END IF;

    IF v_order.payment_status = 'PAID' THEN
        RAISE EXCEPTION 'PAYMENT_ALREADY_SUCCEEDED: This order has already been paid.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.payment_attempts AS pa
        WHERE pa.order_id = v_order.id
          AND pa.status = 'SUCCEEDED'
    )
    INTO v_succeeded_attempt;

    IF v_succeeded_attempt THEN
        RAISE EXCEPTION 'PAYMENT_ALREADY_SUCCEEDED: This order has already been paid.';
    END IF;

    SELECT
        pa.id,
        pa.order_id,
        pa.attempt_number,
        pa.provider,
        pa.provider_order_id,
        pa.provider_payment_id,
        pa.amount,
        pa.currency,
        pa.status,
        pa.failure_code,
        pa.failure_message,
        pa.idempotency_key,
        pa.created_at,
        pa.updated_at,
        pa.paid_at,
        pa.failed_at,
        pa.cancelled_at,
        pa.expired_at
    INTO v_active_attempt
    FROM public.payment_attempts AS pa
    WHERE pa.order_id = v_order.id
      AND pa.status IN ('CREATED', 'PENDING')
    ORDER BY pa.attempt_number DESC
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_CONFLICT: An active payment attempt already exists for this order.';
    END IF;

    IF v_order.status NOT IN ('PENDING', 'CONFIRMED')
       OR v_order.payment_status NOT IN ('PENDING', 'FAILED') THEN
        RAISE EXCEPTION 'ORDER_NOT_PAYABLE: This order is not eligible for payment.';
    END IF;

    IF v_order.total_amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_ORDER_AMOUNT: The order amount must be greater than zero.';
    END IF;

    IF pg_catalog.btrim(COALESCE(v_order.currency, '')) = '' THEN
        RAISE EXCEPTION 'ORDER_NOT_PAYABLE: The order currency is unavailable.';
    END IF;

    SELECT COALESCE(MAX(pa.attempt_number), 0) + 1
    INTO v_next_attempt_number
    FROM public.payment_attempts AS pa
    WHERE pa.order_id = v_order.id;

    BEGIN
        INSERT INTO public.payment_attempts (
            order_id,
            attempt_number,
            provider,
            amount,
            currency,
            status,
            idempotency_key
        )
        VALUES (
            v_order.id,
            v_next_attempt_number,
            v_provider,
            v_order.total_amount,
            v_order.currency,
            'CREATED',
            p_idempotency_key
        )
        RETURNING
            public.payment_attempts.id,
            public.payment_attempts.order_id,
            public.payment_attempts.attempt_number,
            public.payment_attempts.provider,
            public.payment_attempts.provider_order_id,
            public.payment_attempts.provider_payment_id,
            public.payment_attempts.amount,
            public.payment_attempts.currency,
            public.payment_attempts.status,
            public.payment_attempts.failure_code,
            public.payment_attempts.failure_message,
            public.payment_attempts.idempotency_key,
            public.payment_attempts.created_at,
            public.payment_attempts.updated_at,
            public.payment_attempts.paid_at,
            public.payment_attempts.failed_at,
            public.payment_attempts.cancelled_at,
            public.payment_attempts.expired_at
        INTO v_created_attempt;
    EXCEPTION
        WHEN unique_violation THEN
            SELECT
                pa.id,
                pa.order_id,
                pa.attempt_number,
                pa.provider,
                pa.provider_order_id,
                pa.provider_payment_id,
                pa.amount,
                pa.currency,
                pa.status,
                pa.failure_code,
                pa.failure_message,
                pa.idempotency_key,
                pa.created_at,
                pa.updated_at,
                pa.paid_at,
                pa.failed_at,
                pa.cancelled_at,
                pa.expired_at
            INTO v_existing_attempt
            FROM public.payment_attempts AS pa
            WHERE pa.order_id = v_order.id
              AND pa.idempotency_key = p_idempotency_key;

            IF FOUND THEN
                IF v_existing_attempt.provider <> v_provider THEN
                    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: The payment idempotency key belongs to another provider.';
                END IF;

                RETURN QUERY
                SELECT
                    v_existing_attempt.id,
                    v_existing_attempt.order_id,
                    v_existing_attempt.attempt_number,
                    v_existing_attempt.provider,
                    v_existing_attempt.provider_order_id,
                    v_existing_attempt.provider_payment_id,
                    v_existing_attempt.amount,
                    v_existing_attempt.currency,
                    v_existing_attempt.status,
                    v_existing_attempt.failure_code,
                    v_existing_attempt.failure_message,
                    v_existing_attempt.idempotency_key,
                    v_existing_attempt.created_at,
                    v_existing_attempt.updated_at,
                    v_existing_attempt.paid_at,
                    v_existing_attempt.failed_at,
                    v_existing_attempt.cancelled_at,
                    v_existing_attempt.expired_at;
                RETURN;
            END IF;

            RAISE EXCEPTION 'PAYMENT_ATTEMPT_CONFLICT: The payment attempt could not be created concurrently.';
    END;

    RETURN QUERY
    SELECT
        v_created_attempt.id,
        v_created_attempt.order_id,
        v_created_attempt.attempt_number,
        v_created_attempt.provider,
        v_created_attempt.provider_order_id,
        v_created_attempt.provider_payment_id,
        v_created_attempt.amount,
        v_created_attempt.currency,
        v_created_attempt.status,
        v_created_attempt.failure_code,
        v_created_attempt.failure_message,
        v_created_attempt.idempotency_key,
        v_created_attempt.created_at,
        v_created_attempt.updated_at,
        v_created_attempt.paid_at,
        v_created_attempt.failed_at,
        v_created_attempt.cancelled_at,
        v_created_attempt.expired_at;
EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
        RAISE;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'PAYMENT_ATTEMPT_FAILED: The payment attempt could not be created.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_payment_attempt(UUID, UUID, TEXT)
FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.create_payment_attempt(UUID, UUID, TEXT)
FROM anon;

GRANT EXECUTE ON FUNCTION public.create_payment_attempt(UUID, UUID, TEXT)
TO authenticated;
