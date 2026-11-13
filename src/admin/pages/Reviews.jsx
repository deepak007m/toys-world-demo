import React, { useCallback, useEffect, useState } from 'react';
import { getAdminReviews, moderateReview } from '../lib/adminData.js';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

function Reviews() {
    const [status, setStatus] = useState('PENDING');
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const loadReviews = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setReviews(await getAdminReviews(status));
        } catch (loadError) {
            setError(loadError.message || 'Could not load reviews.');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => { loadReviews(); }, [loadReviews]);

    const filteredReviews = reviews.filter(review => {
        const haystack = [
            review.products?.name,
            review.display_name,
            review.title,
            review.body
        ].join(' ').toLowerCase();
        return haystack.includes(search.trim().toLowerCase());
    });

    const updateStatus = async (id, nextStatus) => {
        try {
            await moderateReview(id, nextStatus);
            setReviews(current => current.filter(review => review.id !== id));
        } catch (moderationError) {
            setError(moderationError.message || 'Could not update review.');
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Reviews</h1>
                    <p className="page-subtitle">Approve customer reviews before they appear publicly.</p>
                </div>
                <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search reviews"
                    aria-label="Search reviews"
                />
                <select value={status} onChange={event => setStatus(event.target.value)} aria-label="Review status">
                    {STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
            </div>
            {error && <div className="admin-card" style={{ color: 'var(--status-danger)' }}>{error}</div>}
            {loading && <p>Loading reviews...</p>}
            {!loading && !filteredReviews.length && <div className="admin-card">No matching {status.toLowerCase()} reviews.</div>}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {filteredReviews.map(review => (
                    <article className="admin-card" key={review.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <div>
                                <h3>{review.title || 'Untitled review'}</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    {review.products?.name || 'Unknown product'} · {review.display_name} · {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                </p>
                            </div>
                            <span className="badge badge-warning">{review.status}</span>
                        </div>
                        <p style={{ margin: '1rem 0', whiteSpace: 'pre-wrap' }}>{review.body}</p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {status !== 'APPROVED' && <button className="btn btn-primary" onClick={() => updateStatus(review.id, 'APPROVED')}>Approve</button>}
                            {status !== 'REJECTED' && <button className="btn btn-outline" onClick={() => updateStatus(review.id, 'REJECTED')}>Reject</button>}
                            {status !== 'PENDING' && <button className="btn btn-outline" onClick={() => updateStatus(review.id, 'PENDING')}>Move to pending</button>}
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}

export default Reviews;
