import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '../js/supabase.js';

import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import ProductForm from './pages/ProductForm.jsx';
import Categories from './pages/Categories.jsx';
import Settings from './pages/Settings.jsx';
import Orders from './pages/Orders.jsx';
import Reviews from './pages/Reviews.jsx';
import Coupons from './pages/Coupons.jsx';
import Enquiries from './pages/Enquiries.jsx';
import Analytics from './pages/Analytics.jsx';
import ManualSales from './pages/ManualSales.jsx';

function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adminCheckLoading, setAdminCheckLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function checkAdminAccess() {
            if (!session?.user?.id) {
                setIsAdmin(false);
                setAdminCheckLoading(false);
                return;
            }

            setAdminCheckLoading(true);
            const { data, error } = await supabase
                .from('admin_users')
                .select('user_id')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (cancelled) return;
            setIsAdmin(!error && data?.user_id === session.user.id);
            setAdminCheckLoading(false);
        }

        checkAdminAccess();
        return () => { cancelled = true; };
    }, [session]);

    if (loading) {
        return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading Admin...</div>;
    }

    // Protected Route Wrapper
    const ProtectedRoute = ({ children }) => {
        if (!session) {
            return <Navigate to="/login" replace />;
        }
        if (adminCheckLoading) {
            return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Checking administrator access...</div>;
        }
        if (!isAdmin) {
            return (
                <div style={{ color: 'white', padding: '3rem', textAlign: 'center' }}>
                    <h1>Administrator access required</h1>
                    <p style={{ margin: '1rem 0 2rem', color: 'var(--text-secondary)' }}>
                        This account can browse the customer storefront but is not authorized for the admin dashboard.
                    </p>
                    <a href="/" className="btn btn-primary">View Storefront</a>
                </div>
            );
        }
        return <Layout session={session}>{children}</Layout>;
    };

    return (
        <Routes>
            {/* Public Admin Routes */}
            <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />

            {/* Protected Admin Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/products"
                element={
                    <ProtectedRoute>
                        <Products />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/products/new"
                element={
                    <ProtectedRoute>
                        <ProductForm />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/products/:id/edit"
                element={
                    <ProtectedRoute>
                        <ProductForm />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/categories"
                element={
                    <ProtectedRoute>
                        <Categories />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                }
            />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/manual-sales" element={<ProtectedRoute><ManualSales /></ProtectedRoute>} />
            <Route
                path="/orders"
                element={
                    <ProtectedRoute>
                        <Orders />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reviews"
                element={
                    <ProtectedRoute>
                        <Reviews />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/coupons"
                element={
                    <ProtectedRoute>
                        <Coupons />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/enquiries"
                element={
                    <ProtectedRoute>
                        <Enquiries />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

export default App;
