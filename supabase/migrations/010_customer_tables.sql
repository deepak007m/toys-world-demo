-- ============================================================
-- Toys World — Customer Tables: Addresses, Cart, Wishlist
-- Migration: 010_customer_tables.sql
--
-- Depends on:
--   001_schema.sql  ── update_updated_at() function
--   005_admin_rls.sql ── is_admin() function, admin_users table
--   007_customer_auth.sql ── auth.users, public.profiles
--
-- Creates:
--   public.addresses     ── customer shipping/billing addresses
--   public.cart_items    ── customer shopping cart (one row per product)
--   public.wishlist_items ── customer wishlist (one row per product)
--
-- Security model:
--   authenticated users: strict auth.uid() scoped access to own rows only
--   anon: no access
--   admin: reads own admin_users row; no special override of customer data
--          (admin does not need to read customer carts/wishlists)
-- ============================================================


-- ── GRANTS (pre-declare roles so policies compile) ───────────
-- Ensure the authenticated role has table-level permissions.
-- RLS policies will further restrict row-level access.


-- ══════════════════════════════════════════════════════════════
-- TABLE 1: public.addresses
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.addresses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Owner
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Recipient details
    full_name       TEXT NOT NULL,
    phone           TEXT NOT NULL,

    -- Location
    address_line1   TEXT NOT NULL,
    address_line2   TEXT,
    landmark        TEXT,
    city            TEXT NOT NULL,
    state           TEXT NOT NULL,
    postal_code     TEXT NOT NULL,

    -- Classification
    address_type    TEXT NOT NULL DEFAULT 'Home'
                        CHECK (address_type IN ('Home', 'Work', 'Other')),

    -- Default flag: at most one default per user (enforced via partial unique index)
    is_default      BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at (reuses the existing function from 001_schema.sql)
CREATE TRIGGER addresses_updated_at
    BEFORE UPDATE ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- Enforce at most one default address per user at the database level.
-- A partial unique index on (user_id) WHERE is_default = true means
-- only one row per user can have is_default = true.
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default_per_user
    ON public.addresses(user_id)
    WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;

-- RLS Policies — addresses
DROP POLICY IF EXISTS "Customers can view own addresses"   ON public.addresses;
CREATE POLICY "Customers can view own addresses"
    ON public.addresses
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can insert own addresses" ON public.addresses;
CREATE POLICY "Customers can insert own addresses"
    ON public.addresses
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own addresses" ON public.addresses;
CREATE POLICY "Customers can update own addresses"
    ON public.addresses
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can delete own addresses" ON public.addresses;
CREATE POLICY "Customers can delete own addresses"
    ON public.addresses
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════
-- TABLE 2: public.cart_items
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cart_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Owner
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Product reference — no product data duplicated here
    -- ON DELETE CASCADE: if a product is deleted, its cart references go too
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

    -- Quantity must be a positive integer
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

    -- Timestamps
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate product rows for the same user
    UNIQUE (user_id, product_id)
);

-- Auto-update updated_at
CREATE TRIGGER cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id    ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;

-- RLS Policies — cart_items
DROP POLICY IF EXISTS "Customers can view own cart"   ON public.cart_items;
CREATE POLICY "Customers can view own cart"
    ON public.cart_items
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can add to cart"     ON public.cart_items;
CREATE POLICY "Customers can add to cart"
    ON public.cart_items
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own cart" ON public.cart_items;
CREATE POLICY "Customers can update own cart"
    ON public.cart_items
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can remove from cart" ON public.cart_items;
CREATE POLICY "Customers can remove from cart"
    ON public.cart_items
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════
-- TABLE 3: public.wishlist_items
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Owner
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Product reference
    -- ON DELETE CASCADE: product deletion cleanly removes related wishlist items
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

    -- No updated_at needed — wishlist items are created and deleted, never mutated
    created_at  TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate wishlist entries
    UNIQUE (user_id, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id    ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id ON public.wishlist_items(product_id);

-- Enable RLS
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, DELETE ON public.wishlist_items TO authenticated;

-- RLS Policies — wishlist_items
DROP POLICY IF EXISTS "Customers can view own wishlist"  ON public.wishlist_items;
CREATE POLICY "Customers can view own wishlist"
    ON public.wishlist_items
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can add to wishlist"    ON public.wishlist_items;
CREATE POLICY "Customers can add to wishlist"
    ON public.wishlist_items
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can remove from wishlist" ON public.wishlist_items;
CREATE POLICY "Customers can remove from wishlist"
    ON public.wishlist_items
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- Run these in the Supabase SQL Editor after applying to confirm:
-- ══════════════════════════════════════════════════════════════
--
-- 1. Tables exist:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public'
--      AND table_name IN ('addresses', 'cart_items', 'wishlist_items');
--
-- 2. RLS enabled:
--    SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('addresses', 'cart_items', 'wishlist_items');
--
-- 3. Policies:
--    SELECT tablename, policyname, cmd FROM pg_policies
--    WHERE tablename IN ('addresses', 'cart_items', 'wishlist_items')
--    ORDER BY tablename, cmd;
--
-- 4. Indexes:
--    SELECT indexname, tablename FROM pg_indexes
--    WHERE tablename IN ('addresses', 'cart_items', 'wishlist_items');
--
-- 5. Constraints (unique + check):
--    SELECT tc.table_name, tc.constraint_name, tc.constraint_type
--    FROM information_schema.table_constraints tc
--    WHERE tc.table_name IN ('addresses', 'cart_items', 'wishlist_items');
--
-- 6. Existing admin functionality check (should remain unaffected):
--    SELECT is_admin(); -- returns TRUE only for whitelisted admin
