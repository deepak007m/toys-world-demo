-- ============================================================
-- Toys World — Payment Foundation
-- Migration: 017_payment_foundation.sql
--
-- Stores provider-independent payment attempts and webhook
-- receipt state. Provider integration, payment transitions,
-- refunds, and stock behavior belong to later phases.
-- ============================================================

-- ── Payment attempts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id                   UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    order_id             UUID NOT NULL
                           REFERENCES public.orders(id) ON DELETE RESTRICT,
    attempt_number       INTEGER NOT NULL CHECK (attempt_number > 0),
    provider             TEXT NOT NULL CHECK (pg_catalog.btrim(provider) <> ''),
    provider_order_id    TEXT,
    provider_payment_id  TEXT,
    amount               NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency             TEXT NOT NULL CHECK (pg_catalog.btrim(currency) <> ''),
    status               TEXT NOT NULL
                           CHECK (status IN (
                               'CREATED',
                               'PENDING',
                               'SUCCEEDED',
                               'FAILED',
                               'CANCELLED',
                               'EXPIRED'
                           )),
    failure_code         TEXT,
    failure_message      TEXT,
    idempotency_key      UUID NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at              TIMESTAMPTZ,
    failed_at            TIMESTAMPTZ,
    cancelled_at         TIMESTAMPTZ,
    expired_at           TIMESTAMPTZ,

    CONSTRAINT payment_attempts_order_attempt_unique
        UNIQUE (order_id, attempt_number),
    CONSTRAINT payment_attempts_order_idempotency_unique
        UNIQUE (order_id, idempotency_key)
);

CREATE TRIGGER payment_attempts_updated_at
    BEFORE UPDATE ON public.payment_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_id
    ON public.payment_attempts(order_id);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_status
    ON public.payment_attempts(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempts_provider_order_unique
    ON public.payment_attempts(provider, provider_order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempts_provider_payment_unique
    ON public.payment_attempts(provider, provider_payment_id);

-- ── Webhook events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id                 UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    provider           TEXT NOT NULL CHECK (pg_catalog.btrim(provider) <> ''),
    provider_event_id  TEXT NOT NULL CHECK (pg_catalog.btrim(provider_event_id) <> ''),
    event_type         TEXT NOT NULL CHECK (pg_catalog.btrim(event_type) <> ''),
    received_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at       TIMESTAMPTZ,
    processing_status  TEXT NOT NULL
                         CHECK (processing_status IN (
                             'RECEIVED',
                             'PROCESSED',
                             'FAILED'
                         )),
    error_code         TEXT,
    error_message      TEXT,
    attempt_id         UUID
                         REFERENCES public.payment_attempts(id) ON DELETE RESTRICT,
    received_metadata  JSONB,

    CONSTRAINT payment_webhook_events_provider_event_unique
        UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_attempt_id
    ON public.payment_webhook_events(attempt_id);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_processing_status
    ON public.payment_webhook_events(processing_status);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_received_at
    ON public.payment_webhook_events(received_at);

-- ── Grants ────────────────────────────────────────────────────
GRANT SELECT ON public.payment_attempts TO authenticated;
GRANT SELECT ON public.payment_webhook_events TO authenticated;

-- ── Row-level security: payment attempts ─────────────────────
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own payment attempts"
    ON public.payment_attempts;
CREATE POLICY "Customers can view own payment attempts"
    ON public.payment_attempts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.orders
            WHERE public.orders.id = payment_attempts.order_id
              AND public.orders.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can view all payment attempts"
    ON public.payment_attempts;
CREATE POLICY "Admins can view all payment attempts"
    ON public.payment_attempts
    FOR SELECT
    TO authenticated
    USING ((SELECT public.is_admin()));

-- ── Row-level security: webhook events ───────────────────────
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view payment webhook events"
    ON public.payment_webhook_events;
CREATE POLICY "Admins can view payment webhook events"
    ON public.payment_webhook_events
    FOR SELECT
    TO authenticated
    USING ((SELECT public.is_admin()));
