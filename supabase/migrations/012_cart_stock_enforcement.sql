-- ============================================================
-- Toys World — Cart Stock Enforcement
-- Migration: 012_cart_stock_enforcement.sql
--
-- Validates cart quantities against current product stock.
-- Cart operations do not reserve or deduct stock.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_cart_item_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    available_stock INTEGER;
BEGIN
    SELECT stock_quantity
    INTO available_stock
    FROM public.products
    WHERE id = NEW.product_id;

    -- The product_id foreign key also enforces this relationship. Keep
    -- this guard defensive and narrowly scoped to the stock validation.
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cannot add cart item because the product does not exist.';
    END IF;

    IF NEW.quantity > available_stock THEN
        RAISE EXCEPTION 'Cannot add % items. Only % are currently in stock.',
            NEW.quantity,
            available_stock;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cart_items_validate_stock ON public.cart_items;

CREATE TRIGGER cart_items_validate_stock
    BEFORE INSERT OR UPDATE
    ON public.cart_items
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_cart_item_stock();
