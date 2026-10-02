import { renderHeader, renderFooter, renderProductCard, wireNavDrawer, wireScrollReveal, mountAuthListener } from './components.js';
import { getFeaturedProducts } from './data.js';
import { supabase } from './supabase.js';

// Setup basic layout
document.addEventListener('DOMContentLoaded', () => {
    // Inject Header and Footer if placeholders exist
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = renderHeader();
    }

    if (footerPlaceholder) {
        footerPlaceholder.innerHTML = renderFooter();
    }

    // Inject Featured Products
    const featuredGrid = document.getElementById('featured-grid');
    if (featuredGrid) {
        const featured = getFeaturedProducts();
        featuredGrid.innerHTML = featured.map(p => renderProductCard(p)).join('');
    }

    // Very simple observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => observer.observe(el));

    // Wire up global nav & animations & auth
    wireNavDrawer();
    wireScrollReveal();
    mountAuthListener(supabase);
});
