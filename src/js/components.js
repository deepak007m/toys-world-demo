import { buildWhatsAppLink } from './data.js';

export function renderHeader(activePage = '', config = null) {
  return `
    <header class="header">
      <div class="container header-inner" style="display:flex; align-items:center; justify-content:space-between; height:var(--header-h);">
        
        <!-- Mobile Menu Toggle -->
        <button class="hamburger" id="menu-btn" aria-label="Open Menu" style="display:none;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>

        <a href="/" class="logo">TOYS WORLD<span class="logo-dot"></span></a>
        
        <nav class="nav" id="desktop-nav">
          <a href="/shop.html" class="nav-link${activePage === 'Shop' ? ' nav-link--active' : ''}">Shop</a>
          <a href="/shop.html#categories" class="nav-link">Categories</a>
          <a href="/shop.html?category=new-arrivals" class="nav-link">New Arrivals</a>
          <a href="/shop.html?category=die-cast" class="nav-link">Hot Wheels</a>
          <a href="/shop.html?category=anime" class="nav-link">Anime</a>
          <a href="/shop.html?category=gifts" class="nav-link">Gifts</a>
        </nav>

        <div class="header-actions" style="display:flex; align-items:center; gap:1.25rem;">
          <a href="/shop.html" class="icon-link" aria-label="Search" id="desktop-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </a>
          <a href="/wishlist.html" class="icon-link" aria-label="Wishlist" id="desktop-wishlist">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </a>
          
          <div id="desktop-auth-container">
            <a href="/login.html" class="icon-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </a>
          </div>

          <a href="/cart.html" class="icon-link" aria-label="Cart" style="position:relative;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            <span class="cart-badge" style="position:absolute; top:-6px; right:-6px; background:var(--accent-gold); color:#000; font-size:0.65rem; font-weight:bold; width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center;">0</span>
          </a>
        </div>
      </div>
      
      <style>
        .icon-link { color: var(--text-primary); transition: color 0.2s; display: flex; align-items: center; }
        .icon-link:hover { color: var(--accent-gold); }
        @media (max-width: 900px) {
          #desktop-nav, #desktop-search, #desktop-wishlist, #desktop-auth-container { display: none; }
          #menu-btn { display: block; border:none; background:transparent; color:#fff; padding:0.5rem; margin-left:-0.5rem; cursor:pointer;}
          .header-inner { gap: 1rem; }
          .logo { font-size: 1.25rem; margin-right: auto; }
        }
      </style>
    </header>

    <!-- Mobile Nav Offcanvas -->
    <div class="mobile-nav" id="mobile-nav">
      <div class="mobile-nav-panel" style="background:var(--bg-elevated); width:85%; max-width:350px; height:100%; padding:2rem; display:flex; flex-direction:column; overflow-y:auto; box-shadow:4px 0 24px rgba(0,0,0,0.5);">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2.5rem;">
          <span class="logo" style="font-size:1.25rem;">MENU</span>
          <button class="mobile-nav-close" id="menu-close" style="background:transparent; border:none; color:#fff; font-size:1.5rem; cursor:pointer;">✕</button>
        </div>
        
        <div class="mobile-search" style="margin-bottom:1.5rem; position:relative;">
          <input type="text" placeholder="Search..." style="width:100%; background:var(--bg-surface); border:1px solid rgba(255,255,255,0.06); color:#fff; padding:1rem 1rem 1rem 3rem; border-radius:var(--radius-md); font-family:var(--font-sans);"/>
          <svg style="position:absolute; left:1rem; top:50%; transform:translateY(-50%); color:var(--text-muted);" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        
        <div id="mobile-auth-container" style="border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 2rem; margin-bottom: 2rem;">
          <a href="/login.html" class="btn btn-outline" style="width:100%; text-align:center;">Sign In / Register</a>
        </div>
        
        <div class="mobile-nav-links" style="display:flex; flex-direction:column; gap:1.25rem; font-size:1.15rem; font-family:var(--font-heading); text-transform:uppercase; font-weight:800; letter-spacing:0.04em;">
          <a href="/" style="color:var(--text-primary); text-decoration:none;">Home</a>
          <a href="/shop.html" style="color:var(--text-primary); text-decoration:none;">Shop All</a>
          <a href="/shop.html#categories" style="color:var(--text-primary); text-decoration:none;">Categories</a>
          <a href="/shop.html?category=new-arrivals" style="color:var(--text-primary); text-decoration:none;">New Arrivals</a>
          <a href="/shop.html?category=die-cast" style="color:var(--text-primary); text-decoration:none;">Die-Cast</a>
          <a href="/shop.html?category=anime" style="color:var(--text-primary); text-decoration:none;">Anime Figures</a>
          <a href="/wishlist.html" style="color:var(--text-primary); text-decoration:none;">My Wishlist</a>
        </div>
      </div>
    </div>
  `;
}

export function renderFooter(config = null) {
  const storeName = config?.store_name || 'TOYS WORLD & GIFT GALLERY';
  const address = config?.address || 'Palghar, Maharashtra, India';
  const instagramHandle = config?.instagram_handle || '@toys_world48';
  const instagramUrl = config?.instagram_url || 'https://instagram.com/toys_world48';
  const year = new Date().getFullYear();

  return `
    <footer class="footer" style="background:var(--bg-primary); border-top:1px solid rgba(255,255,255,0.06); padding:5rem 0 3rem;">
      <div class="container">
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:3rem; margin-bottom:4rem;">
          
          <div style="grid-column: 1 / -1; max-width:400px;">
            <div class="logo" style="margin-bottom:1rem; font-size:1.5rem;">TOYS WORLD<span class="logo-dot"></span></div>
            <p style="color:var(--text-secondary); line-height:1.7; font-size:0.95rem;">
              Premium anime figures, die-cast collectibles, RC cars, and exclusive gifts. Your collector's paradise built for enthusiasts.
            </p>
          </div>

          <div>
            <p style="font-family:var(--font-heading); font-weight:800; font-size:0.875rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-primary); margin-bottom:1.5rem;">Shop</p>
            <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:1rem; font-size:0.95rem;">
              <li><a href="/shop.html" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">All Products</a></li>
              <li><a href="/shop.html#categories" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">Categories</a></li>
              <li><a href="/shop.html?category=new-arrivals" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">New Arrivals</a></li>
              <li><a href="/shop.html?category=die-cast" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">Die-Cast</a></li>
              <li><a href="/shop.html?category=anime" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">Anime</a></li>
            </ul>
          </div>
          
          <div>
            <p style="font-family:var(--font-heading); font-weight:800; font-size:0.875rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-primary); margin-bottom:1.5rem;">Customer Care</p>
            <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:1rem; font-size:0.95rem;">
              <li><a href="/account.html" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">My Account</a></li>
              <li><a href="/orders.html" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">Track Order</a></li>
              <li><a href="/faq.html" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">FAQ</a></li>
              <li><a href="/shipping.html" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">Shipping Info</a></li>
              <li><a href="/returns.html" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">Returns Policy</a></li>
            </ul>
          </div>

          <div>
            <p style="font-family:var(--font-heading); font-weight:800; font-size:0.875rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-primary); margin-bottom:1.5rem;">About Us</p>
            <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:1rem; font-size:0.95rem;">
              <li><a href="/about.html" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">Our Story</a></li>
              <li><a href="/contact.html" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">Contact Us</a></li>
              <li><a href="/#visit" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">Visit Store</a></li>
              <li><a href="${instagramUrl}" target="_blank" rel="noopener" style="color:var(--text-secondary); text-decoration:none; transition:color 0.2s;">${instagramHandle}</a></li>
            </ul>
          </div>
          
        </div>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top:2.5rem; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:2rem;">
          <p style="color:var(--text-muted); font-size:0.875rem; margin:0;">&copy; ${year} ${storeName}. All rights reserved.</p>
          <div style="display:flex; gap:2rem; font-size:0.875rem;">
            <a href="/privacy.html" style="color:var(--text-muted); text-decoration:none; transition:color 0.2s;">Privacy Policy</a>
            <a href="/terms.html" style="color:var(--text-muted); text-decoration:none; transition:color 0.2s;">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  `;
}

export function renderProductCard(product, waNumber = '') {
  const badge = product.badge
    ? `<div class="product-badge">${product.badge}</div>` : '';

  const priceDisplay = typeof product.price === 'number' && product.price !== null
    ? `₹${product.price.toLocaleString('en-IN')}`
    : 'Price on request';

  const categoryName = product.categories?.title || product.category_name || '';

  // Generating completely static wishlist and cart button structures in HTML
  return `
    <div class="product-card" onclick="window.location.href='/product.html?id=${product.id}'" style="cursor:pointer;">
      <div class="product-img-wrap" style="position:relative;">
        ${badge}
        <button class="wishlist-btn-corner" aria-label="Add to wishlist" onclick="event.stopPropagation(); this.classList.toggle('active');" style="position:absolute; top:12px; right:12px; z-index:10; background:rgba(13,13,15,0.6); border:1px solid rgba(255,255,255,0.1); width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer; backdrop-filter:blur(8px); transition:all 0.2s;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="heart-icon"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" stroke="currentColor" stroke-width="2"/></svg>
        </button>
        ${product.image_url
      ? `<img src="${product.image_url}" alt="${product.name}" class="product-img" loading="lazy" />`
      : `<div class="product-img-placeholder"></div>`
    }
      </div>
      <div class="product-body" style="padding:1.5rem; display:flex; flex-direction:column;">
        <p class="product-cat" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:0.5rem;">${categoryName}</p>
        <h3 class="product-name" style="font-size:1.1rem; font-weight:700; margin-bottom:1rem; line-height:1.4;">${product.name}</h3>
        
        <div class="product-footer" style="display:flex; flex-direction:column; gap:1.25rem; margin-top:auto;">
          <span class="product-price" style="font-size:1.25rem; font-weight:800; color:var(--text-primary);">${priceDisplay}</span>
          <button class="btn btn-outline product-add-btn" onclick="event.stopPropagation(); window.location.href='/cart.html'" style="width:100%; padding:0.75rem; font-size:0.875rem;">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Category Card ─────────────────────────────────────────────────────────────
export function renderCategoryCard(cat) {
  // Support both Supabase column names (slug, title, description, image_url, color_accent)
  // and the old static shape (id, title, desc, image, accent) for rollback compatibility.
  const slug = cat.slug || cat.id;
  const title = cat.title;
  const desc = cat.description || cat.desc || '';
  const image = cat.image_url || cat.image || '';
  const accent = cat.color_accent || cat.accent || '#FFD600';

  const bgStyle = image
    ? `background-image:url('${image}')`
    : `background:${accent}22`;  // light tint fallback when no image

  return `
    <div class="cat-card" onclick="window.location.href='/shop.html?category=${slug}'" role="button" tabindex="0">
      <div class="cat-card-bg" style="${bgStyle}"></div>
      <div class="cat-overlay"></div>
      <div class="cat-body">
        <div>
          <h3 class="cat-title">${title}</h3>
          <p class="cat-desc">${desc}</p>
        </div>
        <div class="cat-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  `;
}

// ── Review Card ──────────────────────────────────────────────────────────────
export function renderReviewCard(review) {
  return `
    <div class="review-card">
      <div class="review-stars">${'★'.repeat(review.rating)}</div>
      <p class="review-text">"${review.text}"</p>
      <div class="review-source">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        Verified Google Review
      </div>
    </div>
  `;
}

// ── Shared mobile nav wiring ──────────────────────────────────────────────────
// Call once after renderHeader() to attach open/close listeners.
export function wireNavDrawer() {
  const menuBtn = document.getElementById('menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const closeBtn = document.getElementById('menu-close');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => mobileNav.classList.add('open'));
    closeBtn.addEventListener('click', () => mobileNav.classList.remove('open'));
    mobileNav.addEventListener('click', e => {
      if (e.target === mobileNav) mobileNav.classList.remove('open');
    });
  }
}

export function mountAuthListener(supabase) {
  const updateAuthUI = async (session) => {
    const desktopAuth = document.getElementById('desktop-auth-container');
    const mobileAuth = document.getElementById('mobile-auth-container');

    if (!desktopAuth || !mobileAuth) return;

    if (session) {
      // Safe fallback if profile fetch fails or trigger hasn't fired yet
      let firstName = 'Account';
      try {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).limit(1);
        if (data && data.length > 0 && data[0].full_name) {
          firstName = data[0].full_name.split(' ')[0];
        } else if (session.user.user_metadata?.full_name) {
          firstName = session.user.user_metadata.full_name.split(' ')[0];
        }
      } catch (e) {
        console.error(e);
      }

      const loggedInHTML = `<a href="/account.html" class="nav-link" style="color:var(--accent-gold); font-size:0.875rem; text-transform:uppercase; font-weight:800; letter-spacing:0.04em;">${firstName}</a>`;
      const loggedInMobileHTML = `<a href="/account.html" class="btn btn-gold" style="width:100%; text-align:center;">Hi, ${firstName} <span>→</span></a>`;

      desktopAuth.innerHTML = loggedInHTML;
      mobileAuth.innerHTML = loggedInMobileHTML;
    } else {
      const loggedOutHTML = `<a href="/login.html" class="icon-link"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></a>`;
      const loggedOutMobileHTML = `<a href="/login.html" class="btn btn-outline" style="width:100%; text-align:center;">Sign In / Register</a>`;

      desktopAuth.innerHTML = loggedOutHTML;
      mobileAuth.innerHTML = loggedOutMobileHTML;
    }
  };

  supabase.auth.getSession().then(({ data: { session } }) => updateAuthUI(session));
  supabase.auth.onAuthStateChange((_event, session) => updateAuthUI(session));
}

// ── Scroll reveal observer ────────────────────────────────────────────────────
export function wireScrollReveal() {
  const io = new IntersectionObserver(
    (entries, obs) => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    }),
    { threshold: 0.08 }
  );
  document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right, .scale-in').forEach(el => io.observe(el));
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────
export function skeletonProductCards(count = 4) {
  return Array.from({ length: count }, () => `
    <div class="product-card skeleton-card">
      <div class="skeleton-img"></div>
      <div class="product-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line medium"></div>
      </div>
    </div>
  `).join('');
}

export function skeletonCategoryCards(count = 6) {
  return Array.from({ length: count }, () => `
    <div class="cat-card skeleton-card">
      <div class="skeleton-cat-bg"></div>
    </div>
  `).join('');
}
