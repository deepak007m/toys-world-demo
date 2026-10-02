import { buildWhatsAppLink } from './data.js';

// ── Header ──────────────────────────────────────────────────────────────────
// config: object from getConfig() — pass null to use safe defaults
export function renderHeader(activePage = '', config = null) {
  const waNumber = config?.whatsapp_number || '';
  const waLink = waNumber ? buildWhatsAppLink(waNumber) : '#';
  const instagramUrl = config?.instagram_url || 'https://instagram.com/toys_world48';

  const links = [
    { href: '/', label: 'Home' },
    { href: '/shop.html', label: 'Shop' },
    { href: '/#categories', label: 'Categories' },
    { href: '/#visit', label: 'Visit Store' },
  ];

  const navLinks = links
    .map(l => `<a href="${l.href}" class="nav-link${activePage === l.label ? ' nav-link--active' : ''}">${l.label}</a>`)
    .join('');

  const mobileLinks = links
    .map(l => `<a href="${l.href}">${l.label}</a>`)
    .join('');

  const desktopAuth = `<div id="desktop-auth-container" class="nav" style="margin-left: 2rem;"><a href="/login.html" class="nav-link">Account</a></div>`;
  const mobileAuth = `<div id="mobile-auth-container" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1rem; margin-bottom: 1rem;"><a href="/login.html">Account</a></div>`;

  return `
    <header class="header">
      <div class="container header-inner">
        <a href="/" class="logo">TOYS WORLD<span class="logo-dot"></span></a>

        <nav class="nav">${navLinks} ${desktopAuth}</nav>

        <div class="header-actions">
          <a href="${waLink}" target="_blank" rel="noopener" class="btn btn-dark" style="padding:0.55rem 1.25rem; font-size:0.8rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.94 2c-5.523 0-9.94 4.418-9.94 9.94 0 1.752.458 3.396 1.26 4.824L2 22l5.395-1.297A9.903 9.903 0 0 0 11.94 21.88c5.523 0 9.94-4.418 9.94-9.94S17.463 2 11.94 2zm0 18.16c-1.633 0-3.17-.44-4.494-1.207l-.322-.19-3.205.77.82-3.11-.21-.34A8.13 8.13 0 0 1 3.8 11.94c0-4.495 3.644-8.14 8.14-8.14 4.496 0 8.14 3.645 8.14 8.14 0 4.496-3.644 8.14-8.14 8.14z"/></svg>
            WhatsApp
          </a>
          <button class="hamburger" id="menu-btn" aria-label="Open Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Nav -->
    <div class="mobile-nav" id="mobile-nav">
      <div class="mobile-nav-panel">
        <button class="mobile-nav-close" id="menu-close">✕</button>
        <div class="mobile-nav-links">
          ${mobileAuth}
          ${mobileLinks}
        </div>
        <div style="margin-top:auto; padding-top:2rem;">
          <a href="${waLink}" target="_blank" rel="noopener" class="btn btn-whatsapp" style="width:100%;">Chat on WhatsApp</a>
        </div>
      </div>
    </div>
  `;
}

// ── Footer ──────────────────────────────────────────────────────────────────
// config: object from getConfig() — pass null to use safe defaults
export function renderFooter(config = null) {
  const storeName = config?.store_name || 'TOYS WORLD & GIFT GALLERY';
  const address = config?.address || '';
  const instagramHandle = config?.instagram_handle || '@toys_world48';
  const instagramUrl = config?.instagram_url || 'https://instagram.com/toys_world48';
  const year = new Date().getFullYear();

  return `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-logo">TOYS WORLD<span class="footer-logo-dot"></span></div>
            <p class="footer-tagline">Toys, collectibles, gifts, anime figures, RC cars, die-cast cars and everything in between. Palghar's coolest store.</p>
          </div>
          <div>
            <p class="footer-heading">Quick Links</p>
            <ul class="footer-links">
              <li><a href="/">Home</a></li>
              <li><a href="/shop.html">Shop All</a></li>
              <li><a href="/#categories">Categories</a></li>
              <li><a href="${instagramUrl}" target="_blank" rel="noopener">${instagramHandle}</a></li>
            </ul>
          </div>
          <div>
            <p class="footer-heading">Visit Us</p>
            <p class="footer-address">${address}</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p class="footer-copy">&copy; ${year} ${storeName}.</p>
          <a href="${instagramUrl}" target="_blank" class="footer-ig">${instagramHandle}</a>
        </div>
      </div>
    </footer>
  `;
}

// ── Product Card ─────────────────────────────────────────────────────────────
// Accepts a product row from Supabase. waNumber must be passed by the caller.
export function renderProductCard(product, waNumber = '') {
  const badge = product.badge
    ? `<div class="product-badge">${product.badge}</div>` : '';

  const priceDisplay = typeof product.price === 'number' && product.price !== null
    ? `₹${product.price.toLocaleString('en-IN')}`
    : 'Price on request';

  const categoryName = product.categories?.title || product.category_name || '';
  const waLink = waNumber
    ? buildWhatsAppLink(waNumber, product.name)
    : `https://wa.me/?text=${encodeURIComponent(`Hi! I'm interested in ${product.name} at Toys World Palghar.`)}`;

  return `
    <div class="product-card" onclick="window.location.href='/product.html?id=${product.id}'">
      <div class="product-img-wrap">
        ${badge}
        ${product.image_url
      ? `<img src="${product.image_url}" alt="${product.name}" class="product-img" loading="lazy" />`
      : `<div class="product-img-placeholder"></div>`
    }
      </div>
      <div class="product-body">
        <p class="product-cat">${categoryName}</p>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-desc">${product.short_description || ''}</p>
        <div class="product-footer">
          <span class="product-price">${priceDisplay}</span>
          <a href="${waLink}" target="_blank" rel="noopener"
             class="product-wa-btn" onclick="event.stopPropagation()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.94 2c-5.523 0-9.94 4.418-9.94 9.94 0 1.752.458 3.396 1.26 4.824L2 22l5.395-1.297A9.903 9.903 0 0 0 11.94 21.88c5.523 0 9.94-4.418 9.94-9.94S17.463 2 11.94 2zm0 18.16c-1.633 0-3.17-.44-4.494-1.207l-.322-.19-3.205.77.82-3.11-.21-.34A8.13 8.13 0 0 1 3.8 11.94c0-4.495 3.644-8.14 8.14-8.14 4.496 0 8.14 3.645 8.14 8.14 0 4.496-3.644 8.14-8.14 8.14z"/></svg>
            Ask on WhatsApp
          </a>
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

      const loggedInHTML = `<a href="/account.html" class="nav-link" style="color:var(--accent-gold);">Hi, ${firstName}</a>`;
      const loggedInMobileHTML = `<a href="/account.html" style="color:var(--accent-gold);">Hi, ${firstName}<br><span style="font-size:0.8rem; color:var(--text-secondary); font-weight:normal;">Manage Profile</span></a>`;

      desktopAuth.innerHTML = loggedInHTML;
      mobileAuth.innerHTML = loggedInMobileHTML;
    } else {
      const loggedOutHTML = `<a href="/login.html" class="nav-link">Account</a>`;
      const loggedOutMobileHTML = `<a href="/login.html">Account</a>`;

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
