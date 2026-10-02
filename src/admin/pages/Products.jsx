import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../js/supabase.js';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(null); // id of product being deleted

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(title), subcategories(title)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error loading products:", error);
        } else {
            setProducts(data || []);
        }
        setLoading(false);
    }

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

        setDeleteLoading(id);
        // RLS and constraints handle the rest. We just delete from DB.
        // Realistically setting up bucket garbage collection is hard via client if there are multiple usages, 
        // but the prompt said prioritise db consistency and reporting issue rather than deleting wrong file.
        // So we just delete from DB.

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            alert("Failed to delete product: " + error.message);
        } else {
            setProducts(products.filter(p => p.id !== id));
        }
        setDeleteLoading(null);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.categories?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">Products</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your store catalogue.</p>
                </div>
                <Link to="/products/new" className="btn btn-primary">
                    + Add Product
                </Link>
            </div>

            <div className="admin-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ maxWidth: '300px', width: '100%' }}
                />
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Loading products...</div>
            ) : filteredProducts.length === 0 ? (
                <div className="admin-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>No products found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        {searchTerm ? "No products match your search." : "Your catalogue is currently empty."}
                    </p>
                    {!searchTerm && <Link to="/products/new" className="btn btn-primary">+ Add Your First Product</Link>}
                </div>
            ) : (
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Img</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Subcat</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Featured</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(p => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-admin-base)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {p.image_url ? (
                                                <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>none</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                                    <td>{p.categories?.title || '—'}</td>
                                    <td>{p.subcategories?.title || '—'}</td>
                                    <td>{p.price != null ? `₹${p.price}` : <span style={{ color: 'var(--text-muted)' }}>Req</span>}</td>
                                    <td>
                                        {p.availability === 'IN_STOCK' && <span className="badge badge-success">In</span>}
                                        {p.availability === 'LIMITED' && <span className="badge badge-warning">Ltd</span>}
                                        {p.availability === 'OUT_OF_STOCK' && <span className="badge badge-danger">Out</span>}
                                        {p.availability === 'CONFIRM_ON_WA' && <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>WA</span>}
                                    </td>
                                    <td>{p.is_featured ? <span style={{ color: 'var(--accent-gold)' }}>★</span> : '—'}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                            <Link to={`/products/${p.id}/edit`} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>Edit</Link>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => handleDelete(p.id)}
                                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                                                disabled={deleteLoading === p.id}
                                            >
                                                {deleteLoading === p.id ? '...' : 'Del'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Products;
