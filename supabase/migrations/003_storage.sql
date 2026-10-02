-- ============================================================
-- Toys World — Supabase Storage Setup
-- Migration: 003_storage.sql
--
-- Run AFTER 002_rls.sql.
-- Creates a public storage bucket for all store imagery.
--
-- IMPORTANT: Supabase Storage buckets are created via the
-- Supabase Dashboard UI or the Management API, not raw SQL.
-- The SQL below sets up the STORAGE POLICIES only (after you
-- manually create the bucket named "store-images").
--
-- Steps to run manually first:
--   1. Go to Supabase Dashboard → Storage → New Bucket
--   2. Name: store-images
--   3. Enable: Public bucket (tick the checkbox)
--   4. Then run the policy SQL below.
-- ============================================================


-- ── Storage Bucket Access Policies ───────────────────────────
-- These policies apply to the "store-images" bucket.

-- Public: Anyone can view/download images (needed for the frontend).
CREATE POLICY "Public can view images"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'store-images');

-- Admin: Authenticated users can upload new images.
CREATE POLICY "Admin can upload images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'store-images');

-- Admin: Authenticated users can update (replace) existing images.
CREATE POLICY "Admin can update images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'store-images')
    WITH CHECK (bucket_id = 'store-images');

-- Admin: Authenticated users can delete images.
CREATE POLICY "Admin can delete images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'store-images');


-- ── Recommended folder structure inside the bucket ───────────
-- store-images/
-- ├── hero/            ← Hero and story section images
-- ├── categories/      ← Category card background images
-- └── products/        ← Product photography (one image per product)
--
-- Access a file via the public URL:
-- https://<project-ref>.supabase.co/storage/v1/object/public/store-images/<path>
