-- Toys World - defer coupon consumption until successful online payment.
-- This migration is prepared but intentionally not executed by the app.
--
-- Coupon reservations protect concurrent limits while an order is pending.
-- A reservation becomes a redemption only when the order is marked PAID.
-- The current coupon-aware order path is online-only; COD coupons remain
-- unsupported until a dedicated COD lifecycle is implemented.

CREATE TABLE IF NOT EXISTS public.coupon_reservations (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    discount_amount NUMERIC(12, 2) NOT NULL CHECK (discount_amount >= 0),
    status TEXT NOT NULL DEFAULT 'HELD'
        CHECK (status IN ('HELD', 'REDEEMED', 'RELEASED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    redeemed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS coupon_reservations_limit_idx
    ON public.coupon_reservations (coupon_id, status, expires_at);

ALTER TABLE public.coupon_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.coupon_reservations FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.finalize_coupon_redemption_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_reservation public.coupon_reservations%ROWTYPE;
    v_coupon public.coupons%ROWTYPE;
    v_reserved_count INTEGER := 0;
    v_redeemed_count INTEGER := 0;
BEGIN
    IF NEW.payment_status = 'PAID'
       AND OLD.payment_status IS DISTINCT FROM NEW.payment_status
       AND NEW.coupon_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.coupon_redemptions
           WHERE order_id = NEW.id
       ) THEN
        SELECT *
        INTO v_reservation
        FROM public.coupon_reservations
        WHERE order_id = NEW.id
          AND status = 'HELD'
        FOR UPDATE;

        IF FOUND THEN
            SELECT *
            INTO v_coupon
            FROM public.coupons
            WHERE id = v_reservation.coupon_id
            FOR UPDATE;

            UPDATE public.coupon_reservations
            SET status = 'RELEASED'
            WHERE coupon_id = v_reservation.coupon_id
              AND status = 'HELD'
              AND expires_at <= NOW()
              AND id <> v_reservation.id;

            SELECT COUNT(*)
            INTO v_reserved_count
            FROM public.coupon_reservations
            WHERE coupon_id = v_reservation.coupon_id
              AND status = 'HELD'
              AND id <> v_reservation.id
              AND expires_at > NOW();

            SELECT COUNT(*)
            INTO v_redeemed_count
            FROM public.coupon_redemptions
            WHERE coupon_id = v_reservation.coupon_id;

            IF v_coupon.usage_limit IS NOT NULL
               AND v_reserved_count + v_redeemed_count >= v_coupon.usage_limit THEN
                RAISE EXCEPTION 'COUPON_INVALID: The coupon reservation is no longer available.';
            END IF;

            INSERT INTO public.coupon_redemptions (
                coupon_id,
                user_id,
                order_id,
                discount_amount
            )
            VALUES (
                v_reservation.coupon_id,
                v_reservation.user_id,
                NEW.id,
                v_reservation.discount_amount
            );

            UPDATE public.coupons
            SET usage_count = usage_count + 1,
                updated_at = NOW()
            WHERE id = v_reservation.coupon_id;

            UPDATE public.coupon_reservations
            SET status = 'REDEEMED',
                redeemed_at = NOW()
            WHERE id = v_reservation.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_finalize_coupon_redemption ON public.orders;
CREATE TRIGGER orders_finalize_coupon_redemption
    AFTER UPDATE OF payment_status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.finalize_coupon_redemption_on_paid();

REVOKE ALL ON FUNCTION public.finalize_coupon_redemption_on_paid() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_order_from_cart_with_coupon(
    p_idempotency_key UUID,
    p_coupon_code TEXT,
    p_contact_name TEXT,
    p_contact_phone TEXT,
    p_shipping_full_name TEXT,
    p_shipping_phone TEXT,
    p_shipping_address_line1 TEXT,
    p_shipping_address_line2 TEXT,
    p_shipping_city TEXT,
    p_shipping_state TEXT,
    p_shipping_postal_code TEXT
)
RETURNS TABLE (
    order_id UUID,
    order_number TEXT,
    status TEXT,
    payment_status TEXT,
    total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order RECORD;
    v_coupon public.coupons%ROWTYPE;
    v_discount NUMERIC(12, 2) := 0;
    v_eligible_subtotal NUMERIC(12, 2) := 0;
    v_customer_usage INTEGER := 0;
    v_active_reservations INTEGER := 0;
    v_redeemed_usage INTEGER := 0;
    v_existing_coupon_id UUID;
BEGIN
    SELECT * INTO v_order FROM public.create_order_from_cart(
        p_idempotency_key,
        p_contact_name,
        p_contact_phone,
        p_shipping_full_name,
        p_shipping_phone,
        p_shipping_address_line1,
        p_shipping_address_line2,
        p_shipping_city,
        p_shipping_state,
        p_shipping_postal_code
    );

    IF pg_catalog.btrim(COALESCE(p_coupon_code, '')) = '' THEN
        RETURN QUERY SELECT
            v_order.order_id,
            v_order.order_number,
            v_order.status,
            v_order.payment_status,
            v_order.total_amount;
        RETURN;
    END IF;

    SELECT coupon_id
    INTO v_existing_coupon_id
    FROM public.orders
    WHERE id = v_order.order_id;

    IF v_existing_coupon_id IS NOT NULL THEN
        RETURN QUERY SELECT
            v_order.order_id,
            v_order.order_number,
            v_order.status,
            v_order.payment_status,
            v_order.total_amount;
        RETURN;
    END IF;

    SELECT *
    INTO v_coupon
    FROM public.coupons
    WHERE code = upper(pg_catalog.btrim(p_coupon_code))
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'COUPON_INVALID: Coupon code is not valid.';
    END IF;

    UPDATE public.coupon_reservations
    SET status = 'RELEASED'
    WHERE coupon_id = v_coupon.id
      AND status = 'HELD'
      AND expires_at <= NOW();

    IF NOT v_coupon.is_active
       OR (v_coupon.starts_at IS NOT NULL AND NOW() < v_coupon.starts_at)
       OR (v_coupon.expires_at IS NOT NULL AND NOW() >= v_coupon.expires_at) THEN
        RAISE EXCEPTION 'COUPON_INVALID: This coupon is not currently active.';
    END IF;

    SELECT COUNT(*)
    INTO v_active_reservations
    FROM public.coupon_reservations
    WHERE coupon_id = v_coupon.id
      AND status = 'HELD'
      AND expires_at > NOW();

    SELECT COUNT(*)
    INTO v_redeemed_usage
    FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id;

    IF v_coupon.usage_limit IS NOT NULL
       AND v_active_reservations + v_redeemed_usage >= v_coupon.usage_limit THEN
        RAISE EXCEPTION 'COUPON_INVALID: This coupon has reached its usage limit.';
    END IF;

    SELECT COUNT(*)
    INTO v_customer_usage
    FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id
      AND user_id = auth.uid();

    v_customer_usage := v_customer_usage + (
        SELECT COUNT(*)
        FROM public.coupon_reservations
        WHERE coupon_id = v_coupon.id
          AND user_id = auth.uid()
          AND status = 'HELD'
          AND expires_at > NOW()
    );

    IF v_customer_usage >= v_coupon.per_customer_limit THEN
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

    v_discount := CASE
        WHEN v_coupon.discount_type = 'PERCENTAGE'
            THEN (v_eligible_subtotal * v_coupon.discount_value / 100)::NUMERIC(12,2)
        ELSE LEAST(v_coupon.discount_value, v_eligible_subtotal)
    END;

    IF v_coupon.maximum_discount IS NOT NULL THEN
        v_discount := LEAST(v_discount, v_coupon.maximum_discount);
    END IF;
    v_discount := LEAST(v_discount, v_eligible_subtotal);

    UPDATE public.orders
    SET coupon_id = v_coupon.id,
        coupon_code = v_coupon.code,
        discount_amount = v_discount,
        total_amount = (total_amount - v_discount)::NUMERIC(12,2)
    WHERE id = v_order.order_id;

    INSERT INTO public.coupon_reservations (
        coupon_id,
        user_id,
        order_id,
        discount_amount,
        expires_at
    )
    VALUES (
        v_coupon.id,
        auth.uid(),
        v_order.order_id,
        v_discount,
        NOW() + INTERVAL '30 minutes'
    );

    v_order.total_amount := (v_order.total_amount - v_discount)::NUMERIC(12,2);

    RETURN QUERY SELECT
        v_order.order_id,
        v_order.order_number,
        v_order.status,
        v_order.payment_status,
        v_order.total_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_from_cart_with_coupon(
    UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart_with_coupon(
    UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
