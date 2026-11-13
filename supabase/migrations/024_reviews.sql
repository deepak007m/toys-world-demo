-- ============================================================
-- Toys World — Product reviews and moderation
-- Migration: 024_reviews.sql
--
-- Reviews are submitted by authenticated customers and remain
-- hidden until an administrator approves them.
-- ============================================================

DO $$
BEGIN
    CREATE TYPE public.review_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Customer',
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title TEXT,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
    photo_url TEXT,
    status public.review_status NOT NULL DEFAULT 'PENDING',
    moderated_at TIMESTAMPTZ,
    moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_customer_product_idx
    ON public.reviews (product_id, user_id);

CREATE INDEX IF NOT EXISTS reviews_product_approved_idx
    ON public.reviews (product_id, created_at DESC)
    WHERE status = 'APPROVED';
CREATE INDEX IF NOT EXISTS reviews_status_created_idx
    ON public.reviews (status, created_at DESC);

DROP TRIGGER IF EXISTS reviews_updated_at ON public.reviews;
CREATE TRIGGER reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can read own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can read all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can submit own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can edit own pending reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can delete own pending reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can moderate reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

CREATE POLICY "Public can read approved reviews"
    ON public.reviews FOR SELECT
    TO anon, authenticated
    USING (status = 'APPROVED');

CREATE POLICY "Customers can read own reviews"
    ON public.reviews FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can read all reviews"
    ON public.reviews FOR SELECT
    TO authenticated
    USING ((SELECT public.is_admin()));

CREATE POLICY "Customers can submit own reviews"
    ON public.reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND status = 'PENDING'
        AND moderated_at IS NULL
        AND moderated_by IS NULL
        AND photo_url IS NULL
    );

CREATE POLICY "Customers can edit own pending reviews"
    ON public.reviews FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'PENDING')
    WITH CHECK (
        user_id = auth.uid()
        AND status = 'PENDING'
        AND moderated_at IS NULL
        AND moderated_by IS NULL
        AND photo_url IS NULL
    );

CREATE POLICY "Customers can delete own pending reviews"
    ON public.reviews FOR DELETE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'PENDING');

CREATE POLICY "Admins can moderate reviews"
    ON public.reviews FOR UPDATE
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can delete reviews"
    ON public.reviews FOR DELETE
    TO authenticated
    USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.admin_moderate_review(
    p_review_id UUID,
    p_status public.review_status
)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    updated_review public.reviews;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'ADMIN_REQUIRED: Administrator access is required.';
    END IF;

    IF p_review_id IS NULL OR p_status IS NULL THEN
        RAISE EXCEPTION 'INVALID_REVIEW: Review and status are required.';
    END IF;

    UPDATE public.reviews
    SET status = p_status,
        moderated_at = CASE WHEN p_status = 'PENDING' THEN NULL ELSE NOW() END,
        moderated_by = CASE WHEN p_status = 'PENDING' THEN NULL ELSE auth.uid() END
    WHERE id = p_review_id
    RETURNING * INTO updated_review;

    IF updated_review.id IS NULL THEN
        RAISE EXCEPTION 'REVIEW_NOT_FOUND: The review could not be found.';
    END IF;

    RETURN updated_review;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_moderate_review(UUID, public.review_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_review(UUID, public.review_status) TO authenticated;
