-- ============================================================
-- Toys World — Admin RLS Hardening
-- Migration: 005_admin_rls.sql
--
-- PROBLEM WITH 002_rls.sql:
--   All write policies use "TO authenticated" with no further
--   restriction. This means ANY Supabase Auth user — not just
--   the store owner — can INSERT/UPDATE/DELETE products,
--   categories, subcategories, and store_settings.
--
-- FIX:
--   1. Create an admin_users whitelist table.
--   2. Insert the store owner's auth.uid() into it (do this
--      manually after creating your Supabase Auth account).
--   3. Replace all "TO authenticated" write policies with a
--      check that the current user exists in admin_users.
--
-- HOW TO APPLY:
--   1. Create your Supabase Auth account:
--      Supabase Dashboard → Authentication → Users → Add User
--      Use a strong email + password. This is the only admin account.
--   2. Copy the UUID shown in the Users table.
--   3. Run this entire SQL in Supabase SQL Editor.
--   4. Replace 'PASTE-YOUR-AUTH-UUID-HERE' below with your UUID.
--   5. Confirm the admin_users table has one row.
--
-- IMPORTANT:
--   Do NOT run this migration multiple times without checking
--   for duplicate policies — Supabase will error. If re-running,
--   use the DROP POLICY lines at the bottom first.
-- ============================================================


-- ── 1. Create admin_users whitelist table ─────────────────────
-- This is a simple allowlist. Only users whose auth.uid()
-- appears here are permitted to write to the store database.

CREATE TABLE IF NOT EXISTS admin_users (
    user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    note       TEXT,               -- optional label e.g. "Store owner"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the whitelist itself
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only the user themselves can read their own row.
-- This lets the dashboard do a fast self-check without exposing
-- the full admin list to the public.
CREATE POLICY "Admin can read own row"
    ON admin_users
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ── 2. Insert the store owner's UUID ─────────────────────────
-- REPLACE the placeholder below with the actual UUID from
-- Supabase Dashboard → Authentication → Users.

INSERT INTO admin_users (user_id, note)
VALUES (
    '358e75dd-e002-4687-b5bb-4c110758cf00',   -- ← replace this
    'Toys World store owner'
)
ON CONFLICT (user_id) DO NOTHING;


-- ── 3. Helper function ────────────────────────────────────────
-- Returns TRUE if the calling user is in the admin whitelist.
-- Used in all write policies below.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    );
$$;


-- ── 4. Drop the old broad write policies from 002_rls.sql ─────

DROP POLICY IF EXISTS "Admin can update store settings"   ON store_settings;
DROP POLICY IF EXISTS "Admin can insert categories"       ON categories;
DROP POLICY IF EXISTS "Admin can update categories"       ON categories;
DROP POLICY IF EXISTS "Admin can delete categories"       ON categories;
DROP POLICY IF EXISTS "Admin can insert subcategories"    ON subcategories;
DROP POLICY IF EXISTS "Admin can update subcategories"    ON subcategories;
DROP POLICY IF EXISTS "Admin can delete subcategories"    ON subcategories;
DROP POLICY IF EXISTS "Admin can insert products"         ON products;
DROP POLICY IF EXISTS "Admin can update products"         ON products;
DROP POLICY IF EXISTS "Admin can delete products"         ON products;


-- ── 5. Re-create write policies using is_admin() ─────────────
-- Now only a user who appears in admin_users can write.

-- store_settings (UPDATE only — INSERT handled during setup)
CREATE POLICY "Admin can update store settings"
    ON store_settings FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- categories
CREATE POLICY "Admin can insert categories"
    ON categories FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "Admin can update categories"
    ON categories FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admin can delete categories"
    ON categories FOR DELETE
    TO authenticated
    USING (is_admin());

-- subcategories
CREATE POLICY "Admin can insert subcategories"
    ON subcategories FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "Admin can update subcategories"
    ON subcategories FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admin can delete subcategories"
    ON subcategories FOR DELETE
    TO authenticated
    USING (is_admin());

-- products
CREATE POLICY "Admin can insert products"
    ON products FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "Admin can update products"
    ON products FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admin can delete products"
    ON products FOR DELETE
    TO authenticated
    USING (is_admin());


-- ── 6. Storage: bucket-level security ────────────────────────
-- The store-images bucket should allow:
--   - Public READ (so product images load on the customer site)
--   - Authenticated WRITE only for admin users
--
-- Run these in the Storage → Policies section or as SQL:

-- Allow anyone to view files (needed for product image URLs)
-- This is typically set when creating the bucket as "Public".
-- If you set the bucket to Public during initial setup, this
-- is already handled. No SQL needed for public read.

-- Restrict uploads to admin_users only:
DROP POLICY IF EXISTS "Admin can upload to store-images" ON storage.objects;
CREATE POLICY "Admin can upload to store-images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'store-images'
        AND is_admin()
    );

DROP POLICY IF EXISTS "Admin can update store-images objects" ON storage.objects;
CREATE POLICY "Admin can update store-images objects"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'store-images' AND is_admin())
    WITH CHECK (bucket_id = 'store-images' AND is_admin());

DROP POLICY IF EXISTS "Admin can delete store-images objects" ON storage.objects;
CREATE POLICY "Admin can delete store-images objects"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'store-images' AND is_admin());


-- ── VERIFICATION ─────────────────────────────────────────────
-- After running, confirm:
--
--   SELECT * FROM admin_users;
--   → Should show exactly one row with your UUID
--
--   SELECT is_admin();
--   → Returns FALSE when called as anon (expected)
--   → Returns TRUE when called in the Supabase Auth context
--     of the whitelisted user


-- ── ROLLBACK (if needed) ──────────────────────────────────────
-- To revert to the old broad policies:
--   DROP FUNCTION IF EXISTS is_admin();
--   DROP TABLE IF EXISTS admin_users;
-- Then re-run 002_rls.sql.
