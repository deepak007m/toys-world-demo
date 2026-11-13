import { supabase } from '../../js/supabase.js';
import { getProductAvailability } from '../../js/inventory.js';

// --- Dashboard Stats ---
export async function getDashboardStats() {
    const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('id, is_featured, availability, stock_quantity'),
        supabase.from('categories').select('id', { count: 'exact' })
    ]);

    if (productsRes.error) throw productsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    const products = productsRes.data || [];
    return {
        totalProducts: products.length,
        featuredProducts: products.filter(p => Boolean(p.is_featured)).length,
        totalCategories: categoriesRes.count ?? categoriesRes.data?.length ?? 0,
        availableProducts: products.filter(p => getProductAvailability(p) === 'IN_STOCK').length,
        outOfStock: products.filter(p => getProductAvailability(p) === 'OUT_OF_STOCK').length
    };
}

export async function getRecentProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, price, availability, stock_quantity, image_url, created_at, categories(title)')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) throw error;
    return data || [];
}

export async function getDashboardAnalytics() {
    const [ordersRes, enquiriesRes] = await Promise.all([
        supabase.from('orders').select('total_amount, status, payment_status, created_at'),
        supabase.from('whatsapp_enquiries').select('source, product_id, created_at')
    ]);

    if (ordersRes.error) throw ordersRes.error;
    if (enquiriesRes.error) throw enquiriesRes.error;

    const orders = ordersRes.data || [];
    const enquiries = enquiriesRes.data || [];
    const paidOrders = orders.filter(order => order.payment_status === 'PAID' || order.payment_status === 'COD_PENDING');
    const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const pendingOrders = orders.filter(order => !['DELIVERED', 'CANCELLED'].includes(order.status)).length;
    return {
        orderCount: orders.length,
        revenue,
        pendingOrders,
        enquiryCount: enquiries.length,
        productEnquiries: enquiries.filter(enquiry => enquiry.source === 'product').length,
        cartEnquiries: enquiries.filter(enquiry => enquiry.source === 'cart').length
    };
}

// --- Orders ---
export async function getAdminOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            id,
            order_number,
            user_id,
            contact_name,
            contact_phone,
            contact_email,
            shipping_full_name,
            shipping_phone,
            shipping_address_line1,
            shipping_address_line2,
            shipping_city,
            shipping_state,
            shipping_postal_code,
            shipping_country,
            subtotal,
            shipping_amount,
            discount_amount,
            tax_amount,
            total_amount,
            currency,
            status,
            payment_status,
            created_at,
            order_items ( count )
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(order => ({
        ...order,
        item_count: order.order_items?.[0]?.count || 0
    }));
}

export async function getAdminOrderItems(orderId) {
    const { data, error } = await supabase
        .from('order_items')
        .select('order_id, product_id, product_name, product_image_url, unit_price, quantity, line_total, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function updateAdminOrderStatus(orderId, status, paymentStatus) {
    const { data, error } = await supabase.rpc('admin_update_order_status', {
        p_order_id: orderId,
        p_status: status || null,
        p_payment_status: paymentStatus || null
    });

    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
}

export async function getAdminReviews(status = '') {
    let query = supabase
        .from('reviews')
        .select('id, product_id, user_id, display_name, rating, title, body, status, created_at, moderated_at, products(name)')
        .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function moderateReview(reviewId, status) {
    const { data, error } = await supabase.rpc('admin_moderate_review', {
        p_review_id: reviewId,
        p_status: status
    });
    if (error) throw error;
    return data;
}

export async function getAdminEnquiries() {
    const { data, error } = await supabase
        .from('whatsapp_enquiries')
        .select('id, source, quantity, status, internal_notes, created_at, products(name)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function updateAdminEnquiry(id, changes) {
    const { error } = await supabase
        .from('whatsapp_enquiries')
        .update(changes)
        .eq('id', id);
    if (error) throw error;
}

export async function getCatalogAnalytics() {
    const [eventsRes, salesRes, enquiriesRes] = await Promise.allSettled([
        supabase.from('catalog_events').select('event_type, product_id, created_at, products(name)'),
        supabase.from('manual_sales').select('id, product_id, quantity, sale_amount, sale_date, note, recorded_by, products(name)').order('sale_date', { ascending: false }),
        supabase.from('whatsapp_enquiries').select('source, product_id, created_at, products(name)')
    ]);

    let events = eventsRes.status === 'fulfilled' && !eventsRes.value.error ? (eventsRes.value.data || []) : [];
    const sales = salesRes.status === 'fulfilled' && !salesRes.value.error ? (salesRes.value.data || []) : [];
    const enquiries = enquiriesRes.status === 'fulfilled' && !enquiriesRes.value.error ? (enquiriesRes.value.data || []) : [];

    // If catalog_events has no or fewer clicks than whatsapp_enquiries, merge enquiries as WHATSAPP_CLICK events
    const clickEvents = events.filter(e => e.event_type === 'WHATSAPP_CLICK');
    if (clickEvents.length < enquiries.length) {
        const existingKeys = new Set(clickEvents.map(c => `${c.product_id}_${c.created_at}`));
        const additionalClicks = enquiries
            .filter(eq => !existingKeys.has(`${eq.product_id}_${eq.created_at}`))
            .map(eq => ({
                event_type: 'WHATSAPP_CLICK',
                product_id: eq.product_id,
                created_at: eq.created_at,
                products: eq.products
            }));
        events = [...events, ...additionalClicks];
    }

    if (eventsRes.status === 'rejected' && salesRes.status === 'rejected') {
        throw eventsRes.reason || new Error('Failed to load analytics data.');
    }

    return { events, sales };
}

export async function getManualSales() {
    const { data, error } = await supabase.from('manual_sales')
        .select('id, product_id, quantity, sale_amount, sale_date, note, products(name)')
        .order('sale_date', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function saveManualSale(sale, id = null) {
    const payload = {
        product_id: sale.product_id || null,
        quantity: Number(sale.quantity),
        sale_amount: Number(sale.sale_amount),
        sale_date: sale.sale_date,
        note: sale.note?.trim() || null,
    };
    if (!Number.isInteger(payload.quantity) || payload.quantity < 1 || !Number.isFinite(payload.sale_amount) || payload.sale_amount < 0) {
        throw new Error('Enter a valid quantity and sale amount.');
    }
    if (id) {
        const { error } = await supabase.from('manual_sales').update(payload).eq('id', id);
        if (error) throw error;
        return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('manual_sales').insert({ ...payload, recorded_by: userData.user?.id });
    if (error) throw error;
}

export async function deleteManualSale(id) {
    const { error } = await supabase.from('manual_sales').delete().eq('id', id);
    if (error) throw error;
}

// --- Images ---
export async function uploadImage(file, pathPrefix) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${pathPrefix}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('store-images')
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('store-images')
        .getPublicUrl(filePath);

    return data.publicUrl;
}

// --- Specific CRUD operations will be used directly in components or added here if needed ---
