import React, { useEffect, useState } from 'react';
import { getAdminEnquiries, updateAdminEnquiry } from '../lib/adminData.js';

const STATUSES = ['NEW', 'CONTACTED', 'NEGOTIATING', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED'];

export default function Enquiries() {
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function load() {
        setLoading(true);
        try {
            setEnquiries(await getAdminEnquiries());
        } catch (loadError) {
            setError(loadError.message || 'Could not load enquiries.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    async function save(enquiry, changes) {
        try {
            await updateAdminEnquiry(enquiry.id, changes);
            await load();
        } catch (saveError) {
            setError(saveError.message || 'Could not update enquiry.');
        }
    }

    return (
        <div>
            <h1 className="page-title">WhatsApp Enquiries</h1>
            <p className="page-subtitle">Track customer enquiries separately from confirmed orders and revenue.</p>
            {error && <div className="admin-card" style={{ color: 'var(--status-danger)' }}>{error}</div>}
            {loading ? <p>Loading enquiries...</p> : !enquiries.length ? <div className="admin-card">No enquiries yet.</div> : (
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead><tr><th>Created</th><th>Source</th><th>Product</th><th>Quantity</th><th>Status</th><th>Notes</th></tr></thead>
                        <tbody>{enquiries.map(enquiry => (
                            <tr key={enquiry.id}>
                                <td>{new Date(enquiry.created_at).toLocaleString()}</td>
                                <td>{enquiry.source}</td>
                                <td>{enquiry.products?.name || 'Cart / general enquiry'}</td>
                                <td>{enquiry.quantity}</td>
                                <td>
                                    <select value={enquiry.status} onChange={event => save(enquiry, { status: event.target.value })}>
                                        {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <input defaultValue={enquiry.internal_notes || ''} aria-label="Internal notes"
                                        onBlur={event => save(enquiry, { internal_notes: event.target.value })} />
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
