import React, { useEffect, useMemo, useState } from 'react';
import { getAdminOrderItems, getAdminOrders, updateAdminOrderStatus } from '../lib/adminData.js';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD_PENDING'];

function formatAmount(value, currency = 'INR') {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'Unavailable';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeZone: 'Asia/Kolkata'
    }).format(date);
}

function statusClass(value) {
    if (value === 'DELIVERED' || value === 'PAID') return 'badge badge-success';
    if (value === 'CANCELLED' || value === 'FAILED') return 'badge badge-danger';
    return 'badge badge-warning';
}

function friendlyError(error) {
    const message = error?.message || '';
    if (message.includes('ADMIN_REQUIRED')) return 'Administrator access is required.';
    if (message.includes('ORDER_NOT_FOUND')) return 'That order could not be found.';
    if (message.includes('INVALID_STATUS')) return 'The selected order status is not valid.';
    if (message.includes('INVALID_PAYMENT_STATUS')) return 'The selected payment status is not valid.';
    return 'We could not complete that order operation. Please try again.';
}

const OrderDetails = ({ order, items, loadingItems, error, onClose, onSaved }) => {
    const [status, setStatus] = useState(order.status);
    const [paymentStatus, setPaymentStatus] = useState(order.payment_status);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');

    useEffect(() => {
        setStatus(order.status);
        setPaymentStatus(order.payment_status);
    }, [order]);

    const saveStatuses = async () => {
        setSaving(true);
        setMessage('');
        try {
            const updated = await updateAdminOrderStatus(order.id, status, paymentStatus);
            onSaved({
                ...order,
                status: updated?.status || status,
                payment_status: updated?.payment_status || paymentStatus,
                updated_at: updated?.updated_at || order.updated_at
            });
            setMessageType('success');
            setMessage('Order statuses updated successfully.');
        } catch (error) {
            console.error('[Admin Orders] Status update failed:', error);
            setMessageType('error');
            setMessage(friendlyError(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" role="presentation" onClick={onClose}>
            <section className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }} role="dialog" aria-modal="true" aria-labelledby="order-details-title" onClick={event => event.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 id="order-details-title" style={{ fontFamily: 'var(--font-heading)' }}>{order.order_number}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Created {formatDate(order.created_at)}</p>
                    </div>
                    <button className="btn btn-outline" onClick={onClose}>Close</button>
                </div>

                {message && (
                    <div style={{ background: messageType === 'error' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)', color: messageType === 'error' ? 'var(--status-danger)' : 'var(--status-success)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }} role="status">
                        {message}
                    </div>
                )}

                <div className="admin-card" style={{ marginBottom: '1rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Status</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        <label className="form-group">
                            <span className="form-label">Order status</span>
                            <select value={status} onChange={event => setStatus(event.target.value)} disabled={saving}>
                                {ORDER_STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
                            </select>
                        </label>
                        <label className="form-group">
                            <span className="form-label">Payment status</span>
                            <select value={paymentStatus} onChange={event => setPaymentStatus(event.target.value)} disabled={saving}>
                                {PAYMENT_STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
                            </select>
                        </label>
                    </div>
                    <button className="btn btn-primary" onClick={saveStatuses} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Statuses'}
                    </button>
                </div>

                <div className="admin-card" style={{ marginBottom: '1rem' }}>
                    <h3 style={{ marginBottom: '0.75rem' }}>Customer</h3>
                    <p>{order.contact_name || 'Not provided'}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{order.contact_phone || 'Phone unavailable'}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{order.contact_email || 'Email unavailable'}</p>
                </div>

                <div className="admin-card" style={{ marginBottom: '1rem' }}>
                    <h3 style={{ marginBottom: '0.75rem' }}>Shipping</h3>
                    <p>{order.shipping_full_name || 'Not provided'}</p>
                    <p>{order.shipping_phone || 'Phone unavailable'}</p>
                    <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                        {[order.shipping_address_line1, order.shipping_address_line2, [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(', '), order.shipping_country].filter(Boolean).join('\n')}
                    </p>
                </div>

                <div className="admin-card" style={{ marginBottom: '1rem' }}>
                    <h3 style={{ marginBottom: '0.75rem' }}>Price Summary</h3>
                    {[
                        ['Subtotal', order.subtotal],
                        ['Shipping', order.shipping_amount],
                        ['Discount', order.discount_amount],
                        ['Tax', order.tax_amount],
                        ['Total', order.total_amount]
                    ].map(([label, amount]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.45rem', fontWeight: label === 'Total' ? 700 : 400 }}>
                            <span>{label}</span>
                            <span>{formatAmount(amount, order.currency)}</span>
                        </div>
                    ))}
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Currency: {order.currency || 'INR'}</p>
                </div>

                <div className="admin-card">
                    <h3 style={{ marginBottom: '0.75rem' }}>Items</h3>
                    {loadingItems && <p>Loading order items...</p>}
                    {error && <p style={{ color: 'var(--status-danger)' }}>We could not load the order items.</p>}
                    {!loadingItems && !error && items.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No items found for this order.</p>}
                    {!loadingItems && !error && items.length > 0 && (
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Unit Price</th>
                                        <th>Qty</th>
                                        <th>Line Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={`${item.order_id}-${item.product_id || item.product_name}-${item.created_at}`}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-admin-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {item.product_image_url ? <img src={item.product_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>No img</span>}
                                                    </div>
                                                    <span>{item.product_name}</span>
                                                </div>
                                            </td>
                                            <td>{formatAmount(item.unit_price, order.currency)}</td>
                                            <td>{item.quantity}</td>
                                            <td>{formatAmount(item.line_total, order.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemsError, setItemsError] = useState(false);

    useEffect(() => {
        async function loadOrders() {
            try {
                setError('');
                setOrders(await getAdminOrders());
            } catch (loadError) {
                console.error('[Admin Orders] Load failed:', loadError);
                setError('We could not load orders right now. Please try again.');
            } finally {
                setLoading(false);
            }
        }
        loadOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase();
        return orders.filter(order => {
            const matchesSearch = !query
                || order.order_number?.toLowerCase().includes(query)
                || order.contact_email?.toLowerCase().includes(query);
            const matchesStatus = !statusFilter || order.status === statusFilter;
            const matchesPayment = !paymentFilter || order.payment_status === paymentFilter;
            return matchesSearch && matchesStatus && matchesPayment;
        });
    }, [orders, search, statusFilter, paymentFilter]);

    const openDetails = async order => {
        setSelectedOrder(order);
        setSelectedItems([]);
        setItemsError(false);
        setItemsLoading(true);
        try {
            setSelectedItems(await getAdminOrderItems(order.id));
        } catch (loadError) {
            console.error('[Admin Orders] Item load failed:', loadError);
            setItemsError(true);
        } finally {
            setItemsLoading(false);
        }
    };

    const updateOrder = updatedOrder => {
        setOrders(current => current.map(order => order.id === updatedOrder.id ? updatedOrder : order));
        setSelectedOrder(updatedOrder);
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Orders</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Review customer orders and manage independent order statuses.</p>
            </div>

            <div className="admin-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="search" placeholder="Search order number or email..." value={search} onChange={event => setSearch(event.target.value)} style={{ maxWidth: '320px', width: '100%' }} />
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by order status">
                    <option value="">All order statuses</option>
                    {ORDER_STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={paymentFilter} onChange={event => setPaymentFilter(event.target.value)} aria-label="Filter by payment status">
                    <option value="">All payment statuses</option>
                    {PAYMENT_STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found</span>
            </div>

            {loading && <div style={{ padding: '3rem', textAlign: 'center' }}>Loading orders...</div>}
            {!loading && error && <div className="admin-card" style={{ color: 'var(--status-danger)' }}>{error}</div>}
            {!loading && !error && orders.length === 0 && (
                <div className="admin-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>No orders yet</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Customer orders will appear here after checkout.</p>
                </div>
            )}
            {!loading && !error && orders.length > 0 && filteredOrders.length === 0 && (
                <div className="admin-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>No matching orders</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Try changing the search or filters.</p>
                </div>
            )}
            {!loading && !error && filteredOrders.length > 0 && (
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Date</th>
                                <th>Contact Email</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th>Items</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id}>
                                    <td>{order.order_number}</td>
                                    <td>{formatDate(order.created_at)}</td>
                                    <td>{order.contact_email || 'Unavailable'}</td>
                                    <td>{formatAmount(order.total_amount, order.currency)}</td>
                                    <td><span className={statusClass(order.status)}>{order.status}</span></td>
                                    <td><span className={statusClass(order.payment_status)}>{order.payment_status}</span></td>
                                    <td>{order.item_count}</td>
                                    <td style={{ textAlign: 'right' }}><button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => openDetails(order)}>View Details</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedOrder && (
                <OrderDetails
                    order={selectedOrder}
                    items={selectedItems}
                    loadingItems={itemsLoading}
                    error={itemsError}
                    onClose={() => setSelectedOrder(null)}
                    onSaved={updateOrder}
                />
            )}
        </div>
    );
};

export default Orders;
