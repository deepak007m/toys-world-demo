-- ============================================================
-- Toys World — Base Table Grants & Hardening Fix
-- Migration: 006_admin_grants_fix.sql
--
-- REASON FOR MIGRATION:
--   RLS policies evaluate *after* table-level privileges.
--   If `GRANT INSERT ON products TO authenticated;` is missing,
--   Postgres throws "permission denied" before RLS even runs.
--
-- FIX:
--   1. Redefine is_admin() with explicit schema, strict search_path,
--      and securely qualify table lookups to prevent hijacking.
--   2. Recreate write policies to explicitly use `(SELECT public.is_admin())`.
--   3. Apply missing table GRANTs for anon (SELECT) and 
--      authenticated (SELECT, INSERT, UPDATE, DELETE).
-- ============================================================

-- ── 1. Fix is_admin() Function Security ───────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
    );
$$;


-- ── 2. Explicit Table Grants ──────────────────────────────────
-- For public browsing (anon) - Only SELECT
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT ON public.categories     TO anon;
GRANT SELECT ON public.subcategories  TO anon;
GRANT SELECT ON public.products       TO anon;

-- For Dashboard API access (authenticated) - Full CRUD 
-- RLS policies restrict this tightly based on is_admin().
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategories  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products       TO authenticated;

-- Allow authenticated users to check the whitelist via SELECT
GRANT SELECT ON public.admin_users TO authenticated;
GRANT SELECT ON public.admin_users TO anon;


-- ── 3. Stricter Policy Definitions ────────────────────────────
-- Drop policies from 005 and recreate using (SELECT public.is_admin())

-- store_settings
DROP POLICY IF EXISTS "Admin can update store settings" ON store_settings;
CREATE POLICY "Admin can update store settings" ON store_settings FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

-- categories
DROP POLICY IF EXISTS "Admin can insert categories" ON categories;
DROP POLICY IF EXISTS "Admin can update categories" ON categories;
DROP POLICY IF EXISTS "Admin can delete categories" ON categories;

CREATE POLICY "Admin can insert categories" ON categories FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin can update categories" ON categories FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin can delete categories" ON categories FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- subcategories
DROP POLICY IF EXISTS "Admin can insert subcategories" ON subcategories;
DROP POLICY IF EXISTS "Admin can update subcategories" ON subcategories;
DROP POLICY IF EXISTS "Admin can delete subcategories" ON subcategories;

CREATE POLICY "Admin can insert subcategories" ON subcategories FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin can update subcategories" ON subcategories FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin can delete subcategories" ON subcategories FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- products
DROP POLICY IF EXISTS "Admin can insert products" ON products;
DROP POLICY IF EXISTS "Admin can update products" ON products;
DROP POLICY IF EXISTS "Admin can delete products" ON products;

CREATE POLICY "Admin can insert products" ON products FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin can update products" ON products FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin can delete products" ON products FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
