import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../js/supabase.js';

const Sidebar = ({ isOpen, setOpen }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const menuItems = [
        { name: 'Dashboard', path: '/dashboard', icon: '📊' },
        { name: 'Products', path: '/products', icon: '📦' },
        { name: 'Categories', path: '/categories', icon: '📁' },
        { name: 'Store Settings', path: '/settings', icon: '⚙️' },
    ];

    return (
        <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
            <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: 'var(--accent-gold)' }}>
                    TOYS WORLD
                </h2>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                    Admin Portal
                </div>
            </div>

            <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setOpen(false)}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                            fontWeight: isActive ? 600 : 400,
                            transition: 'all var(--t-fast)'
                        })}
                    >
                        <span>{item.icon}</span>
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            <div style={{ padding: '1.5rem 1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        width: '100%',
                        padding: '0.75rem 1rem',
                        color: 'var(--text-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'left'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--status-danger-bg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                >
                    <span>🚪</span> Logout
                </button>
            </div>
        </aside>
    );
};

const Layout = ({ children, session }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="admin-layout">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={sidebarOpen} setOpen={setSidebarOpen} />

            <div className="admin-main">
                <header className="admin-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Mobile menu toggle */}
                        <button
                            className="d-md-none"
                            style={{ color: 'var(--text-primary)', fontSize: '1.25rem', display: 'none' /* handled via media queries in a real app, keeping simple here */ }}
                            onClick={() => setSidebarOpen(true)}
                        >
                            ☰
                        </button>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Logged in as: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{session.user.email}</span>
                        </div>
                    </div>
                    <div>
                        <a href="/" target="_blank" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>View Live Site ↗</a>
                    </div>
                </header>

                <main className="admin-content">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
