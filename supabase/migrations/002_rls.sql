-- ============================================================
-- Toys World — Row Level Security (RLS) Policies
-- Migration: 002_rls.sql
--
-- Run AFTER 001_schema.sql.
-- Security model:
--   Public (anon):  SELECT only on all tables.
--   Authenticated:  Full INSERT / UPDATE / DELETE (store admin).
-- ============================================================


-- ── Enable RLS on every table ────────────────────────────────
ALTER TABLE store_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════
-- store_settings
-- ════════════════════════════════════════════════════════════

-- Public: Anyone can read store branding/contact info.
CREATE POLICY "Public can read store settings"
    ON store_settings
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Admin: Authenticated users can update store settings.
CREATE POLICY "Admin can update store settings"
    ON store_settings
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Note: INSERT is intentionally excluded — one row is created
-- manually when the Supabase project is first set up.


-- ════════════════════════════════════════════════════════════
-- categories
-- ════════════════════════════════════════════════════════════

CREATE POLICY "Public can read categories"
    ON categories
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Admin can insert categories"
    ON categories
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admin can update categories"
    ON categories
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin can delete categories"
    ON categories
    FOR DELETE
    TO authenticated
    USING (true);


-- ════════════════════════════════════════════════════════════
-- subcategories
-- ════════════════════════════════════════════════════════════

CREATE POLICY "Public can read subcategories"
    ON subcategories
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Admin can insert subcategories"
    ON subcategories
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admin can update subcategories"
    ON subcategories
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin can delete subcategories"
    ON subcategories
    FOR DELETE
    TO authenticated
    USING (true);


-- ════════════════════════════════════════════════════════════
-- products
-- ════════════════════════════════════════════════════════════

CREATE POLICY "Public can read products"
    ON products
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Admin can insert products"
    ON products
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admin can update products"
    ON products
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin can delete products"
    ON products
    FOR DELETE
    TO authenticated
    USING (true);
