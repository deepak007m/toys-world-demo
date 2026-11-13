/**
 * Toys World & Gift Gallery — Data Layer
 * ========================================
 * All product/category/config data now comes from Supabase.
 * Reviews are loaded from Supabase and only approved reviews are public.
 *
 * Public API (all async unless marked static):
 *   getConfig()                          → store branding, contact, images
 *   getCategories()                      → all categories ordered by sort_order
 *   getSubcategories(categoryId)         → subcategories for one category
 *   getProducts({ categoryId, subcategoryId, featured, limit })
 *   getProductById(id)                   → single product by UUID
 *   getFeaturedProducts(limit)           → shorthand for featured products
 *   buildWhatsAppLink(productName)       → static helper, needs config.whatsapp_number
 *   getProductReviews(productId)         → approved reviews and rating summary
 *   submitProductReview(review)          → submit a pending customer review
 */

import { supabase } from './supabase.js';
import { getAvailabilityLabel, getProductAvailability } from './inventory.js';

// ─── WhatsApp Helper ──────────────────────────────────────────────────────────
// Pure function — callers must pass the whatsapp number from getConfig().
const DEFAULT_WHATSAPP_NUMBER = '919272040160';

function getWhatsAppNumber(whatsappNumber) {
  const digits = String(whatsappNumber || DEFAULT_WHATSAPP_NUMBER).replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits || DEFAULT_WHATSAPP_NUMBER;
}

function getProductPriceText(product) {
  return typeof product?.price === 'number' && Number.isFinite(product.price)
    ? `₹${product.price.toLocaleString('en-IN')}`
    : 'Please confirm the price';
}

export function buildWhatsAppLink(whatsappNumber, productName) {
  const msg = productName
    ? `Hello Toys World & Gift Gallery! I'm interested in this product:\n\nProduct: ${productName}\nPrice: Please confirm the price\nQuantity: 1\nProduct link: ${window.location.origin}/product.html\n\nCould you please confirm its availability and share more details?`
    : `Hello Toys World & Gift Gallery! I'd like to enquire about your products.`;
  return `https://wa.me/${getWhatsAppNumber(whatsappNumber)}?text=${encodeURIComponent(msg)}`;
}

export function buildProductWhatsAppLink(whatsappNumber, product, quantity = 1) {
  const productUrl = new URL(`/product.html?id=${encodeURIComponent(product.id)}`, window.location.origin).href;
  const availability = getAvailabilityLabel(getProductAvailability(product));
  const availabilityMessage = availability === 'Out of Stock'
    ? 'This product is currently out of stock; could you please confirm whether it will be restocked?'
    : 'This product is currently available. Could you please confirm the latest details?';
  const message = `Hello Toys World & Gift Gallery! I'd like to enquire about:\n\nProduct: ${product.name}\nPrice: ${getProductPriceText(product)}\nAvailability: ${availability}\nQuantity: ${Math.max(1, Number(quantity) || 1)}\nLink: ${productUrl}\n\n${availabilityMessage}`;
  return `https://wa.me/${getWhatsAppNumber(whatsappNumber)}?text=${encodeURIComponent(message)}`;
}

export function buildCartWhatsAppLink(whatsappNumber, items, subtotal = null) {
  const lines = items.map(({ product, quantity }) => {
    const productUrl = new URL(`/product.html?id=${encodeURIComponent(product.id)}`, window.location.origin).href;
    return `- ${product.name} | ${getProductPriceText(product)} | Quantity: ${quantity} | ${productUrl}`;
  });
  const subtotalText = typeof subtotal === 'number'
    ? `\nEstimated subtotal: ₹${subtotal.toLocaleString('en-IN')}`
    : '\nEstimated subtotal: Please confirm prices';
  const message = `Hello Toys World & Gift Gallery! I'd like to enquire about these products:\n\n${lines.join('\n')}${subtotalText}\n\nPlease confirm availability and share the next steps.`;
  return `https://wa.me/${getWhatsAppNumber(whatsappNumber)}?text=${encodeURIComponent(message)}`;
}

// Record only the fact that an enquiry link was opened. This is intentionally
// fire-and-forget so analytics never prevents WhatsApp from opening.
export async function trackWhatsAppEnquiry(productId = null, source = 'product', quantity = 1) {
  try {
    await supabase.rpc('track_whatsapp_enquiry', {
      p_product_id: productId || null,
      p_source: source,
      p_quantity: Math.max(1, Math.min(100, Number(quantity) || 1)),
    });
    await supabase.rpc('track_catalog_event', {
      p_event_type: 'WHATSAPP_CLICK',
      p_product_id: productId || null,
      p_source: source,
    });
  } catch (error) {
    console.warn('[data] WhatsApp enquiry tracking failed:', error.message);
  }

}

if (typeof window !== 'undefined') {
  window.trackWhatsAppEnquiry = trackWhatsAppEnquiry;
}

export async function trackProductView(productId) {
  if (!productId) return;
  try {
    await supabase.rpc('track_catalog_event', {
      p_event_type: 'PRODUCT_VIEW',
      p_product_id: productId,
      p_source: 'product-page',
    });
  } catch (error) {
    console.warn('[data] product view tracking failed:', error.message);
  }
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
  query = query.eq('is_hidden', false);
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
    .eq('is_hidden', false)
    .single();

  if (error) {
    console.error('[data] getProductById error:', error.message);
    return null;
  }
  return data;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────
export async function getProductReviews(productId) {
  if (!productId) return { reviews: [], average: 0, count: 0 };

  const { data, error } = await supabase
    .from('reviews')
    .select('id, product_id, display_name, rating, title, body, created_at')
    .eq('product_id', productId)
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[data] getProductReviews error:', error.message);
    return { reviews: [], average: 0, count: 0 };
  }

  const approved = data ?? [];
  const average = approved.length
    ? approved.reduce((sum, review) => sum + Number(review.rating), 0) / approved.length
    : 0;
  return { reviews: approved, average, count: approved.length };
}

export async function getCustomerProductReview(productId) {
  if (!productId) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await supabase
    .from('reviews')
    .select('id, product_id, user_id, display_name, rating, title, body, status, created_at')
    .eq('product_id', productId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('[data] getCustomerProductReview error:', error.message);
    return null;
  }
  return data;
}

export async function submitProductReview({ productId, rating, title, body, authorName }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return { data: null, error: { message: 'Please sign in to leave a review.' } };

  // Check if customer already has an existing review for this product
  const existing = await getCustomerProductReview(productId);
  if (existing) {
    let msg = "You have already submitted a review for this product.";
    if (existing.status === 'APPROVED') msg = "You've already reviewed this product.";
    else if (existing.status === 'PENDING') msg = "Your review is awaiting approval.";
    return {
      data: null,
      error: { code: 'DUPLICATE_REVIEW', message: msg, existingReview: existing }
    };
  }

  let displayName = String(authorName || '').trim();
  if (!displayName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .maybeSingle();
    displayName = profile?.full_name?.trim() || '';
  }
  if (!displayName) {
    displayName = session.user.user_metadata?.full_name?.trim() 
      || session.user.user_metadata?.name?.trim() 
      || '';
  }
  if (!displayName && session.user.email) {
    const prefix = session.user.email.split('@')[0];
    displayName = prefix.replace(/[._-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      product_id: productId,
      user_id: session.user.id,
      display_name: displayName || 'Verified Customer',
      rating: Number(rating),
      title: String(title || '').trim().slice(0, 120) || null,
      body: String(body || '').trim()
    })
    .select('id, status, created_at')
    .single();

  if (error) {
    if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('reviews_one_per_customer_product_idx')) {
      const existingAfterRace = await getCustomerProductReview(productId);
      let msg = "You've already submitted a review for this product.";
      if (existingAfterRace?.status === 'APPROVED') msg = "You've already reviewed this product.";
      else if (existingAfterRace?.status === 'PENDING') msg = "Your review is awaiting approval.";
      return {
        data: null,
        error: {
          code: 'DUPLICATE_REVIEW',
          message: msg,
          existingReview: existingAfterRace
        }
      };
    }
  }

  return { data, error };
}

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

export function formatCartMutationError(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;

  const message = error.message || JSON.stringify(error);
  return error.code === 'P0001' && message.includes('currently in stock')
    ? `${message} Please adjust your cart quantity.`
    : message;
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
