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

// ─── Cart & Wishlist Phase 3B Data Methods ─────────────────────────────────────

function requireAuth() {
  return supabase.auth.getSession().then(({ data }) => data?.session?.user?.id || null);
}

function invalidProductId(productId) {
  return !productId || String(productId) === 'undefined' || String(productId) === 'null';
}

function normalizeQty(qty) {
  const n = parseInt(qty, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Treat zero-row UPDATE/DELETE as failure (PostgREST often returns error: null). */
function mutationResult(data, error, emptyMessage) {
  if (error) {
    console.error('[Supabase mutation]', error);
    return { data: null, error };
  }
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  if (rows.length === 0) {
    const err = { message: emptyMessage };
    console.error('[Supabase mutation]', err.message);
    return { data: null, error: err };
  }
  return { data: rows, error: null };
}

export async function getCartItems() {
  const userId = await requireAuth();
  if (!userId) return { data: null, error: 'unauthenticated' };

  const { data, error } = await supabase
    .from('cart_items')
    .select('id, quantity, product_id, products(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) console.error('[Supabase getCartItems] Error:', error);
  return { data, error };
}

export async function addToCart(productId, qty = 1) {
  const userId = await requireAuth();
  if (!userId) return { error: 'unauthenticated' };

  if (invalidProductId(productId)) {
    return { error: { message: 'Invalid product ID provided.' } };
  }

  const amount = normalizeQty(qty);

  const { data: existing, error: existErr } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existErr) {
    console.error('[Supabase addToCart checks] Error:', existErr);
    return { error: existErr };
  }

  if (existing) {
    const newQty = existing.quantity + amount;
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity: newQty })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select('id, quantity');

    return mutationResult(data, error, 'Could not update cart quantity. Please try again.');
  }

  const { data, error } = await supabase
    .from('cart_items')
    .insert({ user_id: userId, product_id: productId, quantity: amount })
    .select('id, quantity');

  return mutationResult(data, error, 'Could not add item to cart. Please try again.');
}

export async function updateCartQuantity(productId, newQty) {
  const userId = await requireAuth();
  if (!userId) return { error: 'unauthenticated' };

  if (invalidProductId(productId)) {
    return { error: { message: 'Invalid product ID provided.' } };
  }

  const qty = parseInt(newQty, 10);
  if (!Number.isFinite(qty) || qty <= 0) {
    return await removeCartItem(productId);
  }

  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity: qty })
    .eq('user_id', userId)
    .eq('product_id', productId)
    .select('id, quantity');

  return mutationResult(data, error, 'Could not update cart quantity. Please try again.');
}

export async function removeCartItem(productId) {
  const userId = await requireAuth();
  if (!userId) return { error: 'unauthenticated' };

  if (invalidProductId(productId)) {
    return { error: { message: 'Invalid product ID provided.' } };
  }

  const { data, error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
    .select('id');

  return mutationResult(data, error, 'Could not remove cart item. Please try again.');
}

export async function getWishlistItems() {
  const userId = await requireAuth();
  if (!userId) return { data: null, error: 'unauthenticated' };

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('id, product_id, products(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) console.error('[Supabase getWishlistItems] Error:', error);
  return { data, error };
}

export async function toggleWishlist(productId) {
  const userId = await requireAuth();
  if (!userId) return { error: 'unauthenticated', action: null };

  if (invalidProductId(productId)) {
    return { error: { message: 'Invalid product ID provided.' }, action: null };
  }

  const { data: existing, error: existErr } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existErr) {
    console.error('[Supabase toggleWishlist checks] Error:', existErr);
    return { error: existErr, action: null };
  }

  if (existing) {
    const { data, error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select('id');

    const result = mutationResult(data, error, 'Could not remove from wishlist. Please try again.');
    return { ...result, action: result.error ? null : 'removed' };
  }

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert({ user_id: userId, product_id: productId })
    .select('id');

  const result = mutationResult(data, error, 'Could not add to wishlist. Please try again.');
  return { ...result, action: result.error ? null : 'added' };
}
