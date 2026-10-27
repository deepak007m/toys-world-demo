import { supabase } from '../../js/supabase.js';
import { LOW_STOCK_THRESHOLD } from '../../js/inventory.js';

// --- Dashboard Stats ---
export async function getDashboardStats() {
    const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('id, is_featured, stock_quantity'),
        supabase.from('categories').select('id', { count: 'exact' })
    ]);

    const products = productsRes.data || [];
    return {
        totalProducts: products.length,
        featuredProducts: products.filter(p => p.is_featured).length,
        totalCategories: categoriesRes.data?.length || 0,
        lowStock: products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= LOW_STOCK_THRESHOLD).length,
        outOfStock: products.filter(p => p.stock_quantity === 0).length
    };
}

export async function getRecentProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, price, availability, stock_quantity, image_url, created_at, categories(title)')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) console.error("Error fetching recent products:", error);
    return data || [];
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
