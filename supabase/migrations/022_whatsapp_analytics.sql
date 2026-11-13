-- Toys World — WhatsApp enquiry tracking and admin analytics
-- Public clients can record a minimal click event only through the
-- validated RPC. Enquiry details and order data are admin-only.

CREATE TABLE IF NOT EXISTS public.whatsapp_enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    source TEXT NOT NULL DEFAULT 'product',
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 100),
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'NEGOTIATING', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED')),
    internal_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_enquiries
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'NEW',
    ADD COLUMN IF NOT EXISTS internal_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_enquiries_created_at
    ON public.whatsapp_enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_enquiries_product_id
    ON public.whatsapp_enquiries (product_id);

ALTER TABLE public.whatsapp_enquiries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.whatsapp_enquiries FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.whatsapp_enquiries TO authenticated;

DROP POLICY IF EXISTS "Admins can read WhatsApp enquiries" ON public.whatsapp_enquiries;
CREATE POLICY "Admins can read WhatsApp enquiries"
    ON public.whatsapp_enquiries FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update WhatsApp enquiries" ON public.whatsapp_enquiries;
CREATE POLICY "Admins can update WhatsApp enquiries"
    ON public.whatsapp_enquiries FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.track_whatsapp_enquiry(
    p_product_id UUID DEFAULT NULL,
    p_source TEXT DEFAULT 'product',
    p_quantity INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF p_source IS NULL OR p_source NOT IN ('product', 'cart', 'header', 'contact') THEN
        RAISE EXCEPTION 'INVALID_SOURCE: The enquiry source is not valid.';
    END IF;
    IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 100 THEN
        RAISE EXCEPTION 'INVALID_QUANTITY: The enquiry quantity is not valid.';
    END IF;
    IF p_product_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'PRODUCT_NOT_FOUND: The product could not be found.';
    END IF;

    INSERT INTO public.whatsapp_enquiries (user_id, product_id, source, quantity)
    VALUES (auth.uid(), p_product_id, p_source, p_quantity)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.track_whatsapp_enquiry(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_whatsapp_enquiry(UUID, TEXT, INTEGER) TO anon, authenticated;
