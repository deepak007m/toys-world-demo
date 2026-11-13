import React, { useEffect, useState } from 'react';
import { getCatalogAnalytics } from '../lib/adminData.js';

export default function Analytics() {
    const [data, setData] = useState({ events: [], sales: [] });
    const [error, setError] = useState('');
    useEffect(() => { getCatalogAnalytics().then(setData).catch(err => setError(err.message)); }, []);
    if (error) {
        return <div><h1 className="page-title">Analytics</h1><div className="admin-card" style={{ color: 'var(--status-danger)' }}>Unable to load analytics: {error}</div></div>;
    }
    const views = data.events.filter(e => e.event_type === 'PRODUCT_VIEW');
    const clicks = data.events.filter(e => e.event_type === 'WHATSAPP_CLICK');
    const revenue = data.sales.reduce((sum, sale) => sum + Number(sale.sale_amount || 0), 0);
    const units = data.sales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0);
    const top = (type) => Object.values(data.events.filter(e => e.event_type === type).reduce((map, e) => {
        const key = e.product_id || 'unknown'; map[key] ||= { name: e.products?.name || 'Unknown product', count: 0 }; map[key].count += 1; return map;
    }, {})).sort((a, b) => b.count - a.count).slice(0, 5);
    const daily = Object.values(data.events.reduce((map, event) => {
        const day = event.created_at?.slice(0, 10);
        if (!day) return map;
        map[day] ||= { day, views: 0, clicks: 0 };
        if (event.event_type === 'PRODUCT_VIEW') map[day].views += 1;
        if (event.event_type === 'WHATSAPP_CLICK') map[day].clicks += 1;
        return map;
    }, {})).sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
    const chartMax = Math.max(1, ...daily.flatMap(item => [item.views, item.clicks]));
    const chart = (key, label, color) => daily.length
        ? <div className="analytics-chart">{daily.map(item => <div className="analytics-bar-group" key={`${key}-${item.day}`}><div className="analytics-bar" style={{ height: `${Math.max(4, item[key] / chartMax * 100)}%`, background: color }} title={`${item.day}: ${item[key]}`} /><span>{item.day.slice(5)}</span></div>)}</div>
        : <div className="analytics-empty">No {label.toLowerCase()} data yet.</div>;
    return <div><h1 className="page-title">Analytics</h1><p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Catalogue activity and owner-recorded sales.</p>
        {error && <div className="admin-card" style={{ color: 'var(--status-danger)' }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[['Product views', views.length], ['WhatsApp clicks', clicks.length], ['Units sold', units], ['Recorded revenue', `₹${revenue.toLocaleString('en-IN')}`]].map(([label, value]) => <div className="admin-card" key={label}><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>)}
        </div>
        <div className="analytics-chart-grid">
            <div className="admin-card"><h3>Product views by day</h3>{chart('views', 'product views', 'var(--accent-gold)')}</div>
            <div className="admin-card"><h3>WhatsApp clicks by day</h3>{chart('clicks', 'WhatsApp clicks', 'var(--status-success)')}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.5rem' }}>
            {[['Most viewed products', top('PRODUCT_VIEW')], ['Most enquired products', top('WHATSAPP_CLICK')]].map(([title, rows]) => <div className="admin-card" key={title}><h3>{title}</h3>{rows.map(row => <p key={row.name} style={{ display: 'flex', justifyContent: 'space-between', margin: '0.8rem 0' }}><span>{row.name}</span><strong>{row.count}</strong></p>)}</div>)}
        </div>
    </div>;
}
