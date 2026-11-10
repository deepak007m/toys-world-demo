import { supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const profileEmail = document.getElementById('profile-email');
    const profileName = document.getElementById('profile-name');
    const profilePhone = document.getElementById('profile-phone');
    let activeUserId = null;
    let profileLoadToken = 0;

    const clearProfileFields = () => {
        profileEmail.value = '';
        profileName.value = '';
        profilePhone.value = '';
    };

    const loadProfile = async (user) => {
        const loadToken = ++profileLoadToken;
        clearProfileFields();
        profileEmail.value = user.email || '';

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, phone, avatar_url, created_at, updated_at')
                .eq('id', user.id)
                .limit(1);

            if (loadToken !== profileLoadToken || activeUserId !== user.id) return;

            if (error) {
                console.error('[Toys World] Profile Load Error:', error);
                showMsg(document.getElementById('profile-msg'), 'Failed to load profile data securely.', 'error');
                return;
            }

            const profile = data?.[0];
            if (profile) {
                profileName.value = profile.full_name || '';
                profilePhone.value = profile.phone || '';
            } else {
                profileName.value = user.user_metadata?.full_name || '';
            }
        } catch (err) {
            if (loadToken === profileLoadToken && activeUserId === user.id) {
                console.error('[Toys World] Unexpected error loading profile:', err);
            }
        }
    };

    const applySession = async (session) => {
        const user = session?.user;
        if (!user?.id) {
            activeUserId = null;
            profileLoadToken += 1;
            clearProfileFields();
            window.location.replace('/login.html?redirect=%2Faccount.html');
            return;
        }

        activeUserId = user.id;
        document.body.style.opacity = '0';
        await loadProfile(user);
        if (activeUserId === user.id) document.body.style.opacity = '1';
    };

    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
        window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
    }

    await applySession(session);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        if (nextSession?.user?.id === activeUserId) return;
        await applySession(nextSession);
    });

    // 2. Setup Nav Tabs
    const menuButtons = document.querySelectorAll('.account-menu button[data-target]');
    const sections = document.querySelectorAll('.content-section');

    menuButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            menuButtons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`section-${btn.dataset.target}`).classList.add('active');
        });
    });

    // 4. Handle Profile Updates
    const profileForm = document.getElementById('profile-form');
    const profileMsg = document.getElementById('profile-msg');
    const profileBtn = document.getElementById('profile-submit');

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMsg(profileMsg);
        if (!activeUserId) {
            showMsg(profileMsg, 'Your session has expired. Please sign in again.', 'error');
            return;
        }
        profileBtn.disabled = true;
        profileBtn.textContent = 'Saving...';

        const updatePayload = {
            full_name: document.getElementById('profile-name').value,
            phone: document.getElementById('profile-phone').value,
            updated_at: new Date()
        };

        try {
            // STRICTLY UPDATE. No UPSERT or INSERT is allowed by the new frontend architecture.
            const { error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', activeUserId);

            if (error) throw error;

            showMsg(profileMsg, 'Profile updated successfully!', 'success');

            // Sync auth metadata mirror
            supabase.auth.updateUser({
                data: { full_name: updatePayload.full_name }
            });

        } catch (err) {
            console.error('Save Error:', err);
            showMsg(profileMsg, err.message, 'error');
        } finally {
            profileBtn.disabled = false;
            profileBtn.textContent = 'Save Changes';
        }
    });

    // 5. Handle Password Updates
    const pwdForm = document.getElementById('password-form');
    const pwdMsg = document.getElementById('pwd-msg');
    const pwdBtn = document.getElementById('pwd-submit');

    pwdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMsg(pwdMsg);

        const p1 = document.getElementById('new-password').value;
        const p2 = document.getElementById('confirm-new-password').value;

        if (p1 !== p2) {
            showMsg(pwdMsg, 'Passwords do not match.', 'error');
            return;
        }
        if (p1.length < 6) {
            showMsg(pwdMsg, 'Password must be at least 6 characters.', 'error');
            return;
        }

        pwdBtn.disabled = true;
        pwdBtn.textContent = 'Updating...';

        try {
            const { error } = await supabase.auth.updateUser({ password: p1 });
            if (error) throw error;
            showMsg(pwdMsg, 'Password updated successfully!', 'success');
            pwdForm.reset();
        } catch (err) {
            showMsg(pwdMsg, err.message, 'error');
        } finally {
            pwdBtn.disabled = false;
            pwdBtn.textContent = 'Update Password';
        }
    });

    // 6. Sign Out
    document.getElementById('signout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
    });

    function showMsg(el, text, type) {
        el.textContent = text;
        el.className = `status-msg ${type}`;
        el.style.display = 'block';
    }
    function hideMsg(el) {
        el.style.display = 'none';
        el.textContent = '';
    }
});
