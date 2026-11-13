import React, { useEffect, useState } from 'react';
import { getManualSales, saveManualSale, deleteManualSale } from '../lib/adminData.js';
import { supabase } from '../../js/supabase.js';

const empty = { product_id: '', quantity: 1, sale_amount: '', sale_date: new Date().toISOString().slice(0, 10), note: '' };
export default function ManualSales() {
    const [sales, setSales] = useState([]); const [products, setProducts] = useState([]); const [form, setForm] = useState(empty); const [editing, setEditing] = useState(null); const [error, setError] = useState('');
    const load = async () => { try { setSales(await getManualSales()); } catch (e) { setError(e.message); } };
    useEffect(() => { load(); supabase.from('products').select('id,name').order('name').then(({ data }) => setProducts(data || [])); }, []);
    const submit = async (e) => { e.preventDefault(); try { await saveManualSale(form, editing); setForm(empty); setEditing(null); await load(); } catch (err) { setError(err.message); } };
    return <div><h1 className="page-title">Manual Sales</h1><p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Record completed offline or WhatsApp-arranged sales. These are not online payment records.</p>
        {error && <div className="admin-card" style={{ color: 'var(--status-danger)', marginBottom: '1rem' }}>{error}</div>}
        <form className="admin-card" onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}><option value="">Product (optional)</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input type="number" min="1" step="1" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="Quantity" />
            <input type="number" min="0" step="0.01" required value={form.sale_amount} onChange={e => setForm({ ...form, sale_amount: e.target.value })} placeholder="Actual amount" />
            <input type="date" required value={form.sale_date} onChange={e => setForm({ ...form, sale_date: e.target.value })} />
            <input value={form.note} maxLength="500" onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Optional note" />
            <button className="btn btn-primary" type="submit">{editing ? 'Update Sale' : 'Record Sale'}</button>
        </form>
        <div className="admin-table-container"><table className="admin-table"><thead><tr><th>Date</th><th>Product</th><th>Qty</th><th>Amount</th><th>Note</th><th /></tr></thead><tbody>{sales.map(s => <tr key={s.id}><td>{s.sale_date}</td><td>{s.products?.name || 'Deleted product'}</td><td>{s.quantity}</td><td>₹{Number(s.sale_amount).toLocaleString('en-IN')}</td><td>{s.note || '—'}</td><td><button className="btn btn-outline" onClick={() => { setEditing(s.id); setForm({ product_id: s.product_id || '', quantity: s.quantity, sale_amount: s.sale_amount, sale_date: s.sale_date, note: s.note || '' }); }}>Edit</button> <button className="btn btn-danger" onClick={async () => { if (window.confirm('Delete this sale record?')) { await deleteManualSale(s.id); load(); } }}>Delete</button></td></tr>)}</tbody></table></div>
    </div>;
}
