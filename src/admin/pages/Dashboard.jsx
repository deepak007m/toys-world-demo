import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardAnalytics, getDashboardStats, getRecentProducts } from '../lib/adminData.js';
import { getAvailabilityLabel, getProductAvailability } from '../../js/inventory.js';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentProducts, setRecentProducts] = useState([]);
    const [analytics, setAnalytics] = useState({ orderCount: 0, revenue: 0, pendingOrders: 0, enquiryCount: 0, productEnquiries: 0, cartEnquiries: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadData() {
            const results = await Promise.allSettled([
                getDashboardStats(), getRecentProducts(), getDashboardAnalytics()
            ]);
            const [statsResult, recentResult, analyticsResult] = results;
            if (statsResult.status === 'fulfilled') setStats(statsResult.value);
            else setError(statsResult.reason.message);
            if (recentResult.status === 'fulfilled') setRecentProducts(recentResult.value);
            else setError(recentResult.reason.message);
            if (analyticsResult.status === 'fulfilled') setAnalytics(analyticsResult.value);
            setLoading(false);
        }
        loadData();
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;

    return (
        <div>
            <h1 className="page-title">Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Overview of your store's performance.</p>
            {error && <div className="admin-card" style={{ color: 'var(--status-danger)', marginBottom: '1.5rem' }}>Unable to load catalogue data: {error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="admin-card">
                    <div className="stat-label">Orders</div>
                    <div className="stat-value">{analytics.orderCount}</div>
                    <div className="stat-helper">{analytics.pendingOrders} active</div>
                </div>
                <div className="admin-card">
                    <div className="stat-label">Collected revenue</div>
                    <div className="stat-value">₹{analytics.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    <div className="stat-helper">Paid and COD orders</div>
                </div>
                <div className="admin-card">
                    <div className="stat-label">WhatsApp enquiries</div>
                    <div className="stat-value">{analytics.enquiryCount}</div>
                    <div className="stat-helper">{analytics.productEnquiries} product · {analytics.cartEnquiries} cart</div>
                </div>
            </div>

            {/* Stats Grid */}
            {stats ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
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
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.5rem' }}>Available Products</div>
                    <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.availableProducts}</div>
                </div>
                <div className="admin-card">
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.5rem' }}>Out of Stock</div>
                    <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: stats.outOfStock > 0 ? 'var(--status-danger)' : 'var(--text-primary)' }}>{stats.outOfStock}</div>
                </div>
            </div> : <div className="admin-card" style={{ color: 'var(--status-danger)', marginBottom: '3rem' }}>Catalogue counts are unavailable.</div>}

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
                                        {getProductAvailability(p) === 'IN_STOCK' && <span className="badge badge-success">{getAvailabilityLabel(getProductAvailability(p))}</span>}
                                        {getProductAvailability(p) === 'OUT_OF_STOCK' && <span className="badge badge-danger">{getAvailabilityLabel(getProductAvailability(p))}</span>}
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
