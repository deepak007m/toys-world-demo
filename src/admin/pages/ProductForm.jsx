import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../js/supabase.js';
import { uploadImage } from '../lib/adminData.js';

const ProductForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        short_description: '',
        long_description: '',
        price: '',
        category_id: '',
        subcategory_id: '',
        availability: 'IN_STOCK',
        is_featured: false,
        image_url: ''
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');

    useEffect(() => {
        async function init() {
            // Load categories first
            const { data: catData } = await supabase.from('categories').select('id, title').order('sort_order');
            if (catData) setCategories(catData);

            if (isEditing) {
                const { data: prodData, error: prodErr } = await supabase.from('products').select('*').eq('id', id).single();
                if (prodData) {
                    setFormData({
                        ...prodData,
                        price: prodData.price || '',
                        category_id: prodData.category_id || '',
                        subcategory_id: prodData.subcategory_id || '',
                        short_description: prodData.short_description || '',
                        long_description: prodData.long_description || ''
                    });
                    setImagePreview(prodData.image_url || '');
                    if (prodData.category_id) {
                        const { data: subData } = await supabase.from('subcategories').select('id, title').eq('category_id', prodData.category_id).order('sort_order');
                        if (subData) setSubcategories(subData);
                    }
                }
                if (prodErr) setError(prodErr.message);
            }
            setLoading(false);
        }
        init();
    }, [id, isEditing]);

    const handleCategoryChange = async (e) => {
        const catId = e.target.value;
        setFormData({ ...formData, category_id: catId, subcategory_id: '' });
        if (catId) {
            const { data } = await supabase.from('subcategories').select('id, title').eq('category_id', catId).order('sort_order');
            setSubcategories(data || []);
        } else {
            setSubcategories([]);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const url = URL.createObjectURL(file);
            setImagePreview(url);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            let finalImageUrl = formData.image_url;

            if (imageFile) {
                // Upload new image
                finalImageUrl = await uploadImage(imageFile, `products/img`);
            }

            const payload = {
                name: formData.name,
                short_description: formData.short_description,
                long_description: formData.long_description,
                price: formData.price ? parseFloat(formData.price) : null,
                category_id: formData.category_id || null,
                subcategory_id: formData.subcategory_id || null,
                availability: formData.availability,
                is_featured: formData.is_featured,
                image_url: finalImageUrl
            };

            if (isEditing) {
                const { error: updateErr } = await supabase.from('products').update(payload).eq('id', id);
                if (updateErr) throw updateErr;
            } else {
                const { error: insertErr } = await supabase.from('products').insert([payload]);
                if (insertErr) throw insertErr;
            }

            // Success
            navigate('/products');

        } catch (err) {
            console.error(err);
            setError(err.message || 'An error occurred while saving the product');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading product details...</div>;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate('/products')} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }}>← Back</button>
                <h1 className="page-title" style={{ margin: 0 }}>{isEditing ? 'Edit Product' : 'Add Product'}</h1>
            </div>

            {error && (
                <div style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="admin-card" style={{ maxWidth: '800px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* Left Col - Core Data */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Product Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Price (₹)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                            placeholder="Leave empty for 'Price on Request'"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                            <label className="form-label">Category</label>
                            <select value={formData.category_id} onChange={handleCategoryChange}>
                                <option value="">Select Category...</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                            <label className="form-label">Subcategory</label>
                            <select
                                value={formData.subcategory_id}
                                onChange={e => setFormData({ ...formData, subcategory_id: e.target.value })}
                                disabled={!formData.category_id || subcategories.length === 0}
                            >
                                <option value="">Select Subcategory...</option>
                                {subcategories.map(s => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Availability</label>
                        <select
                            value={formData.availability}
                            onChange={e => setFormData({ ...formData, availability: e.target.value })}
                        >
                            <option value="IN_STOCK">In Stock</option>
                            <option value="LIMITED">Limited Stock</option>
                            <option value="OUT_OF_STOCK">Out of Stock</option>
                            <option value="CONFIRM_ON_WA">Confirm on WhatsApp</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Short Description</label>
                        <textarea
                            rows="2"
                            value={formData.short_description}
                            onChange={e => setFormData({ ...formData, short_description: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                            type="checkbox"
                            id="is_featured"
                            checked={formData.is_featured}
                            onChange={e => setFormData({ ...formData, is_featured: e.target.checked })}
                            style={{ width: 'auto', cursor: 'pointer' }}
                        />
                        <label className="form-label" htmlFor="is_featured" style={{ cursor: 'pointer', margin: 0, color: 'var(--accent-gold)' }}>★ Featured Product</label>
                    </div>
                </div>

                {/* Right Col - Image & Submit */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <label className="form-label">Product Image</label>

                        <div style={{
                            border: '1px dashed var(--border-strong)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--bg-admin-base)',
                            minHeight: '200px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {imagePreview ? (
                                <>
                                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', inset: 0 }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                        <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                                            Replace Image
                                            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Click to Upload Image</span>
                                    <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>PNG, JPG up to 5MB</span>
                                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                                </label>
                            )}
                        </div>
                        {imagePreview && (
                            <button
                                type="button"
                                className="btn btn-outline"
                                style={{ marginTop: '0.75rem', fontSize: '0.75rem', padding: '0.4rem 0.8rem', width: '100%' }}
                                onClick={() => { setImageFile(null); setImagePreview(''); setFormData({ ...formData, image_url: '' }); }}
                            >
                                Remove Image
                            </button>
                        )}
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', marginTop: 'auto' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', height: '48px', fontSize: '1rem' }}
                            disabled={saving}
                        >
                            {saving ? 'Saving Product...' : 'Save Product'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;
