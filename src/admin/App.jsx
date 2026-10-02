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

function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading Admin...</div>;
    }

    // Protected Route Wrapper
    const ProtectedRoute = ({ children }) => {
        if (!session) {
            return <Navigate to="/login" replace />;
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
        </Routes>
    );
}

export default App;
