-- Catalogue visibility, lightweight analytics, and admin-recorded sales.
-- This migration is intentionally additive and has not been executed.

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_public_catalogue
    ON public.products (is_hidden, is_featured, created_at DESC);

CREATE TABLE IF NOT EXISTS public.catalog_events (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    event_type TEXT NOT NULL CHECK (event_type IN ('PRODUCT_VIEW', 'WHATSAPP_CLICK')),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    source TEXT NOT NULL DEFAULT 'catalogue' CHECK (length(btrim(source)) BETWEEN 1 AND 40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_events_type_created
    ON public.catalog_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_events_product_type
    ON public.catalog_events (product_id, event_type, created_at DESC);

ALTER TABLE public.catalog_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_catalog_event(
    p_event_type TEXT,
    p_product_id UUID DEFAULT NULL,
    p_source TEXT DEFAULT 'catalogue'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    event_id UUID;
BEGIN
    IF p_event_type NOT IN ('PRODUCT_VIEW', 'WHATSAPP_CLICK') THEN
        RAISE EXCEPTION 'Invalid catalogue event type';
    END IF;
    IF p_product_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.products WHERE id = p_product_id AND NOT is_hidden
    ) THEN
        RETURN NULL;
    END IF;
    INSERT INTO public.catalog_events (event_type, product_id, source)
    VALUES (p_event_type, p_product_id, left(coalesce(nullif(btrim(p_source), ''), 'catalogue'), 40))
    RETURNING id INTO event_id;
    RETURN event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.track_catalog_event(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_catalog_event(TEXT, UUID, TEXT) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.manual_sales (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    sale_amount NUMERIC(12, 2) NOT NULL CHECK (sale_amount >= 0),
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT CHECK (note IS NULL OR length(note) <= 500),
    recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_sales_date ON public.manual_sales (sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_manual_sales_product_date ON public.manual_sales (product_id, sale_date DESC);

ALTER TABLE public.manual_sales ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_sales TO authenticated;

DROP POLICY IF EXISTS "Admins can read manual sales" ON public.manual_sales;
DROP POLICY IF EXISTS "Admins can insert manual sales" ON public.manual_sales;
DROP POLICY IF EXISTS "Admins can update manual sales" ON public.manual_sales;
DROP POLICY IF EXISTS "Admins can delete manual sales" ON public.manual_sales;
CREATE POLICY "Admins can read manual sales" ON public.manual_sales FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Admins can insert manual sales" ON public.manual_sales FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()) AND recorded_by = auth.uid());
CREATE POLICY "Admins can update manual sales" ON public.manual_sales FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins can delete manual sales" ON public.manual_sales FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.prevent_manual_sale_recorded_by_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF NEW.recorded_by IS DISTINCT FROM OLD.recorded_by THEN
        RAISE EXCEPTION 'recorded_by cannot be changed';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS manual_sales_recorded_by_immutable ON public.manual_sales;
CREATE TRIGGER manual_sales_recorded_by_immutable
    BEFORE UPDATE ON public.manual_sales
    FOR EACH ROW EXECUTE FUNCTION public.prevent_manual_sale_recorded_by_change();

DROP TRIGGER IF EXISTS manual_sales_updated_at ON public.manual_sales;
CREATE TRIGGER manual_sales_updated_at
    BEFORE UPDATE ON public.manual_sales
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP POLICY IF EXISTS "Public can read products" ON public.products;
CREATE POLICY "Public can read products"
    ON public.products FOR SELECT TO anon, authenticated
    USING (NOT is_hidden OR (SELECT public.is_admin()));
