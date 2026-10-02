import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getRecentProducts } from '../lib/adminData.js';

const Dashboard = () => {
    const [stats, setStats] = useState({ totalProducts: 0, featuredProducts: 0, totalCategories: 0, lowStock: 0 });
    const [recentProducts, setRecentProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [statsData, recentData] = await Promise.all([
                    getDashboardStats(),
                    getRecentProducts()
                ]);
                setStats(statsData);
                setRecentProducts(recentData);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;

    return (
        <div>
            <h1 className="page-title">Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Overview of your store's performance.</p>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="admin-card">
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.5rem' }}>Total Products</div>
                    <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalProducts}</div>
                </div>
                <div className="admin-card">
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.5rem' }}>Featured</div>
                    <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.featuredProducts}</div>
                </div>
                <div className="admin-card">
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.5rem' }}>Categories</div>
                    <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalCategories}</div>
                </div>
                <div className="admin-card">
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.5rem' }}>Low / Out of Stock</div>
                    <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: stats.lowStock > 0 ? 'var(--status-warning)' : 'var(--text-primary)' }}>{stats.lowStock}</div>
                </div>
            </div>

            {/* Recent Products */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700 }}>Recent Products</h2>
                <Link to="/products" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>View All Products</Link>
            </div>

            {recentProducts.length === 0 ? (
                <div className="admin-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.5 }}>📦</div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>No products yet</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Add your first product to start building the catalogue.</p>
                    <Link to="/products/new" className="btn btn-primary">+ Add Your First Product</Link>
                </div>
            ) : (
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Image</th>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Availability</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentProducts.map(p => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-admin-base)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {p.image_url ? (
                                                <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No img</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                                    <td>{p.categories?.title || '—'}</td>
                                    <td>{p.price != null ? `₹${p.price}` : <span style={{ color: 'var(--text-muted)' }}>On Request</span>}</td>
                                    <td>
                                        {p.availability === 'IN_STOCK' && <span className="badge badge-success">In Stock</span>}
                                        {p.availability === 'LIMITED' && <span className="badge badge-warning">Limited</span>}
                                        {p.availability === 'OUT_OF_STOCK' && <span className="badge badge-danger">Out of Stock</span>}
                                        {p.availability === 'CONFIRM_ON_WA' && <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>WA Confirm</span>}
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

export default Dashboard;
