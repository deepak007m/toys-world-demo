-- ============================================================
-- Toys World — Clean Seed Data
-- Migration: 004_seed_clean.sql
--
-- Seeds only: store_settings, categories, subcategories.
-- Products are NOT seeded here — they are added via the
-- React Admin Dashboard.
-- Images are NOT seeded — they are uploaded via the Admin Dashboard.
-- Run AFTER 002_rls.sql.
-- Safe to run once on a fresh database.
-- ============================================================


-- ── 1. Store Settings ─────────────────────────────────────────
-- One row per deployment. Fill in real values via the Admin
-- Dashboard after first login. Image URLs are left NULL until
-- uploaded through the Admin Dashboard.
INSERT INTO store_settings (
    store_name,
    tagline,
    whatsapp_number,
    phone,
    address,
    map_link,
    instagram_handle,
    instagram_url,
    google_rating,
    google_review_count,
    hero_image_url,
    story_image_url
)
VALUES (
    'TOYS WORLD & GIFT GALLERY',
    'Palghar''s Coolest Toy Store',
    '',         -- Set via Admin Dashboard
    NULL,       -- Set via Admin Dashboard
    'Manor Highway Road, opposite Holy Spirit High School, near Royal Enfield showroom, Tembhode/Mahim, Palghar, Maharashtra 401404',
    'https://maps.google.com/?q=Toys+World+Gift+Gallery+Palghar+Manor+Highway+Road',
    '@toys_world48',
    'https://instagram.com/toys_world48',
    NULL,       -- Set via Admin Dashboard when confirmed
    NULL,       -- Set via Admin Dashboard when confirmed
    NULL,       -- Uploaded via Admin Dashboard
    NULL        -- Uploaded via Admin Dashboard
);


-- ── 2. Categories ─────────────────────────────────────────────
-- image_url is NULL — uploaded via Admin Dashboard.
INSERT INTO categories (slug, title, description, image_url, color_accent, sort_order)
VALUES
    ('anime',     'ANIME',       'Figures · Collectibles',             NULL, '#2d9cdb', 1),
    ('die-cast',  'DIE-CAST',    'Hot Wheels · Mini Cars',             NULL, '#eb5757', 2),
    ('rc-racing', 'RC & RACING', 'RC Cars · Racing Toys',              NULL, '#FFD600', 3),
    ('plush',     'PLUSH',       'Soft · Cute · Giftable',             NULL, '#9b51e0', 4),
    ('figures',   'FIGURES',     'Heroes · Characters · Collectibles', NULL, '#111111', 5),
    ('gifts',     'GIFTS & MORE','Something for everyone',             NULL, '#f87316', 6);


-- ── 3. Subcategories ─────────────────────────────────────────
-- Die-Cast
INSERT INTO subcategories (category_id, slug, title, sort_order)
SELECT id, 'hot-wheels',        'Hot Wheels',        1 FROM categories WHERE slug = 'die-cast'
UNION ALL
SELECT id, 'mini-alloy',        'Mini Alloy',        2 FROM categories WHERE slug = 'die-cast'
UNION ALL
SELECT id, 'premium-original',  'Premium/Original',  3 FROM categories WHERE slug = 'die-cast';

-- Anime
INSERT INTO subcategories (category_id, slug, title, sort_order)
SELECT id, 'naruto',        'Naruto',       1 FROM categories WHERE slug = 'anime'
UNION ALL
SELECT id, 'demon-slayer',  'Demon Slayer', 2 FROM categories WHERE slug = 'anime'
UNION ALL
SELECT id, 'dragon-ball',   'Dragon Ball',  3 FROM categories WHERE slug = 'anime';

-- Figures
INSERT INTO subcategories (category_id, slug, title, sort_order)
SELECT id, 'marvel',  'Marvel',  1 FROM categories WHERE slug = 'figures'
UNION ALL
SELECT id, 'dc',      'DC',      2 FROM categories WHERE slug = 'figures'
UNION ALL
SELECT id, 'gaming',  'Gaming',  3 FROM categories WHERE slug = 'figures';

-- RC & Racing
INSERT INTO subcategories (category_id, slug, title, sort_order)
SELECT id, 'rc-cars',    'RC Cars',    1 FROM categories WHERE slug = 'rc-racing'
UNION ALL
SELECT id, 'drones',     'Drones',     2 FROM categories WHERE slug = 'rc-racing'
UNION ALL
SELECT id, 'racing-sets','Racing Sets',3 FROM categories WHERE slug = 'rc-racing';

-- Plush
INSERT INTO subcategories (category_id, slug, title, sort_order)
SELECT id, 'teddy-bears', 'Teddy Bears', 1 FROM categories WHERE slug = 'plush'
UNION ALL
SELECT id, 'anime-plush', 'Anime Plush', 2 FROM categories WHERE slug = 'plush'
UNION ALL
SELECT id, 'character',   'Character',   3 FROM categories WHERE slug = 'plush';

-- Gifts
INSERT INTO subcategories (category_id, slug, title, sort_order)
SELECT id, 'keychains',   'Keychains',  1 FROM categories WHERE slug = 'gifts'
UNION ALL
SELECT id, 'novelty',     'Novelty',    2 FROM categories WHERE slug = 'gifts'
UNION ALL
SELECT id, 'stationery',  'Stationery', 3 FROM categories WHERE slug = 'gifts';
