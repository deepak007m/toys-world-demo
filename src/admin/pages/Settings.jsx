import React, { useState, useEffect } from 'react';
import { supabase } from '../../js/supabase.js';
import { uploadImage } from '../lib/adminData.js';

const Settings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [heroFile, setHeroFile] = useState(null);
    const [heroPreview, setHeroPreview] = useState('');

    const [storyFile, setStoryFile] = useState(null);
    const [storyPreview, setStoryPreview] = useState('');

    useEffect(() => {
        async function fetchSettings() {
            const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
            if (data) {
                setSettings({
                    id: data.id,
                    store_name: data.store_name || '',
                    tagline: data.tagline || '',
                    whatsapp_number: data.whatsapp_number || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    map_link: data.map_link || '',
                    instagram_handle: data.instagram_handle || '',
                    instagram_url: data.instagram_url || '',
                    hero_image_url: data.hero_image_url || '',
                    story_image_url: data.story_image_url || ''
                });
                setHeroPreview(data.hero_image_url || '');
                setStoryPreview(data.story_image_url || '');
            } else if (error) {
                setError(error.message);
            }
            setLoading(false);
        }
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleHeroChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setHeroFile(file);
            setHeroPreview(URL.createObjectURL(file));
        }
    };

    const handleStoryChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setStoryFile(file);
            setStoryPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            let finalHero = settings.hero_image_url;
            let finalStory = settings.story_image_url;

            if (heroFile) {
                finalHero = await uploadImage(heroFile, `settings/hero`);
            }
            if (storyFile) {
                finalStory = await uploadImage(storyFile, `settings/story`);
            }

            const payload = {
                ...settings,
                hero_image_url: finalHero,
                story_image_url: finalStory
            };

            const { error: updateErr } = await supabase
                .from('store_settings')
                .update(payload)
                .eq('id', settings.id);

            if (updateErr) throw updateErr;

            setSuccess("Store settings updated successfully. Changes will reflect on the live site immediately.");
            setSettings(payload);

        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading settings...</div>;

    return (
        <div>
            <h1 className="page-title">Store Settings</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Manage your storefront branding and contact details.</p>

            {error && <div style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
            {success && <div style={{ background: 'var(--status-success-bg)', color: 'var(--status-success)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{success}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '900px' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* General */}
                    <div className="admin-card">
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>General Information</h3>
                        <div className="form-group">
                            <label className="form-label">Store Name *</label>
                            <input type="text" name="store_name" value={settings.store_name} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tagline (Homepage)</label>
                            <input type="text" name="tagline" value={settings.tagline} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Store Address</label>
                            <textarea name="address" rows="3" value={settings.address} onChange={handleChange} />
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="admin-card">
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>Contact Details</h3>
                        <div className="form-group">
                            <label className="form-label">WhatsApp Number *</label>
                            <input type="text" name="whatsapp_number" value={settings.whatsapp_number} onChange={handleChange} required placeholder="919876543210 (No spaces or +)" />
                            <div className="form-helper">This number receives all product enquiries.</div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone Label (Optional)</label>
                            <input type="text" name="phone" value={settings.phone} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Visuals */}
                    <div className="admin-card">
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>Storefront Imagery</h3>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                Hero Background Image
                                {heroPreview && <button type="button" onClick={() => { setHeroFile(null); setHeroPreview(''); setSettings({ ...settings, hero_image_url: '' }) }} style={{ color: 'var(--status-danger)', fontSize: '0.75rem' }}>Clear</button>}
                            </label>
                            <div style={{ position: 'relative', height: '160px', background: 'var(--bg-admin-base)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                                {heroPreview ? (
                                    <img src={heroPreview} alt="Hero bg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>No hero image set</div>
                                )}
                                <label className="btn btn-primary" style={{ position: 'absolute', bottom: '1rem', right: '1rem', fontSize: '0.7rem', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
                                    Upload
                                    <input type="file" accept="image/*" onChange={handleHeroChange} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                Store Story Image
                                {storyPreview && <button type="button" onClick={() => { setStoryFile(null); setStoryPreview(''); setSettings({ ...settings, story_image_url: '' }) }} style={{ color: 'var(--status-danger)', fontSize: '0.75rem' }}>Clear</button>}
                            </label>
                            <div style={{ position: 'relative', height: '160px', background: 'var(--bg-admin-base)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                                {storyPreview ? (
                                    <img src={storyPreview} alt="Story visual" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>No story image set</div>
                                )}
                                <label className="btn btn-primary" style={{ position: 'absolute', bottom: '1rem', right: '1rem', fontSize: '0.7rem', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
                                    Upload
                                    <input type="file" accept="image/*" onChange={handleStoryChange} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ height: '48px', fontSize: '1rem' }} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
