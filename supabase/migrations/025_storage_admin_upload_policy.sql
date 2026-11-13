-- Toys World - restrict store image mutations to administrators.
-- Public reads remain available for existing storefront image URLs.

DROP POLICY IF EXISTS "Admin can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload to store-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update store-images objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete store-images objects" ON storage.objects;

CREATE POLICY "Admin can upload store-images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'store-images'
        AND public.is_admin()
    );

CREATE POLICY "Admin can update store-images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'store-images'
        AND public.is_admin()
    )
    WITH CHECK (
        bucket_id = 'store-images'
        AND public.is_admin()
    );

CREATE POLICY "Admin can delete store-images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'store-images'
        AND public.is_admin()
    );
