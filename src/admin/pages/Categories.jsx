import React, { useState, useEffect } from 'react';
import { supabase } from '../../js/supabase.js';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategoryId, setActiveCategoryId] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const [catRes, subcatRes] = await Promise.all([
            supabase.from('categories').select('*').order('sort_order'),
            supabase.from('subcategories').select('*').order('sort_order')
        ]);

        if (catRes.data) {
            setCategories(catRes.data);
            if (catRes.data.length > 0 && !activeCategoryId) {
                setActiveCategoryId(catRes.data[0].id);
            }
        }
        if (subcatRes.data) setSubcategories(subcatRes.data);

        setLoading(false);
    }

    const handleDeleteCategory = async (id) => {
        // Check if products exist
        const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category_id', id);
        if (count > 0) {
            alert(`Cannot delete category. There are ${count} products associated with it. Reassign them first.`);
            return;
        }

        if (!window.confirm("Delete this category? Subcategories will also be deleted.")) return;

        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) alert("Error: " + error.message);
        else await loadData();
    };

    const handleDeleteSubcat = async (id) => {
        // Check if products exist
        const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('subcategory_id', id);
        if (count > 0) {
            alert(`Cannot delete subcategory. There are ${count} products associated with it. Reassign them first.`);
            return;
        }

        if (!window.confirm("Delete this subcategory?")) return;

        const { error } = await supabase.from('subcategories').delete().eq('id', id);
        if (error) alert("Error: " + error.message);
        else await loadData();
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading categories...</div>;

    const activeCategory = categories.find(c => c.id === activeCategoryId);
    const activeSubcats = subcategories.filter(s => s.category_id === activeCategoryId);

    return (
        <div>
            <h1 className="page-title" style={{ marginBottom: '2rem' }}>Categories & Subcategories</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: '2rem' }}>

                {/* Categories List */}
                <div className="admin-card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Categories</h3>
                        <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => alert("Add category form would open here (simplified for this task)")}>+ Add</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {categories.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setActiveCategoryId(c.id)}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    background: activeCategoryId === c.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    border: activeCategoryId === c.id ? '1px solid var(--border-strong)' : '1px solid transparent',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.color_accent || 'var(--text-secondary)' }}></div>
                                    <span style={{ fontWeight: activeCategoryId === c.id ? 600 : 400 }}>{c.title}</span>
                                </div>
                                {activeCategoryId === c.id && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c.id) }} style={{ color: 'var(--status-danger)', fontSize: '0.75rem', padding: '0.2rem' }}>Delete</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Subcategories Details */}
                <div className="admin-card" style={{ padding: '2rem' }}>
                    {activeCategory ? (
                        <>
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{activeCategory.title}</h2>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-admin-base)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Slug: {activeCategory.slug}</span>
                                </div>
                                <p style={{ color: 'var(--text-secondary)' }}>{activeCategory.description}</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Subcategories ({activeSubcats.length})</h3>
                                <button className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => alert("Add subcategory form would open here")}>+ Add Subcategory</button>
                            </div>

                            {activeSubcats.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-admin-base)', borderRadius: 'var(--radius-sm)' }}>
                                    No subcategories for {activeCategory.title}.
                                </div>
                            ) : (
                                <div className="admin-table-container">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Slug</th>
                                                <th>Sort Order</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeSubcats.map(s => (
                                                <tr key={s.id}>
                                                    <td style={{ fontWeight: 500 }}>{s.title}</td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>{s.slug}</td>
                                                    <td>{s.sort_order}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button onClick={() => handleDeleteSubcat(s.id)} style={{ color: 'var(--status-danger)', fontSize: '0.8rem', padding: '0.4rem' }}>
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 0' }}>Select a category to view details.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Categories;
