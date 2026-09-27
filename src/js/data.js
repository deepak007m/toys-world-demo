/**
 * Toys World & Gift Gallery — Core Data
 * ======================================
 * IMPORTANT: Replace placeholder image paths and demo data with real store assets before going live.
 * All prices, names, and availability below are DEMO DATA and must be confirmed by the store owner.
 * Image paths reference /public/images/ — swap with real high-resolution photos when available.
 * WhatsApp number is a PLACEHOLDER — update STORE_WHATSAPP_NUMBER before launch.
 */

// ─── Store Configuration ─────────────────────────────────────────────────────
export const config = {
  storeName: "TOYS WORLD & GIFT GALLERY",

  // TODO: Replace with the real WhatsApp number (with country code, no + or spaces)
  // Example: "919876543210" for +91 98765 43210
  STORE_WHATSAPP_NUMBER: "910000000000",   // ← REPLACE THIS

  address: "Manor Highway Road, opposite Holy Spirit High School, near Royal Enfield showroom, Tembhode/Mahim, Palghar, Maharashtra 401404",
  mapLink: "https://maps.google.com/?q=Toys+World+Gift+Gallery+Palghar+Manor+Highway+Road",

  // TODO: Replace with real phone number
  phone: null,   // ← REPLACE WITH ACTUAL NUMBER e.g. "+919876543210"

  instagram: "@toys_world48",
  instagramUrl: "https://instagram.com/toys_world48",

  // Hero / store images — ACTUAL Toys World store photography
  heroImage: "/images/real_store_exterior.png",          // Real store facade
  storeInteriorImage: "/images/real_store_interior.png", // Real store interior
};

// ─── WhatsApp Helper ─────────────────────────────────────────────────────────
export function buildWhatsAppLink(productName) {
  const msg = productName
    ? `Hi! I'm interested in *${productName}* from Toys World & Gift Gallery, Palghar. Is it currently available?`
    : `Hi Toys World & Gift Gallery! I'd like to know more about your products.`;
  return `https://wa.me/${config.STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// ─── Reviews (real-sentiment, no fabricated names/dates) ─────────────────────
export const reviews = [
  {
    id: 1,
    text: "Amazing variety of toys at genuine prices. Best shop in Palghar for collectibles — Hot Wheels, anime figures, everything!",
    rating: 5,
  },
  {
    id: 2,
    text: "Love this place! Found an incredible soft toy collection and the staff was super helpful. Will come back again.",
    rating: 5,
  },
  {
    id: 3,
    text: "You never know what you'll find here — it's like a treasure hunt every time. Prices are very reasonable.",
    rating: 5,
  },
];

// ─── Categories ───────────────────────────────────────────────────────────────
// Replace `image` paths with actual category showcase photos from the store
export const categories = [
  {
    id: "anime",
    title: "ANIME",
    desc: "Figures · Collectibles",
    image: "/images/cat_anime.png",  // Replace with real store anime shelf photo
    accent: "#2d9cdb",
  },
  {
    id: "die-cast",
    title: "DIE-CAST",
    desc: "Hot Wheels · Mini Cars",
    image: "/images/real_store_shelf.png",  // REAL: store shelf with Hot Wheels
    accent: "#eb5757",
  },
  {
    id: "rc-racing",
    title: "RC & RACING",
    desc: "RC Cars · Racing Toys",
    image: "/images/cat_rc.png",  // Replace with real RC product photo
    accent: "#FFD600",
  },
  {
    id: "plush",
    title: "PLUSH",
    desc: "Soft · Cute · Giftable",
    image: "/images/cat_plush.png",  // Replace with real plush shelf photo
    accent: "#9b51e0",
  },
  {
    id: "figures",
    title: "FIGURES",
    desc: "Heroes · Characters · Collectibles",
    image: "/images/real_spiderman.png",  // REAL: Spider-Man figure from store
    accent: "#111111",
  },
  {
    id: "gifts",
    title: "GIFTS & MORE",
    desc: "Something for everyone",
    image: "/images/real_store_shelf.png",  // REAL: store shelf with mixed gifts
    accent: "#f87316",
  },
];

// ─── Products ─────────────────────────────────────────────────────────────────
// ALL prices, names, and availability below are DEMO DATA.
// Replace with confirmed real products from the store owner.
// `image` paths should swap with actual high-res product photos.
export const products = [
  {
    id: "p1",
    name: "Mini Alloy 1:64 Scale Die-Cast",    // DEMO NAME — confirm with owner
    categoryId: "die-cast",
    categoryName: "Die-Cast",
    price: 'Price on request',
    availability: 'Confirm on WhatsApp',
    badge: "POPULAR",
    shortDesc: "Premium 1:64 scale collectible",
    description:
      "A highly detailed 1:64 scale die-cast model — perfect for collectors. Features precise detailing, realistic wheels and an authentic paint finish. Available now at Toys World, Palghar.",
    image: "/images/real_mini_gt.png",        // REAL: actual Mini Alloy die-cast from store
  },
  {
    id: "p2",
    name: "Anime Battle Figure",              // DEMO NAME
    categoryId: "anime",
    categoryName: "Anime",
    price: 'Price on request',
    availability: 'Confirm on WhatsApp',
    badge: "TRENDING",
    shortDesc: "High-quality anime collectible",
    description:
      "Premium anime-style collectible figure with dynamic pose and rich painted details. Great for display or gifting.",
    image: "/images/prod_anime.png",          // SWAP with real product photo
  },
  {
    id: "p3",
    name: "Off-Road RC Buggy",                // DEMO NAME
    categoryId: "rc-racing",
    categoryName: "RC & Racing",
    price: 'Price on request',
    availability: 'Confirm on WhatsApp',
    badge: "NEW",
    shortDesc: "Fast all-terrain remote control",
    description:
      "Powerful RC buggy built for indoor and outdoor terrain. Rechargeable battery, sturdy build, hours of fun.",
    image: "/images/prod_rc.png",             // SWAP with real product photo
  },
  {
    id: "p4",
    name: "Spider-Man Action Figure",         // DEMO NAME — confirm with owner
    categoryId: "figures",
    categoryName: "Figures",
    price: 'Price on request',
    availability: 'Confirm on WhatsApp',
    badge: "",
    shortDesc: "Articulated superhero collectible",
    description:
      "Highly detailed Spider-Man action figure with articulated joints. Suitable for play or premium shelf display. A great Marvel collectible available at Toys World, Palghar.",
    image: "/images/real_spiderman.png",      // REAL: actual Spider-Man figure from store
  },
  {
    id: "p5",
    name: "Giant Teddy Bear",                 // DEMO NAME
    categoryId: "plush",
    categoryName: "Plush",
    price: 'Price on request',
    availability: 'Confirm on WhatsApp',
    badge: "BEST GIFT",
    shortDesc: "Super soft cuddly bear",
    description:
      "A large, super-soft plush teddy bear made with premium materials. Perfect as a birthday gift or for young children.",
    image: "/images/prod_plush.png",          // SWAP with real product photo
  },
  {
    id: "p6",
    name: "Hot Wheels Blind Bag",             // DEMO NAME — confirm with owner
    categoryId: "die-cast",
    categoryName: "Die-Cast",
    price: 'Price on request',
    availability: 'Confirm on WhatsApp',
    badge: "POPULAR",
    shortDesc: "Surprise die-cast car pack",
    description:
      "A curated selection of exclusive Hot Wheels models from our store shelves. Highly sought after by die-cast collectors.",
    image: "/images/real_store_shelf.png",    // REAL: store shelf with Hot Wheels blind bags
  },
  {
    id: "p7",
    name: "Keychains & Gift Items",           // DEMO NAME — confirm with owner
    categoryId: "gifts",
    categoryName: "Gifts & More",
    price: 'Price on request',
    availability: 'Confirm on WhatsApp',
    badge: "",
    shortDesc: "Cute keychains & novelty gifts",
    description:
      "A curated selection of keychains, novelty items, and unique gifts available in our store. Great for birthdays and special occasions.",
    image: "/images/real_store_shelf.png",    // REAL: actual store shelf with keychains/gifts
  },
  {
    id: "p8",
    name: "Demon Slayer Collectible",         // DEMO NAME
    categoryId: "anime",
    categoryName: "Anime",
    price: 'Price on request',
    availability: 'Confirm on WhatsApp',
    badge: "NEW",
    shortDesc: "Detailed character figure",
    description:
      "Premium Demon Slayer-style anime collectible with incredible sculpt detailing. Perfect for display or gifting to anime fans.",
    image: "/images/cat_anime.png",           // SWAP with real product photo (reusing cat img as fallback)
  },
];

// ─── Data Helpers ─────────────────────────────────────────────────────────────
export function getProductById(id) {
  return products.find((p) => p.id === id);
}

export function getFeaturedProducts(count = 4) {
  return products.slice(0, count);
}

export function getProductsByCategory(catId) {
  if (!catId || catId === "all") return products;
  return products.filter((p) => p.categoryId === catId);
}
