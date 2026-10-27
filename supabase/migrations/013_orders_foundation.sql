-- ============================================================
-- Toys World — Orders Database Foundation
-- Migration: 013_orders_foundation.sql
--
-- Creates the immutable order and order-item data foundation.
-- Order creation, payment processing, and stock deduction belong
-- to later phases.
-- ============================================================

-- ── Order number generation ──────────────────────────────────
-- UUID remains the primary key. The UUID-derived suffix keeps the
-- human-readable reference database-generated without a predictable
-- sequential identifier. The trigger always owns this value.
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.order_number :=
        'TW-' ||
        to_char(CURRENT_DATE, 'YYYYMMDD') ||
        '-' ||
        upper(substr(replace(extensions.uuid_generate_v4()::TEXT, '-', ''), 1, 12));

    RETURN NEW;
END;
$$;


-- ── Orders ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id                       UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    order_number             TEXT NOT NULL UNIQUE,
    user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

    status                   TEXT NOT NULL DEFAULT 'PENDING'
                                 CHECK (status IN (
                                     'PENDING',
                                     'CONFIRMED',
                                     'PROCESSING',
                                     'SHIPPED',
                                     'DELIVERED',
                                     'CANCELLED'
                                 )),
    payment_status           TEXT NOT NULL DEFAULT 'PENDING'
                                 CHECK (payment_status IN (
                                     'PENDING',
                                     'PAID',
                                     'FAILED',
                                     'REFUNDED',
                                     'COD_PENDING'
                                 )),

    currency                 TEXT NOT NULL DEFAULT 'INR'
                                 CHECK (btrim(currency) <> ''),

    subtotal                 NUMERIC(12, 2) NOT NULL DEFAULT 0
                                 CHECK (subtotal >= 0),
    shipping_amount          NUMERIC(12, 2) NOT NULL DEFAULT 0
                                 CHECK (shipping_amount >= 0),
    discount_amount          NUMERIC(12, 2) NOT NULL DEFAULT 0
                                 CHECK (discount_amount >= 0),
    tax_amount               NUMERIC(12, 2) NOT NULL DEFAULT 0
                                 CHECK (tax_amount >= 0),
    total_amount             NUMERIC(12, 2) NOT NULL DEFAULT 0
                                 CHECK (total_amount >= 0),

    contact_name             TEXT,
    contact_phone            TEXT,
    contact_email            TEXT,

    shipping_full_name       TEXT NOT NULL,
    shipping_phone           TEXT NOT NULL,
    shipping_address_line1   TEXT NOT NULL,
    shipping_address_line2   TEXT,
    shipping_city            TEXT NOT NULL,
    shipping_state           TEXT NOT NULL,
    shipping_postal_code     TEXT NOT NULL,
    shipping_country         TEXT NOT NULL DEFAULT 'India',

    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at                  TIMESTAMPTZ,
    cancelled_at             TIMESTAMPTZ
);

CREATE TRIGGER orders_generate_order_number
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_order_number();

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();


-- ── Order items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
    id                 UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    order_id           UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id         UUID REFERENCES public.products(id) ON DELETE SET NULL,

    product_name       TEXT NOT NULL,
    product_image_url  TEXT,
    unit_price         NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    quantity           INTEGER NOT NULL CHECK (quantity > 0),
    line_total         NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),

    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_id
    ON public.orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
    ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
    ON public.orders(created_at);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
    ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
    ON public.order_items(product_id);


-- ── Grants ────────────────────────────────────────────────────
-- Inserts and mutations are intentionally withheld until the
-- controlled order-creation flow is implemented in a later phase.
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;


-- ── Row-level security: orders ────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders"
    ON public.orders
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
    ON public.orders
    FOR SELECT
    TO authenticated
    USING ((SELECT public.is_admin()));


-- ── Row-level security: order items ───────────────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own order items" ON public.order_items;
CREATE POLICY "Customers can view own order items"
    ON public.order_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.orders
            WHERE public.orders.id = order_items.order_id
              AND public.orders.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
    ON public.order_items
    FOR SELECT
    TO authenticated
    USING ((SELECT public.is_admin()));
