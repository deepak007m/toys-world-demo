-- Toys World - disable customer review photo submissions.
-- Existing review rows are preserved; customer text reviews remain enabled.

DROP POLICY IF EXISTS "Customers can upload review photos" ON storage.objects;

DROP POLICY IF EXISTS "Customers can submit own reviews" ON public.reviews;
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

DROP POLICY IF EXISTS "Customers can edit own pending reviews" ON public.reviews;
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
