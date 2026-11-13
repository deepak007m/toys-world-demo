import { getProductById, getConfig, buildProductWhatsAppLink, trackWhatsAppEnquiry, trackProductView, getProductReviews, submitProductReview, getCustomerProductReview } from '/src/js/data.js';
import { getAvailabilityLabel, getProductAvailability } from '/src/js/inventory.js';
import { renderHeader, renderFooter, wireNavDrawer, wireScrollReveal, mountAuthListener, wireStoreActions } from '/src/js/components.js';
import { supabase } from '/src/js/supabase.js';

// ── Load config and product in parallel ──────────────────────────────
const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

const [config, product] = await Promise.all([
    getConfig(),
    getProductById(productId),
]);

const waNumber = config?.whatsapp_number || '';

document.getElementById('header-placeholder').innerHTML = renderHeader('Shop', config);
document.getElementById('footer-placeholder').innerHTML = renderFooter(config);
wireNavDrawer();

if (!product) {
    document.getElementById('pd-error').style.display = 'block';
    document.title = 'Not Found — Toys World';
} else {
    trackProductView(product.id);
    const el = document.getElementById('pd-content');
    el.style.display = 'block';
    document.title = `${product.name} — Toys World`;

    // Image
    const imgEl = document.getElementById('pd-img');
    if (product.image_url) {
        imgEl.src = product.image_url;
        imgEl.alt = product.name;
    } else {
        imgEl.closest('.pd-img-wrap').innerHTML = '<div class="product-img-placeholder" style="width:100%;height:100%;"></div>';
    }

    // Category name (nested join from Supabase)
    const catName = product.categories?.title || '';
    document.getElementById('pd-cat').textContent = catName;

    // Title & description
    document.getElementById('pd-title').textContent = product.name;
    document.getElementById('pd-desc').textContent = product.long_description || product.short_description || '';

    const reviewData = await getProductReviews(product.id);
    const averageEl = document.getElementById('reviews-average');
    const countEl = document.getElementById('reviews-count');
    const listEl = document.getElementById('reviews-list');
    const emptyEl = document.getElementById('reviews-empty');
    const escapeReviewText = value => String(value || '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
    averageEl.textContent = reviewData.count ? `${reviewData.average.toFixed(1)} / 5` : 'No ratings yet';
    countEl.textContent = reviewData.count ? `(${reviewData.count} review${reviewData.count === 1 ? '' : 's'})` : '';
    emptyEl.hidden = reviewData.count > 0;
    listEl.innerHTML = reviewData.reviews.map(review => {
        const reviewerName = review.display_name && review.display_name !== 'Customer'
            ? review.display_name
            : 'Verified Customer';
        return `
        <article style="border-top:1px solid rgba(255,255,255,0.07); padding-top:0.85rem;">
            <div style="display:flex; justify-content:space-between; gap:1rem;">
                <strong>${escapeReviewText(reviewerName)}</strong>
                <span style="color:var(--accent-gold);">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
            </div>
            ${review.title ? `<h4 style="margin-top:0.35rem;">${escapeReviewText(review.title)}</h4>` : ''}
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.35rem;">${escapeReviewText(review.body)}</p>
        </article>
    `;
    }).join('');

    const reviewForm = document.getElementById('review-form');
    const reviewSignin = document.getElementById('review-signin');
    const userReviewStatus = document.getElementById('user-review-status');

    function renderUserReviewState(existingReview) {
        if (!existingReview) {
            if (userReviewStatus) {
                userReviewStatus.style.display = 'none';
                userReviewStatus.innerHTML = '';
            }
            if (reviewForm) reviewForm.style.display = 'block';
            return;
        }

        // Existing review present -> Do not display submission form
        if (reviewForm) reviewForm.style.display = 'none';
        if (!userReviewStatus) return;

        userReviewStatus.style.display = 'block';

        if (existingReview.status === 'APPROVED') {
            userReviewStatus.innerHTML = `
                <div class="user-review-box" style="background:var(--bg-elevated); border:1px solid rgba(16,185,129,0.3); border-radius:var(--radius-md); padding:1.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                        <span style="background:rgba(16,185,129,0.15); color:#6EE7B7; border:1px solid rgba(16,185,129,0.3); font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:9999px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">
                            ✓ You've already reviewed this product.
                        </span>
                        <span style="color:var(--accent-gold); font-size:0.95rem;">${'★'.repeat(existingReview.rating)}${'☆'.repeat(5 - existingReview.rating)}</span>
                    </div>
                    ${existingReview.title ? `<h4 style="margin-bottom:0.35rem; font-size:0.95rem;">${escapeReviewText(existingReview.title)}</h4>` : ''}
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin:0;">${escapeReviewText(existingReview.body)}</p>
                </div>
            `;
        } else if (existingReview.status === 'PENDING') {
            const dateStr = existingReview.created_at ? new Date(existingReview.created_at).toLocaleDateString() : '';
            userReviewStatus.innerHTML = `
                <div class="user-review-box" style="background:var(--bg-elevated); border:1px solid rgba(245,158,11,0.3); border-radius:var(--radius-md); padding:1.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                        <span style="background:rgba(245,158,11,0.15); color:#FCD34D; border:1px solid rgba(245,158,11,0.3); font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:9999px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">
                            ⏳ Your review is awaiting approval.
                        </span>
                        <span style="color:var(--accent-gold); font-size:0.95rem;">${'★'.repeat(existingReview.rating)}${'☆'.repeat(5 - existingReview.rating)}</span>
                    </div>
                    ${existingReview.title ? `<h4 style="margin-bottom:0.35rem; font-size:0.95rem;">${escapeReviewText(existingReview.title)}</h4>` : ''}
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin:0;">${escapeReviewText(existingReview.body)}</p>
                    ${dateStr ? `<p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; margin-bottom:0;">Submitted on ${dateStr}. It will appear publicly once approved by our moderation team.</p>` : ''}
                </div>
            `;
        } else if (existingReview.status === 'REJECTED') {
            const rawDigits = String(waNumber || '919272040160').replace(/\D/g, '');
            const waClean = rawDigits.length === 10 ? `91${rawDigits}` : (rawDigits || '919272040160');
            const waHref = `https://wa.me/${waClean}?text=${encodeURIComponent(`Hello Toys World, I have a query regarding my review for ${product.name}.`)}`;
            userReviewStatus.innerHTML = `
                <div class="user-review-box" style="background:var(--bg-elevated); border:1px solid rgba(239,68,68,0.3); border-radius:var(--radius-md); padding:1.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                        <span style="background:rgba(239,68,68,0.15); color:#FCA5A5; border:1px solid rgba(239,68,68,0.3); font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:9999px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">
                            ✕ Review not approved
                        </span>
                    </div>
                    ${existingReview.title ? `<h4 style="margin-bottom:0.35rem; font-size:0.95rem; color:var(--text-secondary);">${escapeReviewText(existingReview.title)}</h4>` : ''}
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.75rem;">${escapeReviewText(existingReview.body)}</p>
                    <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
                        This review did not meet our moderation guidelines. If you have questions or need assistance, please <a href="${waHref}" target="_blank" rel="noopener" style="color:var(--accent-gold); text-decoration:underline;">contact us on WhatsApp</a>.
                    </p>
                </div>
            `;
        }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        if (reviewForm) reviewForm.style.display = 'none';
        if (userReviewStatus) userReviewStatus.style.display = 'none';
        if (reviewSignin) reviewSignin.style.display = 'block';
    } else {
        if (reviewSignin) reviewSignin.style.display = 'none';
        const existingReview = await getCustomerProductReview(product.id);
        renderUserReviewState(existingReview);

        if (!existingReview) {
            let name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
            if (!name) {
                const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
                name = prof?.full_name || '';
            }
            if (!name && session.user.email) {
                const prefix = session.user.email.split('@')[0];
                name = prefix.replace(/[._-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
            }
            const nameInput = document.getElementById('review-name');
            if (nameInput && name) nameInput.value = name;
        }
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const message = document.getElementById('review-message');
            const button = event.currentTarget.querySelector('button[type="submit"]');
            if (button) {
                button.disabled = true;
                button.textContent = 'Submitting...';
            }

            const result = await submitProductReview({
                productId: product.id,
                authorName: document.getElementById('review-name')?.value,
                rating: document.getElementById('review-rating').value,
                title: document.getElementById('review-title').value,
                body: document.getElementById('review-body').value
            });

            if (result.error) {
                message.textContent = result.error.message || 'Could not submit review.';
                message.style.color = '#f87171';
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Submit for approval';
                }

                if (result.error.code === 'DUPLICATE_REVIEW') {
                    const currentReview = result.error.existingReview || await getCustomerProductReview(product.id);
                    if (currentReview) {
                        setTimeout(() => renderUserReviewState(currentReview), 1000);
                    }
                }
            } else {
                message.textContent = 'Thanks! Your review is awaiting approval.';
                message.style.color = '#4ade80';
                event.currentTarget.reset();
                const freshReview = await getCustomerProductReview(product.id);
                setTimeout(() => {
                    renderUserReviewState(freshReview || result.data || { status: 'PENDING' });
                }, 800);
            }
        });
    }

    // Price
    const priceEl = document.getElementById('pd-price');
    priceEl.textContent = (typeof product.price === 'number' && product.price !== null)
        ? `₹${product.price.toLocaleString('en-IN')}`
        : 'Price on request';

    // Availability — map DB enum to display text + CSS class
    const availability = getProductAvailability(product);
    const avail = {
        label: getAvailabilityLabel(availability),
        cls: availability === 'OUT_OF_STOCK' ? 'out' : 'in',
    };
    document.getElementById('pd-avail-text').textContent = avail.label;
    const avEl = document.getElementById('pd-avail');
    avEl.classList.remove('in', 'limited', 'out');
    avEl.classList.add(avail.cls);

    // WhatsApp link
    const pdWaLink = document.getElementById('pd-wa-link');
    const updateWhatsAppLink = () => {
        pdWaLink.href = buildProductWhatsAppLink(waNumber, product, 1);
    };
    pdWaLink.addEventListener('click', () => trackWhatsAppEnquiry(
        product.id,
        'product',
        1
    ));

    // Badge
    if (product.badge) {
        const b = document.getElementById('pd-badge-el');
        b.style.display = 'block';
        b.textContent = product.badge;
    }
    updateWhatsAppLink();
}

mountAuthListener(supabase);
wireStoreActions(supabase);
wireScrollReveal();
