import {
    getConfig, getCategories, getSubcategories, getProducts, buildWhatsAppLink
} from '/src/js/data.js';
import {
    renderHeader, renderFooter, renderProductCard,
    wireNavDrawer, wireScrollReveal, skeletonProductCards,
    mountAuthListener,
} from '/src/js/components.js';
import { supabase } from '/src/js/supabase.js';

// ── State ────────────────────────────────────────────
let currentCategoryId = null;
let currentCategorySlug = 'all';
let currentSubcatId = null;
let waNumber = '';
let allCategories = [];

// ── Skeleton ──────────────────────────────────────────
document.getElementById('shop-grid').innerHTML = skeletonProductCards(8);

// ── Transparent → solid header on scroll ─────────────
window.addEventListener('scroll', () => {
    document.querySelector('.header')?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ── Initial fetch ─────────────────────────────────────
const [config, categories] = await Promise.all([getConfig(), getCategories()]);

waNumber = config?.whatsapp_number || '';
allCategories = categories;

document.getElementById('header-placeholder').innerHTML = renderHeader('Shop', config);
document.getElementById('footer-placeholder').innerHTML = renderFooter(config);
wireNavDrawer();
mountAuthListener(supabase);

// Re-attach scroll on new header
window.addEventListener('scroll', () => {
    document.querySelector('.header')?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });
document.querySelector('.header')?.classList.add('scrolled');

// ── Read category from URL ────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const slugFromUrl = urlParams.get('category') || 'all';
const matchedCat = categories.find(c => c.slug === slugFromUrl);

if (matchedCat) {
    currentCategoryId = matchedCat.id;
    currentCategorySlug = matchedCat.slug;
}

// ── Render category chips ─────────────────────────────
function renderFilterChips() {
    const filtersEl = document.getElementById('filters');
    const chips = [{ id: null, slug: 'all', title: 'All' }, ...allCategories];
    filtersEl.innerHTML = chips.map(c => `
        <button class="filter-chip${currentCategorySlug === c.slug ? ' active' : ''}"
                data-id="${c.id || ''}" data-slug="${c.slug}">
            ${c.title}
        </button>
    `).join('');
}

// ── Render subcategory pills ──────────────────────────
async function renderSubfilterBar(categoryId) {
    const bar = document.getElementById('subfilter-bar');
    const el = document.getElementById('subfilters');
    if (!categoryId) { bar.classList.remove('visible'); el.innerHTML = ''; return; }

    const subcats = await getSubcategories(categoryId);
    if (!subcats.length) { bar.classList.remove('visible'); el.innerHTML = ''; return; }

    bar.classList.add('visible');
    el.innerHTML = [
        `<button class="subfilter-chip${!currentSubcatId ? ' active' : ''}" data-id="">All</button>`,
        ...subcats.map(s =>
            `<button class="subfilter-chip${currentSubcatId === s.id ? ' active' : ''}" data-id="${s.id}">${s.title}</button>`
        )
    ].join('');
}

// ── Render product grid ───────────────────────────────
async function renderProducts() {
    const gridEl = document.getElementById('shop-grid');
    gridEl.innerHTML = skeletonProductCards(8);

    const products = await getProducts({
        categoryId: currentCategoryId || undefined,
        subcategoryId: currentSubcatId || undefined,
    });

    if (!products.length) {
        const waBaseLink = waNumber ? buildWhatsAppLink(waNumber) : '#';
        gridEl.innerHTML = `
            <div class="empty-msg">
                <h3>No Products Yet</h3>
                <p>We're stocking up — visit us in store or ask on WhatsApp!</p>
                <a href="${waBaseLink}" target="_blank" rel="noopener" class="btn btn-whatsapp">
                    💬 Ask on WhatsApp
                </a>
            </div>`;
        return;
    }

    gridEl.innerHTML = products.map(p =>
        renderProductCard(p, waNumber)
    ).join('');
}

// ── Category chip click ───────────────────────────────
document.getElementById('filters').addEventListener('click', async e => {
    const btn = e.target.closest('.filter-chip');
    if (!btn) return;
    currentCategoryId = btn.dataset.id || null;
    currentCategorySlug = btn.dataset.slug;
    currentSubcatId = null;

    const u = new URL(window.location.href);
    currentCategorySlug === 'all' ? u.searchParams.delete('category') : u.searchParams.set('category', currentCategorySlug);
    history.pushState({}, '', u);

    renderFilterChips();
    await renderSubfilterBar(currentCategoryId);
    await renderProducts();
});

// ── Subcategory pill click ────────────────────────────
document.getElementById('subfilter-bar').addEventListener('click', async e => {
    const btn = e.target.closest('.subfilter-chip');
    if (!btn) return;
    currentSubcatId = btn.dataset.id || null;
    document.querySelectorAll('.subfilter-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.id === (currentSubcatId || ''));
    });
    await renderProducts();
});

// ── Initial render ────────────────────────────────────
renderFilterChips();
await renderSubfilterBar(currentCategoryId);
await renderProducts();
wireScrollReveal();
