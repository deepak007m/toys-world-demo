-- ============================================================
-- Toys World — Database Schema
-- Migration: 001_schema.sql
--
-- Run this first in the Supabase SQL editor or via the CLI.
-- Tables: store_settings, categories, subcategories, products
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
-- Supabase enables uuid-ossp by default; included for clarity.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── 1. store_settings ────────────────────────────────────────
-- Single row per deployment. Controls all branding, contact,
-- and store-level metadata shown on the public frontend.
CREATE TABLE IF NOT EXISTS store_settings (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Branding
    store_name        TEXT        NOT NULL DEFAULT 'My Store',
    tagline           TEXT,                        -- e.g. "Palghar's Coolest Toy Store"

    -- Contact
    whatsapp_number   TEXT        NOT NULL,        -- E.164 without +, e.g. "919876543210"
    phone             TEXT,                        -- Display phone, optional
    email             TEXT,

    -- Location
    address           TEXT,
    map_link          TEXT,                        -- Google Maps URL

    -- Social
    instagram_handle  TEXT,                        -- e.g. "@toys_world48"
    instagram_url     TEXT,

    -- Trust indicators (shown in header/homepage strip)
    google_rating     NUMERIC(2,1),               -- e.g. 5.0
    google_review_count INT,

    -- Hero / Store Story images (Supabase Storage public URLs)
    hero_image_url    TEXT,
    story_image_url   TEXT,

    -- Metadata
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER store_settings_updated_at
    BEFORE UPDATE ON store_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 2. categories ─────────────────────────────────────────────
-- Top-level product categories (Anime, Die-Cast, RC, Plush, etc.)
CREATE TABLE IF NOT EXISTS categories (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug          TEXT        NOT NULL UNIQUE,   -- URL-safe identifier, e.g. "die-cast"
    title         TEXT        NOT NULL,          -- Display label, e.g. "DIE-CAST"
    description   TEXT,                          -- Short subtitle, e.g. "Hot Wheels · Mini Cars"
    image_url     TEXT,                          -- Supabase Storage URL for category card bg
    color_accent  TEXT DEFAULT '#FFD600',        -- CSS hex for category accent color
    sort_order    INT  DEFAULT 0,                -- Lower = appears first

    created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ── 3. subcategories ──────────────────────────────────────────
-- Optional second-level classification within a category.
-- Displayed as horizontal filter pills on the shop page.
-- Example: category = Die-Cast → subcategories: Hot Wheels, Mini Alloy, Premium
CREATE TABLE IF NOT EXISTS subcategories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,

    slug        TEXT NOT NULL,          -- e.g. "hot-wheels"
    title       TEXT NOT NULL,          -- e.g. "Hot Wheels"
    sort_order  INT  DEFAULT 0,

    created_at  TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (category_id, slug)          -- slug must be unique within a category
);


-- ── 4. products ───────────────────────────────────────────────
-- Full product catalogue. Supports both "confirmed" and
-- placeholder pricing + availability states.
CREATE TYPE availability_status AS ENUM (
    'IN_STOCK',
    'LIMITED',
    'OUT_OF_STOCK',
    'CONFIRM_ON_WA'         -- Price/availability needs owner confirmation
);

CREATE TABLE IF NOT EXISTS products (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Classification
    category_id      UUID REFERENCES categories(id)    ON DELETE SET NULL,
    subcategory_id   UUID REFERENCES subcategories(id) ON DELETE SET NULL,

    -- Core product data
    name             TEXT        NOT NULL,
    short_description TEXT,
    long_description TEXT,

    -- Pricing: NULL means "Price on request" on the frontend
    price            NUMERIC(10, 2),

    -- Availability
    availability     availability_status NOT NULL DEFAULT 'CONFIRM_ON_WA',

    -- Display
    badge            TEXT,               -- e.g. "POPULAR", "NEW", "TRENDING"
    image_url        TEXT,               -- Supabase Storage public URL
    is_featured      BOOLEAN NOT NULL DEFAULT FALSE,

    -- Admin notes (not shown to customers)
    internal_notes   TEXT,

    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Indexes ───────────────────────────────────────────────────
-- Optimise the most common frontend query patterns.
CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured    ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_subcategories_cat   ON subcategories(category_id);
