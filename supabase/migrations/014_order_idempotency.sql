-- ============================================================
-- Toys World — Order Idempotency Foundation
-- Migration: 014_order_idempotency.sql
--
-- Prepares orders for secure, retry-safe order creation.
-- The future order-creation RPC must require a valid key.
-- ============================================================

-- Keep this column nullable because orders created during Phase 5A
-- may already exist without an idempotency key.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- Uniqueness is scoped to the customer so the same UUID used by
-- different users does not cause a cross-user conflict.
-- The partial index excludes legacy orders whose key is NULL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_idempotency_key
    ON public.orders (user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Future RPC-created orders must require the key; this migration
-- only prepares the schema and does not create that RPC.
