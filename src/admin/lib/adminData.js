import { supabase } from '../../js/supabase.js';

// --- Dashboard Stats ---
export async function getDashboardStats() {
    const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('id, is_featured, availability'),
        supabase.from('categories').select('id', { count: 'exact' })
    ]);

    const products = productsRes.data || [];
    return {
        totalProducts: products.length,
        featuredProducts: products.filter(p => p.is_featured).length,
        totalCategories: categoriesRes.data?.length || 0,
        lowStock: products.filter(p => p.availability !== 'IN_STOCK' && p.availability !== 'CONFIRM_ON_WA').length
    };
}

export async function getRecentProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, price, availability, image_url, created_at, categories(title)')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) console.error("Error fetching recent products:", error);
    return data || [];
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
