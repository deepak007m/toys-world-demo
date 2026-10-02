/**
 * Toys World & Gift Gallery — Data Layer
 * ========================================
 * All product/category/config data now comes from Supabase.
 * Reviews remain static (no reviews table in Phase 2).
 *
 * Public API (all async unless marked static):
 *   getConfig()                          → store branding, contact, images
 *   getCategories()                      → all categories ordered by sort_order
 *   getSubcategories(categoryId)         → subcategories for one category
 *   getProducts({ categoryId, subcategoryId, featured, limit })
 *   getProductById(id)                   → single product by UUID
 *   getFeaturedProducts(limit)           → shorthand for featured products
 *   buildWhatsAppLink(productName)       → static helper, needs config.whatsapp_number
 *   reviews                              → static array (Phase 2)
 */

import { supabase } from './supabase.js';

// ─── WhatsApp Helper ──────────────────────────────────────────────────────────
// Pure function — callers must pass the whatsapp number from getConfig().
export function buildWhatsAppLink(whatsappNumber, productName) {
  const msg = productName
    ? `Hi! I'm interested in *${productName}* from Toys World & Gift Gallery, Palghar. Is it currently available?`
    : `Hi Toys World & Gift Gallery! I'd like to know more about your products.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

// ─── Store Config ─────────────────────────────────────────────────────────────
export async function getConfig() {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('[data] getConfig error:', error.message);
    return null;
  }
  return data;
}

// ─── Categories ───────────────────────────────────────────────────────────────
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[data] getCategories error:', error.message);
    return [];
  }
  return data ?? [];
}

// ─── Subcategories ────────────────────────────────────────────────────────────
export async function getSubcategories(categoryId) {
  if (!categoryId) return [];

  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[data] getSubcategories error:', error.message);
    return [];
  }
  return data ?? [];
}

// ─── Products ─────────────────────────────────────────────────────────────────
/**
 * @param {{ categoryId?: string, subcategoryId?: string, featured?: boolean, limit?: number }} opts
 */
export async function getProducts({ categoryId, subcategoryId, featured, limit } = {}) {
  let query = supabase
    .from('products')
    .select(`
      *,
      categories ( slug, title ),
      subcategories ( slug, title )
    `)
    .order('created_at', { ascending: false });

  if (categoryId) query = query.eq('category_id', categoryId);
  if (subcategoryId) query = query.eq('subcategory_id', subcategoryId);
  if (featured) query = query.eq('is_featured', true);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('[data] getProducts error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getFeaturedProducts(limit = 4) {
  return getProducts({ featured: true, limit });
}

export async function getProductById(id) {
  if (!id) return null;

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories ( slug, title ),
      subcategories ( slug, title )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('[data] getProductById error:', error.message);
    return null;
  }
  return data;
}

// ─── Reviews (static — no database table in Phase 2) ─────────────────────────
export const reviews = [
  {
    id: 1,
    text: 'Amazing variety of toys at genuine prices. Best shop in Palghar for collectibles — Hot Wheels, anime figures, everything!',
    rating: 5,
  },
  {
    id: 2,
    text: 'Love this place! Found an incredible soft toy collection and the staff was super helpful. Will come back again.',
    rating: 5,
  },
  {
    id: 3,
    text: "You never know what you'll find here — it's like a treasure hunt every time. Prices are very reasonable.",
    rating: 5,
  },
];

// ─── STATIC FALLBACK (safe rollback — do not delete until Supabase is verified) ──
/*
export const _STATIC_CONFIG = {
  storeName: 'TOYS WORLD & GIFT GALLERY',
  STORE_WHATSAPP_NUMBER: '910000000000',
  address: 'Manor Highway Road, opposite Holy Spirit High School, near Royal Enfield showroom, Tembhode/Mahim, Palghar, Maharashtra 401404',
  mapLink: 'https://maps.google.com/?q=Toys+World+Gift+Gallery+Palghar+Manor+Highway+Road',
  phone: null,
  instagram: '@toys_world48',
  instagramUrl: 'https://instagram.com/toys_world48',
  heroImage: '/images/real_store_exterior.png',
  storeInteriorImage: '/images/real_store_interior.png',
};

export const _STATIC_CATEGORIES = [
  { id: 'anime',     title: 'ANIME',       desc: 'Figures · Collectibles',             image: '/images/cat_anime.png',         accent: '#2d9cdb' },
  { id: 'die-cast',  title: 'DIE-CAST',    desc: 'Hot Wheels · Mini Cars',             image: '/images/real_store_shelf.png',  accent: '#eb5757' },
  { id: 'rc-racing', title: 'RC & RACING', desc: 'RC Cars · Racing Toys',              image: '/images/cat_rc.png',            accent: '#FFD600' },
  { id: 'plush',     title: 'PLUSH',       desc: 'Soft · Cute · Giftable',             image: '/images/cat_plush.png',         accent: '#9b51e0' },
  { id: 'figures',   title: 'FIGURES',     desc: 'Heroes · Characters · Collectibles', image: '/images/real_spiderman.png',    accent: '#111111' },
  { id: 'gifts',     title: 'GIFTS & MORE',desc: 'Something for everyone',             image: '/images/real_store_shelf.png',  accent: '#f87316' },
];
// To rollback: swap all Supabase calls with _STATIC_CONFIG and _STATIC_CATEGORIES above.
*/
