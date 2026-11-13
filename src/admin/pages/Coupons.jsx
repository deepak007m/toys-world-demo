import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../js/supabase.js';

const emptyCoupon = {
    code: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: '',
    minimum_subtotal: 0,
    maximum_discount: '',
    starts_at: '',
    expires_at: '',
    usage_limit: '',
    per_customer_limit: 1,
    is_active: true,
    eligible_product_ids: '',
    eligible_category_ids: ''
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuidList(value, label) {
    const values = String(value || '').split(',').map(item => item.trim()).filter(Boolean);
    if (values.some(value => !UUID_PATTERN.test(value))) {
        throw new Error(`${label} must contain valid UUIDs separated by commas.`);
    }
    return values;
}

function numberOrNull(value, label, { min = 0, integer = false } = {}) {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || (integer && !Number.isInteger(parsed))) {
        throw new Error(`${label} must be ${integer ? 'a whole number' : 'a valid number'}${min ? ` of at least ${min}` : ''}.`);
    }
    return parsed;
}

const Coupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [form, setForm] = useState(emptyCoupon);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    async function loadCoupons() {
        setLoading(true);
        const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
        if (error) setMessage(error.message);
        else setCoupons(data || []);
        setLoading(false);
    }

    useEffect(() => { loadCoupons(); }, []);

    const visibleCoupons = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return coupons;
        return coupons.filter(coupon => `${coupon.code} ${coupon.description || ''}`.toLowerCase().includes(query));
    }, [coupons, search]);

    const update = event => setForm(current => ({
        ...current,
        [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value
    }));

    const reset = () => {
        setEditing(null);
        setForm({ ...emptyCoupon });
        setMessage('');
    };

    const edit = coupon => {
        setEditing(coupon.id);
        setForm({
            ...coupon,
            eligible_product_ids: (coupon.eligible_product_ids || []).join(', '),
            eligible_category_ids: (coupon.eligible_category_ids || []).join(', '),
            starts_at: coupon.starts_at?.slice(0, 16) || '',
            expires_at: coupon.expires_at?.slice(0, 16) || ''
        });
        setMessage('');
    };

    async function save(event) {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            const code = form.code.trim().replace(/\s+/g, '').toUpperCase();
            if (!/^[A-Z0-9_-]{1,40}$/.test(code)) {
                throw new Error('Coupon code may contain only letters, numbers, underscores or hyphens.');
            }
            const discountValue = numberOrNull(form.discount_value, 'Discount value', { min: 0.01 });
            if (discountValue === null) throw new Error('Discount value is required.');
            if (form.discount_type === 'PERCENTAGE' && discountValue > 100) {
                throw new Error('Percentage discounts cannot exceed 100.');
            }
            const minimumSubtotal = numberOrNull(form.minimum_subtotal, 'Minimum subtotal', { min: 0 }) ?? 0;
            const maximumDiscount = numberOrNull(form.maximum_discount, 'Maximum discount', { min: 0.01 });
            const usageLimit = numberOrNull(form.usage_limit, 'Usage limit', { min: 1, integer: true });
            const perCustomerLimit = numberOrNull(form.per_customer_limit, 'Per-customer limit', { min: 1, integer: true });
            if (!perCustomerLimit) throw new Error('Per-customer limit must be at least 1.');
            if (form.starts_at && form.expires_at && new Date(form.expires_at) <= new Date(form.starts_at)) {
                throw new Error('Expiry must be after the start date.');
            }
            const payload = {
                code,
                description: form.description.trim() || null,
                discount_type: form.discount_type,
                discount_value: discountValue,
                minimum_subtotal: minimumSubtotal,
                maximum_discount: maximumDiscount,
                usage_limit: usageLimit,
                per_customer_limit: perCustomerLimit,
                starts_at: form.starts_at || null,
                expires_at: form.expires_at || null,
                is_active: form.is_active,
                eligible_product_ids: parseUuidList(form.eligible_product_ids, 'Eligible product IDs'),
                eligible_category_ids: parseUuidList(form.eligible_category_ids, 'Eligible category IDs')
            };
            const result = editing
                ? await supabase.from('coupons').update(payload).eq('id', editing)
                : await supabase.from('coupons').insert(payload);
            if (result.error) throw result.error;
            reset();
            await loadCoupons();
        } catch (error) {
            setMessage(error.message || 'Could not save coupon.');
        } finally {
            setSaving(false);
        }
    }

    async function remove(coupon) {
        if (coupon.usage_count > 0) {
            setMessage('Used coupons cannot be deleted. Deactivate them instead.');
            return;
        }
        if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
        const { error } = await supabase.from('coupons').delete().eq('id', coupon.id);
        if (error) setMessage(error.message);
        else await loadCoupons();
    }

    return <div>
        <h1 className="page-title">Coupons</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Create server-validated discounts for customer checkout.</p>
        {message && <div className="admin-card" style={{ marginBottom: '1rem', color: 'var(--status-danger)' }}>{message}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '2rem' }}>
            <form className="admin-card" onSubmit={save}>
                <h3 style={{ marginBottom: '1rem' }}>{editing ? 'Edit coupon' : 'New coupon'}</h3>
                <div className="form-group"><label className="form-label">Code</label><input name="code" value={form.code} onChange={update} required maxLength="40" /></div>
                <div className="form-group"><label className="form-label">Description</label><input name="description" value={form.description || ''} onChange={update} /></div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Type</label><select name="discount_type" value={form.discount_type} onChange={update}><option value="PERCENTAGE">Percent</option><option value="FIXED">Fixed INR</option></select></div>
                    <div className="form-group"><label className="form-label">Value</label><input name="discount_value" type="number" min="0.01" step="0.01" value={form.discount_value} onChange={update} required /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Minimum subtotal</label><input name="minimum_subtotal" type="number" min="0" step="0.01" value={form.minimum_subtotal} onChange={update} /></div>
                    <div className="form-group"><label className="form-label">Maximum discount</label><input name="maximum_discount" type="number" min="0.01" step="0.01" value={form.maximum_discount} onChange={update} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Usage limit</label><input name="usage_limit" type="number" min="1" step="1" value={form.usage_limit} onChange={update} /></div>
                    <div className="form-group"><label className="form-label">Per customer</label><input name="per_customer_limit" type="number" min="1" step="1" value={form.per_customer_limit} onChange={update} /></div>
                </div>
                <div className="form-group"><label className="form-label">Eligible product IDs (comma-separated, optional)</label><input name="eligible_product_ids" value={form.eligible_product_ids || ''} onChange={update} /></div>
                <div className="form-group"><label className="form-label">Eligible category IDs (comma-separated, optional)</label><input name="eligible_category_ids" value={form.eligible_category_ids || ''} onChange={update} /></div>
                <div className="form-row"><div className="form-group"><label className="form-label">Starts</label><input name="starts_at" type="datetime-local" value={form.starts_at} onChange={update} /></div><div className="form-group"><label className="form-label">Expires</label><input name="expires_at" type="datetime-local" value={form.expires_at} onChange={update} /></div></div>
                <label style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}><input name="is_active" type="checkbox" checked={form.is_active} onChange={update} /> Active</label>
                <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save coupon' : 'Create coupon'}</button>
                {editing && <button type="button" className="btn btn-outline" style={{ marginLeft: '.5rem' }} onClick={reset}>Cancel</button>}
            </form>
            <div>
                <input className="form-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search coupons" aria-label="Search coupons" style={{ marginBottom: '1rem' }} />
                <div className="admin-table-container">{loading ? <div className="admin-card">Loading coupons...</div> : <table className="admin-table"><thead><tr><th>Code</th><th>Discount</th><th>Usage</th><th>Status</th><th /></tr></thead><tbody>{visibleCoupons.map(coupon => <tr key={coupon.id}><td><strong>{coupon.code}</strong><br /><small>{coupon.description}</small></td><td>{coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}</td><td>{coupon.usage_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}</td><td>{coupon.is_active ? 'Active' : 'Inactive'}</td><td><button className="btn btn-outline" onClick={() => edit(coupon)}>Edit</button>{' '}<button className="btn btn-outline" onClick={() => remove(coupon)}>Delete</button></td></tr>)}</tbody></table>}</div>
            </div>
        </div>
    </div>;
};

export default Coupons;
