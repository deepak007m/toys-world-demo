-- ============================================================
-- Toys World — Seed Data
-- Migration: 004_seed.sql
--
-- Populates the database with the exact store data currently
-- in src/js/data.js so the frontend has content from day one.
-- Run AFTER 002_rls.sql.
--
-- IMAGE NOTES:
-- Columns marked  ← UPLOAD FIRST  require the corresponding
-- image to be uploaded to Supabase Storage (store-images bucket)
-- before inserting, then replaced with the actual storage URL.
-- Placeholder text marks each one clearly.
-- ============================================================


-- ── 1. Store Settings (seed one row) ─────────────────────────
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
    '910000000000',      -- ← REPLACE: actual WhatsApp number (country code, no +)
    NULL,                -- ← REPLACE: actual phone number, or leave NULL
    'Manor Highway Road, opposite Holy Spirit High School, near Royal Enfield showroom, Tembhode/Mahim, Palghar, Maharashtra 401404',
    'https://maps.google.com/?q=Toys+World+Gift+Gallery+Palghar+Manor+Highway+Road',
    '@toys_world48',
    'https://instagram.com/toys_world48',
    5.0,
    47,
    'STORAGE_URL/hero/real_store_exterior.png',    -- ← UPLOAD FIRST to store-images/hero/
    'STORAGE_URL/hero/real_store_interior.png'     -- ← UPLOAD FIRST to store-images/hero/
);

-- Convenience: replace STORAGE_URL prefix in one place
-- Format: https://<project-ref>.supabase.co/storage/v1/object/public/store-images


-- ── 2. Categories ─────────────────────────────────────────────
INSERT INTO categories (slug, title, description, image_url, color_accent, sort_order)
VALUES
    ('anime',     'ANIME',       'Figures · Collectibles',    'STORAGE_URL/categories/cat_anime.png',    '#2d9cdb', 1),
    ('die-cast',  'DIE-CAST',    'Hot Wheels · Mini Cars',    'STORAGE_URL/categories/real_store_shelf.png', '#eb5757', 2),
    ('rc-racing', 'RC & RACING', 'RC Cars · Racing Toys',     'STORAGE_URL/categories/cat_rc.png',      '#FFD600', 3),
    ('plush',     'PLUSH',       'Soft · Cute · Giftable',    'STORAGE_URL/categories/cat_plush.png',   '#9b51e0', 4),
    ('figures',   'FIGURES',     'Heroes · Characters · Collectibles', 'STORAGE_URL/categories/real_spiderman.png', '#111111', 5),
    ('gifts',     'GIFTS & MORE','Something for everyone',    'STORAGE_URL/categories/real_store_shelf.png', '#f87316', 6);


-- ── 3. Subcategories ─────────────────────────────────────────
-- Die-Cast subcategories (example set — owner can adjust)
INSERT INTO subcategories (category_id, slug, title, sort_order)
SELECT id, 'hot-wheels',    'Hot Wheels',    1 FROM categories WHERE slug = 'die-cast'
UNION ALL
SELECT id, 'mini-alloy',   'Mini Alloy',    2 FROM categories WHERE slug = 'die-cast'
UNION ALL
SELECT id, 'premium',      'Premium/Original', 3 FROM categories WHERE slug = 'die-cast';

-- Anime subcategories
INSERT INTO subcategories (category_id, slug, title, sort_order)
SELECT id, 'naruto',        'Naruto',         1 FROM categories WHERE slug = 'anime'
UNION ALL
SELECT id, 'demon-slayer',  'Demon Slayer',   2 FROM categories WHERE slug = 'anime'
UNION ALL
SELECT id, 'dragon-ball',   'Dragon Ball',    3 FROM categories WHERE slug = 'anime';

-- Figures subcategories
INSERT INTO subcategories (category_id, slug, title, sort_order)
SELECT id, 'marvel',        'Marvel',         1 FROM categories WHERE slug = 'figures'
UNION ALL
SELECT id, 'dc',            'DC',             2 FROM categories WHERE slug = 'figures'
UNION ALL
SELECT id, 'gaming',        'Gaming',         3 FROM categories WHERE slug = 'figures';


-- ── 4. Products ───────────────────────────────────────────────
-- Seeded from current data.js. Prices are NULL = "Price on request".
-- Replace image_url values after uploading to Supabase Storage.

-- p1: Mini Alloy Die-Cast
INSERT INTO products (
    category_id, subcategory_id, name, short_description, long_description,
    price, availability, badge, image_url, is_featured
)
SELECT
    c.id,
    s.id,
    'Mini Alloy 1:64 Scale Die-Cast',
    'Premium 1:64 scale collectible',
    'A highly detailed 1:64 scale die-cast model — perfect for collectors. Features precise detailing, realistic wheels and an authentic paint finish. Available now at Toys World, Palghar.',
    NULL,
    'CONFIRM_ON_WA',
    'POPULAR',
    'STORAGE_URL/products/real_mini_gt.png',    -- ← UPLOAD FIRST
    TRUE
FROM categories c
LEFT JOIN subcategories s ON s.category_id = c.id AND s.slug = 'mini-alloy'
WHERE c.slug = 'die-cast';

-- p2: Anime Battle Figure
INSERT INTO products (
    category_id, name, short_description, long_description,
    price, availability, badge, image_url, is_featured
)
SELECT
    id,
    'Anime Battle Figure',     -- DEMO NAME — confirm with owner
    'High-quality anime collectible',
    'Premium anime-style collectible figure with dynamic pose and rich painted details. Great for display or gifting.',
    NULL,
    'CONFIRM_ON_WA',
    'TRENDING',
    'STORAGE_URL/products/cat_anime.png',       -- ← UPLOAD FIRST
    TRUE
FROM categories WHERE slug = 'anime';

-- p3: Off-Road RC Buggy
INSERT INTO products (
    category_id, name, short_description, long_description,
    price, availability, badge, image_url, is_featured
)
SELECT
    id,
    'Off-Road RC Buggy',       -- DEMO NAME — confirm with owner
    'Fast all-terrain remote control',
    'Powerful RC buggy built for indoor and outdoor terrain. Rechargeable battery, sturdy build, hours of fun.',
    NULL,
    'CONFIRM_ON_WA',
    'NEW',
    'STORAGE_URL/products/cat_rc.png',          -- ← UPLOAD FIRST
    TRUE
FROM categories WHERE slug = 'rc-racing';

-- p4: Spider-Man Action Figure
INSERT INTO products (
    category_id, subcategory_id, name, short_description, long_description,
    price, availability, badge, image_url, is_featured
)
SELECT
    c.id,
    s.id,
    'Spider-Man Action Figure',
    'Articulated superhero collectible',
    'Highly detailed Spider-Man action figure with articulated joints. Suitable for play or premium shelf display. A great Marvel collectible available at Toys World, Palghar.',
    NULL,
    'CONFIRM_ON_WA',
    '',
    'STORAGE_URL/products/real_spiderman.png',  -- ← UPLOAD FIRST
    TRUE
FROM categories c
LEFT JOIN subcategories s ON s.category_id = c.id AND s.slug = 'marvel'
WHERE c.slug = 'figures';

-- p5–p8: Remaining demo products (non-featured)
INSERT INTO products (category_id, name, short_description, long_description, price, availability, badge, image_url, is_featured)
SELECT id, 'Giant Teddy Bear', 'Super soft cuddly bear',
    'A large, super-soft plush teddy bear made with premium materials. Perfect as a birthday gift or for young children.',
    NULL, 'CONFIRM_ON_WA', 'BEST GIFT', 'STORAGE_URL/products/cat_plush.png', FALSE
FROM categories WHERE slug = 'plush'
UNION ALL
SELECT id, 'Hot Wheels Blind Bag', 'Surprise die-cast car pack',
    'A curated selection of exclusive Hot Wheels models from our store shelves. Highly sought after by die-cast collectors.',
    NULL, 'CONFIRM_ON_WA', 'POPULAR', 'STORAGE_URL/products/real_store_shelf.png', FALSE
FROM categories WHERE slug = 'die-cast'
UNION ALL
SELECT id, 'Keychains & Gift Items', 'Cute keychains & novelty gifts',
    'A curated selection of keychains, novelty items, and unique gifts available in our store. Great for birthdays and special occasions.',
    NULL, 'CONFIRM_ON_WA', '', 'STORAGE_URL/products/real_store_shelf.png', FALSE
FROM categories WHERE slug = 'gifts'
UNION ALL
SELECT id, 'Demon Slayer Collectible', 'Detailed character figure',
    'Premium Demon Slayer-style anime collectible with incredible sculpt detailing. Perfect for display or gifting to anime fans.',
    NULL, 'CONFIRM_ON_WA', 'NEW', 'STORAGE_URL/products/cat_anime.png', FALSE
FROM categories WHERE slug = 'anime';
