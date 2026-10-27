import { renderFooter, renderHeader, mountAuthListener, wireNavDrawer, wireScrollReveal } from '../components.js';
import { getConfig } from '../data.js';
import { supabase } from '../supabase.js';

const orderStatusLabels = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled'
};

const paymentStatusLabels = {
    PENDING: 'Payment Pending',
    PAID: 'Paid',
    FAILED: 'Payment Failed',
    REFUNDED: 'Refunded',
    COD_PENDING: 'Cash on Delivery Pending'
};

const orderFields = [
    'id',
    'order_number',
    'status',
    'payment_status',
    'currency',
    'subtotal',
    'shipping_amount',
    'discount_amount',
    'tax_amount',
    'total_amount',
    'contact_name',
    'contact_phone',
    'contact_email',
    'shipping_full_name',
    'shipping_phone',
    'shipping_address_line1',
    'shipping_address_line2',
    'shipping_city',
    'shipping_state',
    'shipping_postal_code',
    'shipping_country',
    'created_at'
].join(', ');

const itemFields = [
    'product_id',
    'product_name',
    'product_image_url',
    'quantity',
    'unit_price',
    'line_total'
].join(', ');

const elements = {
    content: document.getElementById('orders-content'),
    signout: document.getElementById('signout-btn')
};

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function statusLabel(status, labels) {
    return labels[status] || `Unknown (${status || 'Not available'})`;
}

function formatDate(value) {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeZone: 'Asia/Kolkata'
    }).format(date);
}

function formatAmount(value, currency = 'INR') {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'Amount unavailable';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2
    }).format(amount);
}

function getItemSummary(items) {
    if (!items.length) return 'No item details available.';
    const names = items.slice(0, 2).map(item => item.product_name || 'Unnamed item');
    const remaining = items.length - names.length;
    return `${names.join(', ')}${remaining > 0 ? ` and ${remaining} more` : ''}`;
}

function renderAddress(order) {
    const lines = [
        order.shipping_address_line1,
        order.shipping_address_line2,
        [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(', '),
        order.shipping_country
    ].filter(Boolean);

    return `
        <div class="order-address">
            <strong>${escapeHtml(order.shipping_full_name || 'Customer')}</strong><br>
            ${escapeHtml(lines.join('\n'))}<br>
            ${escapeHtml(order.shipping_phone || '')}<br>
            ${escapeHtml(order.contact_email || '')}
        </div>
    `;
}

function renderItems(items, currency) {
    if (!items.length) {
        return '<p class="order-item-info">No item details are available for this order.</p>';
    }

    return `
        <div class="order-item-list">
            ${items.map(item => `
                <div class="order-history-item">
                    ${item.product_image_url
                        ? `<img src="${escapeHtml(item.product_image_url)}" alt="${escapeHtml(item.product_name || 'Order item')}" />`
                        : '<div class="order-history-item-placeholder" aria-hidden="true">📦</div>'}
                    <div class="order-history-item-info">
                        <h4>${escapeHtml(item.product_name || 'Unnamed item')}</h4>
                        <p>Qty: ${escapeHtml(item.quantity)} · Unit price: ${formatAmount(item.unit_price, currency)}</p>
                    </div>
                    <strong>${formatAmount(item.line_total, currency)}</strong>
                </div>
            `).join('')}
        </div>
    `;
}

function renderPriceSummary(order) {
    const currency = order.currency || 'INR';
    return `
        <div class="order-price-summary">
            <div class="order-price-row"><span>Subtotal</span><strong>${formatAmount(order.subtotal, currency)}</strong></div>
            <div class="order-price-row"><span>Shipping</span><strong>${formatAmount(order.shipping_amount, currency)}</strong></div>
            <div class="order-price-row"><span>Discount</span><strong>${formatAmount(order.discount_amount, currency)}</strong></div>
            <div class="order-price-row"><span>Tax</span><strong>${formatAmount(order.tax_amount, currency)}</strong></div>
            <div class="order-price-row total"><span>Total</span><strong>${formatAmount(order.total_amount, currency)}</strong></div>
        </div>
    `;
}

function renderOrder(order, items) {
    const currency = order.currency || 'INR';
    const orderLabel = statusLabel(order.status, orderStatusLabels);
    const paymentLabel = statusLabel(order.payment_status, paymentStatusLabels);

    return `
        <article class="order-card-light" data-order-card="${escapeHtml(order.id)}">
            <div class="order-header-light">
                <div class="order-details" style="display:flex; gap:3rem; flex-wrap:wrap;">
                    <div class="order-meta-col">
                        <span class="order-meta-label">Order date</span>
                        <span class="order-meta-value">${formatDate(order.created_at)}</span>
                    </div>
                    <div class="order-meta-col">
                        <span class="order-meta-label">Total</span>
                        <span class="order-meta-value">${formatAmount(order.total_amount, currency)}</span>
                    </div>
                    <div class="order-meta-col">
                        <span class="order-meta-label">Order #</span>
                        <span class="order-meta-value">${escapeHtml(order.order_number || order.id)}</span>
                    </div>
                </div>
                <button type="button" class="btn btn-outline order-details-toggle" aria-expanded="false">
                    View Details
                </button>
            </div>
            <div class="order-body-light">
                <div class="order-status-badges">
                    <span class="order-status-badge order-status">${escapeHtml(orderLabel)}</span>
                    <span class="order-status-badge payment-status">${escapeHtml(paymentLabel)}</span>
                </div>
                <p class="order-summary-text">${escapeHtml(getItemSummary(items))}</p>
            </div>
            <div class="order-details-panel" hidden>
                <div class="order-details-grid">
                    <div class="order-detail-section">
                        <h3>Items</h3>
                        ${renderItems(items, currency)}
                    </div>
                    <div class="order-detail-section">
                        <h3>Price Summary</h3>
                        ${renderPriceSummary(order)}
                        <h3 style="margin-top:1.5rem;">Shipping Information</h3>
                        ${renderAddress(order)}
                    </div>
                </div>
                <div class="order-detail-section" style="margin-top:2rem;">
                    <h3>Order Information</h3>
                    <p class="order-summary-text">
                        Order ${escapeHtml(order.order_number || order.id)} ·
                        ${escapeHtml(orderLabel)} · ${escapeHtml(paymentLabel)}
                    </p>
                </div>
            </div>
        </article>
    `;
}

async function fetchOrders(userId) {
    const { data, error } = await supabase
        .from('orders')
        .select(orderFields)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    const orders = data || [];
    const ordersWithItems = await Promise.all(orders.map(async order => {
        const { data: items, error: itemError } = await supabase
            .from('order_items')
            .select(itemFields)
            .eq('order_id', order.id)
            .order('created_at', { ascending: true });

        if (itemError) throw itemError;
        return { order, items: items || [] };
    }));

    return ordersWithItems;
}

function renderLoading() {
    elements.content.innerHTML = '<div class="orders-loading-card">Loading your orders...</div>';
}

function renderError() {
    elements.content.innerHTML = `
        <div class="orders-error" role="alert">
            We could not load your orders right now. Please try again later.
        </div>
    `;
}

function renderEmpty() {
    elements.content.innerHTML = `
        <div class="orders-state">
            <h2>No orders yet</h2>
            <p>Your completed purchases will appear here.</p>
            <a class="btn btn-gold" href="/shop.html">Start Shopping</a>
        </div>
    `;
}

function renderOrders(ordersWithItems) {
    elements.content.innerHTML = ordersWithItems
        .map(({ order, items }) => renderOrder(order, items))
        .join('');
}

function wireOrderDetails() {
    elements.content.addEventListener('click', event => {
        const toggle = event.target.closest('.order-details-toggle');
        if (!toggle) return;

        const panel = toggle.closest('[data-order-card]')?.querySelector('.order-details-panel');
        if (!panel) return;

        const isOpen = !panel.hidden;
        panel.hidden = isOpen;
        toggle.setAttribute('aria-expanded', String(!isOpen));
        toggle.textContent = isOpen ? 'View Details' : 'Hide Details';
    });
}

async function init() {
    const config = await getConfig();
    document.getElementById('header-placeholder').innerHTML = renderHeader('Account', config);
    document.getElementById('footer-placeholder').innerHTML = renderFooter(config);
    wireNavDrawer();
    wireScrollReveal();
    mountAuthListener(supabase);
    wireOrderDetails();

    elements.signout?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '/login.html';
    });

    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
        console.error('[Orders] Session check failed:', authError);
        window.location.replace('/login.html?redirect=/orders.html');
        return;
    }

    if (!session) {
        window.location.replace('/login.html?redirect=/orders.html');
        return;
    }

    renderLoading();

    try {
        const ordersWithItems = await fetchOrders(session.user.id);
        if (ordersWithItems.length === 0) {
            renderEmpty();
        } else {
            renderOrders(ordersWithItems);
        }
    } catch (error) {
        console.error('[Orders] Failed to load order history:', error);
        renderError();
    }
}

init().catch(error => {
    console.error('[Orders] Page initialization failed:', error);
    renderError();
});
