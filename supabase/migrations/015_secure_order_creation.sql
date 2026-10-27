-- ============================================================
-- Toys World — Secure Order Creation
-- Migration: 015_secure_order_creation.sql
--
-- Creates the controlled order-creation path for authenticated
-- customers. Prices, snapshots, totals, ownership, and order
-- numbers are database-derived. Stock is validated only.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    p_idempotency_key UUID,
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
    v_user_id UUID;
    v_contact_email TEXT;
    v_cart_count INTEGER := 0;
    v_deleted_count INTEGER := 0;
    v_subtotal NUMERIC(12, 2) := 0;
    v_order_id UUID;
    v_order_number TEXT;
    v_status TEXT;
    v_payment_status TEXT;
    v_total_amount NUMERIC(12, 2);
    v_product_snapshot JSONB := '[]'::JSONB;
    v_line_total NUMERIC(12, 2);
    v_cart_item RECORD;
    v_existing_order RECORD;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED: Authentication is required.';
    END IF;

    IF p_idempotency_key IS NULL THEN
        RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY: A valid idempotency key is required.';
    END IF;

    SELECT o.id, o.order_number, o.status, o.payment_status, o.total_amount
    INTO v_existing_order
    FROM public.orders AS o
    WHERE o.user_id = v_user_id
      AND o.idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN QUERY
        SELECT
            v_existing_order.id,
            v_existing_order.order_number,
            v_existing_order.status,
            v_existing_order.payment_status,
            v_existing_order.total_amount;
        RETURN;
    END IF;

    IF pg_catalog.btrim(COALESCE(p_contact_name, '')) = ''
       OR pg_catalog.btrim(COALESCE(p_contact_phone, '')) = '' THEN
        RAISE EXCEPTION 'INVALID_CONTACT: Contact name and phone are required.';
    END IF;

    IF pg_catalog.length(
           pg_catalog.regexp_replace(p_contact_phone, '[^0-9]', '', 'g')
       ) < 7 THEN
        RAISE EXCEPTION 'INVALID_CONTACT: Contact phone is invalid.';
    END IF;

    IF pg_catalog.btrim(COALESCE(p_shipping_full_name, '')) = ''
       OR pg_catalog.btrim(COALESCE(p_shipping_phone, '')) = ''
       OR pg_catalog.btrim(COALESCE(p_shipping_address_line1, '')) = ''
       OR pg_catalog.btrim(COALESCE(p_shipping_city, '')) = ''
       OR pg_catalog.btrim(COALESCE(p_shipping_state, '')) = ''
       OR pg_catalog.btrim(COALESCE(p_shipping_postal_code, '')) = '' THEN
        RAISE EXCEPTION 'INVALID_ADDRESS: Required shipping fields are missing.';
    END IF;

    IF pg_catalog.length(
           pg_catalog.regexp_replace(p_shipping_phone, '[^0-9]', '', 'g')
       ) < 7 THEN
        RAISE EXCEPTION 'INVALID_ADDRESS: Shipping phone is invalid.';
    END IF;

    SELECT u.email
    INTO v_contact_email
    FROM auth.users AS u
    WHERE u.id = v_user_id;

    IF pg_catalog.btrim(COALESCE(v_contact_email, '')) = '' THEN
        RAISE EXCEPTION 'INVALID_CONTACT: Authenticated email is unavailable.';
    END IF;

    -- Lock this customer's cart rows for the complete transaction.
    -- This prevents cart edits while its contents are being converted.
    FOR v_cart_item IN
        SELECT ci.id, ci.product_id, ci.quantity
        FROM public.cart_items AS ci
        WHERE ci.user_id = v_user_id
        FOR UPDATE
    LOOP
        v_cart_count := v_cart_count + 1;
    END LOOP;

    IF v_cart_count = 0 THEN
        RAISE EXCEPTION 'EMPTY_CART: Your cart is empty.';
    END IF;

    FOR v_cart_item IN
        SELECT
            ci.product_id,
            ci.quantity,
            p.id AS current_product_id,
            p.name,
            p.image_url,
            p.price,
            p.stock_quantity,
            p.availability
        FROM public.cart_items AS ci
        LEFT JOIN public.products AS p
            ON p.id = ci.product_id
        WHERE ci.user_id = v_user_id
    LOOP
        IF v_cart_item.current_product_id IS NULL THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: A cart product no longer exists.';
        END IF;

        IF v_cart_item.price IS NULL
           OR v_cart_item.price < 0 THEN
            RAISE EXCEPTION 'PRICE_UNAVAILABLE: Product price is not available for checkout.';
        END IF;

        IF v_cart_item.availability::TEXT = 'CONFIRM_ON_WA' THEN
            RAISE EXCEPTION 'PRODUCT_NOT_PURCHASABLE: This product requires store confirmation.';
        END IF;

        IF v_cart_item.stock_quantity <= 0
           OR v_cart_item.availability::TEXT = 'OUT_OF_STOCK' THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: A cart product is currently out of stock.';
        END IF;

        IF v_cart_item.quantity > v_cart_item.stock_quantity THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: A cart quantity exceeds current stock.';
        END IF;

        v_line_total :=
            (v_cart_item.price * v_cart_item.quantity)::NUMERIC(12, 2);

        v_subtotal :=
            v_subtotal +
            v_line_total;

        v_product_snapshot :=
            v_product_snapshot ||
            pg_catalog.jsonb_build_array(
                pg_catalog.jsonb_build_object(
                    'product_id', v_cart_item.product_id,
                    'quantity', v_cart_item.quantity,
                    'product_name', v_cart_item.name,
                    'product_image_url', v_cart_item.image_url,
                    'unit_price', v_cart_item.price,
                    'line_total', v_line_total
                )
            );
    END LOOP;

    BEGIN
        INSERT INTO public.orders (
            idempotency_key,
            user_id,
            status,
            payment_status,
            currency,
            subtotal,
            shipping_amount,
            discount_amount,
            tax_amount,
            total_amount,
            contact_name,
            contact_phone,
            contact_email,
            shipping_full_name,
            shipping_phone,
            shipping_address_line1,
            shipping_address_line2,
            shipping_city,
            shipping_state,
            shipping_postal_code,
            shipping_country
        )
        VALUES (
            p_idempotency_key,
            v_user_id,
            'PENDING',
            'PENDING',
            'INR',
            v_subtotal,
            0,
            0,
            0,
            v_subtotal,
            pg_catalog.btrim(p_contact_name),
            pg_catalog.btrim(p_contact_phone),
            v_contact_email,
            pg_catalog.btrim(p_shipping_full_name),
            pg_catalog.btrim(p_shipping_phone),
            pg_catalog.btrim(p_shipping_address_line1),
            NULLIF(pg_catalog.btrim(COALESCE(p_shipping_address_line2, '')), ''),
            pg_catalog.btrim(p_shipping_city),
            pg_catalog.btrim(p_shipping_state),
            pg_catalog.btrim(p_shipping_postal_code),
            'India'
        )
        RETURNING
            public.orders.id,
            public.orders.order_number,
            public.orders.status,
            public.orders.payment_status,
            public.orders.total_amount
        INTO
            v_order_id,
            v_order_number,
            v_status,
            v_payment_status,
            v_total_amount;
    EXCEPTION
        WHEN unique_violation THEN
            SELECT o.id, o.order_number, o.status, o.payment_status, o.total_amount
            INTO v_existing_order
            FROM public.orders AS o
            WHERE o.user_id = v_user_id
              AND o.idempotency_key = p_idempotency_key;

            IF NOT FOUND THEN
                RAISE;
            END IF;

            RETURN QUERY
            SELECT
                v_existing_order.id,
                v_existing_order.order_number,
                v_existing_order.status,
                v_existing_order.payment_status,
                v_existing_order.total_amount;
            RETURN;
    END;

    INSERT INTO public.order_items (
        order_id,
        product_id,
        product_name,
        product_image_url,
        unit_price,
        quantity,
        line_total
    )
    SELECT
        v_order_id,
        snapshot.product_id,
        snapshot.product_name,
        snapshot.product_image_url,
        snapshot.unit_price,
        snapshot.quantity,
        snapshot.line_total
    FROM pg_catalog.jsonb_to_recordset(v_product_snapshot) AS snapshot(
        product_id UUID,
        quantity INTEGER,
        product_name TEXT,
        product_image_url TEXT,
        unit_price NUMERIC(12, 2),
        line_total NUMERIC(12, 2)
    );

    DELETE FROM public.cart_items
    WHERE user_id = v_user_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count <> v_cart_count THEN
        RAISE EXCEPTION 'ORDER_CREATION_FAILED: The cart could not be cleared.';
    END IF;

    RETURN QUERY
    SELECT
        v_order_id,
        v_order_number,
        v_status,
        v_payment_status,
        v_total_amount;
EXCEPTION
    WHEN unique_violation THEN
        RAISE;
    WHEN SQLSTATE 'P0001' THEN
        RAISE;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ORDER_CREATION_FAILED: The order could not be created.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_from_cart(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.create_order_from_cart(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT
) FROM anon;

GRANT EXECUTE ON FUNCTION public.create_order_from_cart(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT
) TO authenticated;
