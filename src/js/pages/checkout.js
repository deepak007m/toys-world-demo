import { getCartItems } from '../data.js';
import { supabase } from '../supabase.js';
import { wireScrollReveal } from '../components.js';

const elements = {
    form: document.getElementById('checkout-form'),
    formError: document.getElementById('checkout-form-error'),
    state: document.getElementById('checkout-state'),
    sidebarState: document.getElementById('checkout-sidebar-state'),
    addressOptions: document.getElementById('address-options'),
    items: document.getElementById('checkout-items-list'),
    submit: document.getElementById('submit-order'),
    contactEmail: document.getElementById('contact-email'),
    subtotal: document.getElementById('checkout-subtotal'),
    shipping: document.getElementById('checkout-shipping'),
    discount: document.getElementById('checkout-discount'),
    tax: document.getElementById('checkout-tax'),
    total: document.getElementById('checkout-total')
};

const fields = {
    contactName: document.getElementById('contact-name'),
    contactPhone: document.getElementById('contact-phone'),
    shippingFullName: document.getElementById('shipping-full-name'),
    shippingPhone: document.getElementById('shipping-phone'),
    addressLine1: document.getElementById('shipping-address-line1'),
    addressLine2: document.getElementById('shipping-address-line2'),
    city: document.getElementById('shipping-city'),
    state: document.getElementById('shipping-state'),
    postalCode: document.getElementById('shipping-postal-code'),
    saveAddress: document.getElementById('save-address')
};

let session;
let cartItems = [];
let addresses = [];
let orderIdempotencyKey;
let paymentIdempotencyKey;
let currentOrder;
let currentPaymentAttemptId;
let paymentResponse;
let submitting = false;
let selectedAddressId = 'new';

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatAmount(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'Amount unavailable';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(amount);
}

function getProduct(item) {
    return Array.isArray(item.products) ? item.products[0] : item.products;
}

function getCartIssue(item) {
    const product = getProduct(item);
    if (!product) return 'This product is no longer available.';
    if (product.price === null || product.price === undefined) {
        return 'Price unavailable for online checkout.';
    }
    if (!Number.isFinite(Number(product.price))) {
        return 'Price unavailable for online checkout.';
    }
    if (product.availability === 'CONFIRM_ON_WA') {
        return 'This product requires store confirmation.';
    }
    const stockQuantity = Number(product.stock_quantity);
    if (!Number.isFinite(stockQuantity) || stockQuantity <= 0) return 'Currently out of stock.';
    if (Number(item.quantity) > stockQuantity) {
        return `Only ${product.stock_quantity} available.`;
    }
    return null;
}

function setMessage(element, message, type = 'error') {
    element.textContent = message;
    element.className = `checkout-message ${type}`;
    element.hidden = !message;
}

function setFormEnabled(enabled) {
    elements.form.querySelectorAll('input, button, select').forEach(input => {
        input.disabled = !enabled;
    });
    elements.submit.disabled = !enabled || submitting;
}

function populateAddress(address) {
    fields.shippingFullName.value = address?.full_name || '';
    fields.shippingPhone.value = address?.phone || '';
    fields.addressLine1.value = address?.address_line1 || '';
    fields.addressLine2.value = address?.address_line2 || '';
    fields.city.value = address?.city || '';
    fields.state.value = address?.state || '';
    fields.postalCode.value = address?.postal_code || '';
}

function addressText(address) {
    return [
        address.address_line1,
        address.address_line2,
        [address.city, address.state, address.postal_code].filter(Boolean).join(', ')
    ].filter(Boolean).join('\n');
}

function renderAddresses() {
    const options = addresses.map(address => `
        <label class="address-option" data-address-option="${escapeHtml(address.id)}">
            <input type="radio" name="address-choice" value="${escapeHtml(address.id)}">
            <span class="address-option-title">${escapeHtml(address.address_type || 'Saved address')}</span>
            <span class="address-option-details">${escapeHtml(address.full_name)}<br>${escapeHtml(addressText(address))}</span>
        </label>
    `);

    options.push(`
        <label class="address-option" data-address-option="new">
            <input type="radio" name="address-choice" value="new">
            <span class="address-option-title">Use a new address</span>
            <span class="address-option-details">Enter a different delivery address below.</span>
        </label>
    `);

    elements.addressOptions.innerHTML = options.join('');
    elements.addressOptions.querySelectorAll('input[name="address-choice"]').forEach(input => {
        input.addEventListener('change', () => {
            elements.addressOptions.querySelectorAll('.address-option').forEach(option => {
                option.classList.toggle('selected', option.dataset.addressOption === input.value);
            });
            selectedAddressId = input.value;
            fields.saveAddress.checked = false;
            if (input.value === 'new') {
                populateAddress(null);
                fields.shippingFullName.focus();
            } else {
                populateAddress(addresses.find(address => address.id === input.value));
            }
        });
    });

    const initialAddress = addresses.find(address => address.is_default) || addresses[0];
    const initialInput = initialAddress
        ? elements.addressOptions.querySelector(`input[value="${CSS.escape(initialAddress.id)}"]`)
        : elements.addressOptions.querySelector('input[value="new"]');
    if (initialInput) {
        initialInput.checked = true;
        initialInput.dispatchEvent(new Event('change'));
    }
}

function renderCart() {
    const issues = cartItems.map(getCartIssue).filter(Boolean);
    let subtotal = 0;

    elements.items.innerHTML = cartItems.map(item => {
        const product = getProduct(item);
        if (!product) return '';

        const lineTotal = Number(product.price) * Number(item.quantity);
        subtotal += lineTotal;
        const issue = getCartIssue(item);
        return `
            <div class="checkout-item">
                <div style="position:relative;">
                    ${product.image_url
                        ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" class="checkout-item-img">`
                        : '<div class="checkout-item-img" aria-hidden="true"></div>'}
                    <span class="checkout-item-badge">${escapeHtml(item.quantity)}</span>
                </div>
                <div class="checkout-item-details">
                    <div class="checkout-item-name">${escapeHtml(product.name)}</div>
                    <div class="checkout-item-price">${product.price === null || product.price === undefined ? 'Price unavailable' : formatAmount(product.price)}</div>
                    ${issue ? `<span class="checkout-invalid-item">${escapeHtml(issue)}</span>` : ''}
                </div>
                <div class="checkout-item-price">${Number.isFinite(lineTotal) ? formatAmount(lineTotal) : 'Unavailable'}</div>
            </div>
        `;
    }).join('');

    if (cartItems.length === 0) {
        elements.items.innerHTML = '<div class="checkout-items-empty">Your cart is empty.</div>';
    }

    elements.subtotal.textContent = formatAmount(subtotal);
    elements.shipping.textContent = formatAmount(0);
    elements.discount.textContent = formatAmount(0);
    elements.tax.textContent = formatAmount(0);
    elements.total.textContent = formatAmount(subtotal);

    if (issues.length) {
        setMessage(elements.sidebarState, 'Some cart items cannot be purchased online. Please return to your cart and review them.', 'error');
    }
    return issues.length === 0;
}

function errorMessage(error) {
    const message = error?.message || String(error || '');
    const prefixes = [
        'EMPTY_CART',
        'PRICE_UNAVAILABLE',
        'PRODUCT_NOT_PURCHASABLE',
        'PRODUCT_NOT_FOUND',
        'OUT_OF_STOCK',
        'INSUFFICIENT_STOCK',
        'INVALID_CONTACT',
        'INVALID_ADDRESS',
        'AUTH_REQUIRED',
        'ORDER_CREATION_FAILED',
        'PAYMENT_ORDER_UNAVAILABLE',
        'PAYMENT_CHECKOUT_UNAVAILABLE',
        'PAYMENT_CHECKOUT_FAILED',
        'PAYMENT_VERIFICATION_FAILED',
        'RAZORPAY_ORDER_FAILED'
    ];
    const prefix = prefixes.find(value => message.includes(value));
    const messages = {
        EMPTY_CART: 'Your cart is empty. Please add products before checking out.',
        PRICE_UNAVAILABLE: 'Some products no longer have a checkout price. Please review your cart.',
        PRODUCT_NOT_PURCHASABLE: 'Some products require store confirmation and cannot be purchased online.',
        PRODUCT_NOT_FOUND: 'One of the products in your cart is no longer available.',
        OUT_OF_STOCK: 'One or more products are now out of stock. Please review your cart.',
        INSUFFICIENT_STOCK: 'Available stock changed. Please adjust your cart quantity.',
        INVALID_CONTACT: 'Please check your contact name and phone number.',
        INVALID_ADDRESS: 'Please complete the required shipping address fields.',
        AUTH_REQUIRED: 'Your session expired. Please sign in again.',
        ORDER_CREATION_FAILED: 'We could not create your order right now. Please try again.',
        PAYMENT_ORDER_UNAVAILABLE: 'We could not start payment for this order. Please try again.',
        PAYMENT_CHECKOUT_UNAVAILABLE: 'Payment checkout is temporarily unavailable. Please try again later.',
        PAYMENT_CHECKOUT_FAILED: 'We could not open payment checkout. Please try again.',
        PAYMENT_VERIFICATION_FAILED: 'We could not verify your payment yet. Your order remains pending.',
        RAZORPAY_ORDER_FAILED: 'The payment provider rejected the payment request. Please try again.'
    };
    return messages[prefix] || 'We could not create your order right now. Please try again.';
}

function validateForm() {
    const required = [
        fields.contactName,
        fields.contactPhone,
        fields.shippingFullName,
        fields.shippingPhone,
        fields.addressLine1,
        fields.city,
        fields.state,
        fields.postalCode
    ];
    const missing = required.find(field => !field.value.trim());
    if (missing) {
        missing.focus();
        return 'Please complete all required contact and delivery fields.';
    }

    const phones = [fields.contactPhone.value, fields.shippingPhone.value];
    if (phones.some(phone => phone.replace(/\D/g, '').length < 7)) {
        return 'Please enter valid contact and shipping phone numbers.';
    }

    if (cartItems.some(getCartIssue)) {
        return 'Some cart items cannot be purchased online. Please review your cart.';
    }
    return null;
}

async function loadProfile() {
    const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', session.user.id)
        .limit(1);
    if (error) {
        console.error('[Checkout] Profile load failed:', error);
        return;
    }
    const profile = data?.[0];
    if (profile?.full_name) {
        fields.contactName.value = profile.full_name;
        if (!fields.shippingFullName.value) fields.shippingFullName.value = profile.full_name;
    }
    if (profile?.phone) {
        fields.contactPhone.value = profile.phone;
        if (!fields.shippingPhone.value) fields.shippingPhone.value = profile.phone;
    }
}

async function loadAddresses() {
    const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
    if (error) throw error;
    addresses = data || [];
    renderAddresses();
}

async function saveAddress() {
    if (!fields.saveAddress.checked || selectedAddressId !== 'new') return;
    const { error } = await supabase.from('addresses').insert({
        user_id: session.user.id,
        full_name: fields.shippingFullName.value.trim(),
        phone: fields.shippingPhone.value.trim(),
        address_line1: fields.addressLine1.value.trim(),
        address_line2: fields.addressLine2.value.trim() || null,
        city: fields.city.value.trim(),
        state: fields.state.value.trim(),
        postal_code: fields.postalCode.value.trim(),
        address_type: 'Home',
        is_default: addresses.length === 0
    });
    if (error) throw error;
}

function renderPaymentSuccess(order) {
    document.querySelector('.checkout-main').innerHTML = `
        <div class="checkout-success">
            <h1>Payment successful.</h1>
            <p>Your payment has been verified and your order is confirmed.</p>
            <div class="checkout-success-details">
                <div><strong>Order:</strong> ${escapeHtml(order.order_number || order.order_id)}</div>
                <div><strong>Status:</strong> ${escapeHtml(order.status || 'CONFIRMED')}</div>
                <div><strong>Payment:</strong> ${escapeHtml(order.payment_status || 'PAID')}</div>
                <div><strong>Total:</strong> ${formatAmount(order.total_amount)}</div>
            </div>
            <div class="checkout-success-actions">
                <a class="btn btn-gold" href="/orders.html">View My Orders</a>
                <a class="btn btn-outline" href="/shop.html">Continue Shopping</a>
            </div>
        </div>
    `;
    document.querySelector('.checkout-sidebar').hidden = true;
}

function paymentAmountInPaise(amount) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('PAYMENT_ORDER_UNAVAILABLE');
    }
    const paise = Math.round(numericAmount * 100);
    if (!Number.isSafeInteger(paise) || paise <= 0) {
        throw new Error('PAYMENT_ORDER_UNAVAILABLE');
    }
    return paise;
}

async function getFunctionErrorCode(error) {
    const context = error?.context;
    if (!(context instanceof Response)) return null;

    try {
        const body = await context.clone().json();
        return typeof body?.error?.code === 'string' ? body.error.code : null;
    } catch {
        return null;
    }
}

async function createRazorpayOrder(order) {
    if (typeof window.Razorpay !== 'function') {
        throw new Error('PAYMENT_CHECKOUT_UNAVAILABLE');
    }

    if (!paymentIdempotencyKey) paymentIdempotencyKey = crypto.randomUUID();
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
            order_id: order.order_id,
            idempotency_key: paymentIdempotencyKey
        }
    });
    if (error) {
        console.error('[Checkout] Razorpay order creation failed:', error);
        const code = await getFunctionErrorCode(error);
        if (code === 'RAZORPAY_ORDER_FAILED') paymentIdempotencyKey = null;
        throw new Error(code || 'PAYMENT_ORDER_UNAVAILABLE');
    }

    const amount = Number(data?.amount);
    if (!data?.payment_attempt_id
        || !data?.razorpay_order_id
        || !data?.key_id
        || !Number.isFinite(amount)
        || amount <= 0
        || !data?.currency) {
        throw new Error('PAYMENT_ORDER_UNAVAILABLE');
    }

    const options = {
        key: data.key_id,
        amount: paymentAmountInPaise(amount),
        currency: data.currency,
        name: 'Toys World & Gift Gallery',
        description: `Order ${order.order_number || order.order_id}`,
        order_id: data.razorpay_order_id,
        prefill: {
            name: fields.contactName.value.trim(),
            email: session.user.email || '',
            contact: fields.contactPhone.value.trim()
        },
        theme: {
            color: '#E8B84B'
        },
        handler(response) {
            paymentResponse = {
                razorpay_payment_id: response?.razorpay_payment_id || null,
                razorpay_order_id: response?.razorpay_order_id || null,
                razorpay_signature: response?.razorpay_signature || null
            };
            verifyRazorpayPayment(order, data.payment_attempt_id, paymentResponse);
        },
        modal: {
            ondismiss() {
                submitting = false;
                elements.submit.disabled = false;
                elements.submit.textContent = `Pay ${formatAmount(order.total_amount)}`;
                setMessage(elements.state, 'Payment window closed. Your order is still pending. You can try payment again.', 'info');
            }
        }
    };

    try {
        const razorpay = new window.Razorpay(options);
        razorpay.open();
    } catch (error) {
        console.error('[Checkout] Razorpay Checkout initialization failed:', error);
        throw new Error('PAYMENT_CHECKOUT_FAILED');
    }
}

async function verifyRazorpayPayment(order, paymentAttemptId, response) {
    if (!response.razorpay_payment_id
        || !response.razorpay_order_id
        || !response.razorpay_signature) {
        setMessage(elements.formError, 'We could not verify the payment response. Your order remains pending.', 'error');
        submitting = false;
        elements.submit.disabled = false;
        elements.submit.textContent = `Pay ${formatAmount(order.total_amount)}`;
        return;
    }

    setMessage(elements.formError, '');
    setMessage(elements.state, 'Payment response received. Verifying your payment...', 'info');
    try {
        const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
            body: {
                order_id: order.order_id,
                payment_attempt_id: paymentAttemptId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
            }
        });

        if (error || !data?.order_id || data.payment_status !== 'PAID' || data.status !== 'CONFIRMED') {
            console.error('[Checkout] Razorpay payment verification failed:', error?.message ?? 'Invalid verification response');
            throw new Error('PAYMENT_VERIFICATION_FAILED');
        }

        currentPaymentAttemptId = data.payment_attempt_id;
        renderPaymentSuccess({
            order_id: data.order_id,
            order_number: data.order_number,
            status: data.status,
            payment_status: data.payment_status,
            total_amount: order.total_amount
        });
    } catch (error) {
        console.error('[Checkout] Razorpay payment verification failed:', error);
        setMessage(elements.formError, 'We could not verify your payment yet. Your order remains pending. You can try again.', 'error');
        setMessage(elements.state, '');
        submitting = false;
        elements.submit.disabled = false;
        elements.submit.textContent = `Pay ${formatAmount(order.total_amount)}`;
    }
}

async function createOrder() {
    const { data, error } = await supabase.rpc('create_order_from_cart', {
        p_idempotency_key: orderIdempotencyKey,
        p_contact_name: fields.contactName.value.trim(),
        p_contact_phone: fields.contactPhone.value.trim(),
        p_shipping_full_name: fields.shippingFullName.value.trim(),
        p_shipping_phone: fields.shippingPhone.value.trim(),
        p_shipping_address_line1: fields.addressLine1.value.trim(),
        p_shipping_address_line2: fields.addressLine2.value.trim() || null,
        p_shipping_city: fields.city.value.trim(),
        p_shipping_state: fields.state.value.trim(),
        p_shipping_postal_code: fields.postalCode.value.trim()
    });

    if (error) throw error;
    const order = Array.isArray(data) ? data[0] : data;
    if (!order) throw new Error('ORDER_CREATION_FAILED');
    return order;
}

async function submitOrder(event) {
    event.preventDefault();
    if (submitting) return;
    setMessage(elements.formError, '');

    const validationError = currentOrder ? null : validateForm();
    if (validationError) {
        setMessage(elements.formError, validationError);
        return;
    }

    if (!currentOrder && !orderIdempotencyKey) orderIdempotencyKey = crypto.randomUUID();
    submitting = true;
    elements.submit.disabled = true;
    elements.submit.textContent = currentOrder ? 'Starting payment...' : 'Creating order...';
    setMessage(elements.state, currentOrder ? 'Preparing secure payment...' : 'Creating your pending order...', 'info');

    try {
        if (!currentOrder) {
            try {
                await saveAddress();
            } catch (error) {
                console.error('[Checkout] Address save failed:', error);
                throw new Error('ADDRESS_SAVE_FAILED');
            }
            currentOrder = await createOrder();
            orderIdempotencyKey = null;
        }

        await createRazorpayOrder(currentOrder);
    } catch (error) {
        console.error('[Checkout] Checkout payment flow failed:', error);
        setMessage(
            elements.formError,
            error?.message === 'ADDRESS_SAVE_FAILED'
                ? 'We could not save this address. Please try again or continue without saving it.'
                : errorMessage(error)
        );
        setMessage(elements.state, '');
        submitting = false;
        elements.submit.disabled = false;
        elements.submit.textContent = currentOrder ? `Pay ${formatAmount(currentOrder.total_amount)}` : 'Pay securely';
    }
}

async function init() {
    wireScrollReveal();
    setMessage(elements.state, 'Loading your checkout...', 'info');
    setFormEnabled(false);

    const { data: { session: currentSession }, error: authError } = await supabase.auth.getSession();
    if (authError || !currentSession) {
        window.location.replace('/login.html?redirect=/checkout.html');
        return;
    }
    session = currentSession;
    elements.contactEmail.textContent = `Signed in as ${session.user.email || 'your account'}`;
    orderIdempotencyKey = crypto.randomUUID();

    const { data, error } = await getCartItems();
    if (error) {
        console.error('[Checkout] Cart load failed:', error);
        setMessage(elements.state, 'We could not load your cart. Please try again later.');
        return;
    }
    cartItems = data || [];
    const payable = renderCart();
    if (!cartItems.length) {
        setMessage(elements.state, 'Your cart is empty. Please add products before checking out.');
        setFormEnabled(false);
        return;
    }
    if (!payable) {
        setMessage(elements.state, 'Please review your cart. Some items are not available for online checkout.');
        setFormEnabled(false);
    } else {
        setMessage(elements.state, '');
        setFormEnabled(true);
    }

    await Promise.all([loadProfile(), loadAddresses()]);
    elements.form.addEventListener('submit', submitOrder);
}

init().catch(error => {
    console.error('[Checkout] Initialization failed:', error);
    setMessage(elements.state, 'We could not load checkout right now. Please try again later.');
    setFormEnabled(false);
});
