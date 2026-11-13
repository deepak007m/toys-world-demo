-- ============================================================
-- Toys World — Coupons
-- Migration: 023_coupons.sql
--
-- Coupon rules and all customer-facing estimates are evaluated
-- server-side. The client never supplies prices or a discount.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
    minimum_subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (minimum_subtotal >= 0),
    maximum_discount NUMERIC(12, 2) CHECK (maximum_discount IS NULL OR maximum_discount > 0),
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
    usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
    per_customer_limit INTEGER NOT NULL DEFAULT 1 CHECK (per_customer_limit > 0),
    eligible_product_ids UUID[] NOT NULL DEFAULT '{}',
    eligible_category_ids UUID[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT coupons_code_upper CHECK (code = upper(code)),
    CONSTRAINT coupons_date_order CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at),
    CONSTRAINT coupons_percentage_limit CHECK (discount_type <> 'PERCENTAGE' OR discount_value <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_key ON public.coupons (upper(code));
CREATE INDEX IF NOT EXISTS coupons_active_dates ON public.coupons (is_active, starts_at, expires_at);

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS coupon_code TEXT;

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    discount_amount NUMERIC(12, 2) NOT NULL CHECK (discount_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons
    FOR ALL TO authenticated USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins view coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins view coupon redemptions" ON public.coupon_redemptions
    FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT SELECT ON public.coupon_redemptions TO authenticated;

CREATE OR REPLACE FUNCTION public.estimate_coupon_for_cart(p_coupon_code TEXT)
RETURNS TABLE (
    valid BOOLEAN,
    coupon_code TEXT,
    subtotal NUMERIC,
    discount_amount NUMERIC,
    total_amount NUMERIC,
    message TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_coupon public.coupons%ROWTYPE;
    v_subtotal NUMERIC(12, 2) := 0;
    v_discount NUMERIC(12, 2) := 0;
    v_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED: Authentication is required.'; END IF;
    SELECT * INTO v_coupon FROM public.coupons
    WHERE code = upper(pg_catalog.btrim(COALESCE(p_coupon_code, '')))
    LIMIT 1;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, upper(pg_catalog.btrim(COALESCE(p_coupon_code, ''))), 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 'Coupon code is not valid.'; RETURN;
    END IF;
    SELECT COALESCE(SUM((p.price * ci.quantity)::NUMERIC(12,2)), 0)::NUMERIC(12,2)
    INTO v_subtotal
    FROM public.cart_items ci JOIN public.products p ON p.id = ci.product_id
    WHERE ci.user_id = v_user_id AND p.price IS NOT NULL AND p.price >= 0
      AND (
        (cardinality(v_coupon.eligible_product_ids) = 0 AND cardinality(v_coupon.eligible_category_ids) = 0)
        OR p.id = ANY(v_coupon.eligible_product_ids)
        OR p.category_id = ANY(v_coupon.eligible_category_ids)
      );

    IF NOT v_coupon.is_active OR (v_coupon.starts_at IS NOT NULL AND now() < v_coupon.starts_at)
       OR (v_coupon.expires_at IS NOT NULL AND now() >= v_coupon.expires_at) THEN
        RETURN QUERY SELECT FALSE, v_coupon.code, v_subtotal, 0::NUMERIC, v_subtotal, 'This coupon is not currently active.'; RETURN;
    END IF;
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
        RETURN QUERY SELECT FALSE, v_coupon.code, v_subtotal, 0::NUMERIC, v_subtotal, 'This coupon has reached its usage limit.'; RETURN;
    END IF;
    SELECT count(*) INTO v_count FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id AND user_id = v_user_id;
    IF v_count >= v_coupon.per_customer_limit THEN
        RETURN QUERY SELECT FALSE, v_coupon.code, v_subtotal, 0::NUMERIC, v_subtotal, 'You have already used this coupon.'; RETURN;
    END IF;
    IF v_subtotal < v_coupon.minimum_subtotal THEN
        RETURN QUERY SELECT FALSE, v_coupon.code, v_subtotal, 0::NUMERIC, v_subtotal,
            format('Add %s more to use this coupon.', (v_coupon.minimum_subtotal - v_subtotal)); RETURN;
    END IF;
    v_discount := CASE WHEN v_coupon.discount_type = 'PERCENTAGE'
        THEN (v_subtotal * v_coupon.discount_value / 100)::NUMERIC(12,2)
        ELSE LEAST(v_coupon.discount_value, v_subtotal) END;
    IF v_coupon.maximum_discount IS NOT NULL THEN v_discount := LEAST(v_discount, v_coupon.maximum_discount); END IF;
    v_discount := LEAST(v_discount, v_subtotal);
    RETURN QUERY SELECT TRUE, v_coupon.code, v_subtotal, v_discount, (v_subtotal - v_discount)::NUMERIC(12,2), 'Coupon applied.';
END;
$$;

REVOKE ALL ON FUNCTION public.estimate_coupon_for_cart(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estimate_coupon_for_cart(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_order_from_cart_with_coupon(
    p_idempotency_key UUID, p_coupon_code TEXT, p_contact_name TEXT, p_contact_phone TEXT,
    p_shipping_full_name TEXT, p_shipping_phone TEXT, p_shipping_address_line1 TEXT,
    p_shipping_address_line2 TEXT, p_shipping_city TEXT, p_shipping_state TEXT, p_shipping_postal_code TEXT
)
RETURNS TABLE (order_id UUID, order_number TEXT, status TEXT, payment_status TEXT, total_amount NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_order RECORD;
    v_coupon public.coupons%ROWTYPE;
    v_discount NUMERIC(12,2) := 0;
    v_eligible_subtotal NUMERIC(12,2) := 0;
    v_customer_redemptions INTEGER := 0;
    v_existing_coupon_id UUID;
BEGIN
    SELECT * INTO v_order FROM public.create_order_from_cart(
        p_idempotency_key, p_contact_name, p_contact_phone, p_shipping_full_name,
        p_shipping_phone, p_shipping_address_line1, p_shipping_address_line2,
        p_shipping_city, p_shipping_state, p_shipping_postal_code
    );
    IF pg_catalog.btrim(COALESCE(p_coupon_code, '')) <> '' THEN
        SELECT coupon_id INTO v_existing_coupon_id FROM public.orders WHERE id = v_order.order_id;
        IF v_existing_coupon_id IS NOT NULL THEN
            RETURN QUERY SELECT v_order.order_id, v_order.order_number, v_order.status, v_order.payment_status, v_order.total_amount;
            RETURN;
        END IF;
        SELECT * INTO v_coupon FROM public.coupons
        WHERE code = upper(pg_catalog.btrim(p_coupon_code)) FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'COUPON_INVALID: Coupon code is not valid.'; END IF;
        IF NOT v_coupon.is_active OR (v_coupon.starts_at IS NOT NULL AND now() < v_coupon.starts_at)
           OR (v_coupon.expires_at IS NOT NULL AND now() >= v_coupon.expires_at)
           OR (v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit) THEN
            RAISE EXCEPTION 'COUPON_INVALID: This coupon is not currently active.';
        END IF;
        SELECT count(*) INTO v_customer_redemptions
        FROM public.coupon_redemptions
        WHERE coupon_id = v_coupon.id AND user_id = auth.uid();
        IF v_customer_redemptions >= v_coupon.per_customer_limit THEN
            RAISE EXCEPTION 'COUPON_ALREADY_USED: You have already used this coupon.';
        END IF;
        SELECT COALESCE(SUM((oi.unit_price * oi.quantity)::NUMERIC(12,2)), 0)::NUMERIC(12,2)
        INTO v_eligible_subtotal
        FROM public.order_items oi
        JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = v_order.order_id
          AND (
            (cardinality(v_coupon.eligible_product_ids) = 0 AND cardinality(v_coupon.eligible_category_ids) = 0)
            OR p.id = ANY(v_coupon.eligible_product_ids)
            OR p.category_id = ANY(v_coupon.eligible_category_ids)
          );
        IF v_eligible_subtotal < v_coupon.minimum_subtotal THEN
            RAISE EXCEPTION 'COUPON_MINIMUM: The order does not meet the coupon minimum.';
        END IF;
        v_discount := CASE WHEN v_coupon.discount_type = 'PERCENTAGE'
            THEN (v_eligible_subtotal * v_coupon.discount_value / 100)::NUMERIC(12,2)
            ELSE LEAST(v_coupon.discount_value, v_eligible_subtotal) END;
        IF v_coupon.maximum_discount IS NOT NULL THEN v_discount := LEAST(v_discount, v_coupon.maximum_discount); END IF;
        v_discount := LEAST(v_discount, v_eligible_subtotal);
        UPDATE public.orders SET coupon_id = v_coupon.id, coupon_code = v_coupon.code,
            discount_amount = v_discount, total_amount = (total_amount - v_discount)::NUMERIC(12,2)
        WHERE id = v_order.order_id;
        INSERT INTO public.coupon_redemptions(coupon_id, user_id, order_id, discount_amount)
        VALUES (v_coupon.id, auth.uid(), v_order.order_id, v_discount);
        UPDATE public.coupons SET usage_count = usage_count + 1 WHERE id = v_coupon.id;
        v_order.total_amount := (v_order.total_amount - v_discount)::NUMERIC(12,2);
    END IF;
    RETURN QUERY SELECT v_order.order_id, v_order.order_number, v_order.status, v_order.payment_status, v_order.total_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_from_cart_with_coupon(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart_with_coupon(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
