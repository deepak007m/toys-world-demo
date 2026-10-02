import { supabase } from '../supabase.js';

console.log('TOYS WORLD ACCOUNT.JS LOADED — VERSION 10');
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial Auth Check
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();

    console.log("AUTH USER ID:", user?.id);
    console.log("AUTH USER EMAIL:", user?.email);
    console.log("AUTH ERROR:", authError);

    if (!session) {
        window.location.replace(`/login.html?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
    }

    document.body.style.opacity = '1';

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

    // 3. Load Profile Data Safely
    // We strictly use array limiting instead of single() to completely bypass PostgREST's 
    // network-level 406 response if a race condition ever leaves a row uncreated.
    const loadProfile = async () => {
        document.getElementById('profile-email').value = user.email || '';

        try {
            console.log("PROFILE QUERY USER ID:", user.id);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, phone, avatar_url, created_at, updated_at')
                .eq('id', user.id)
                .limit(1);

            console.log("PROFILE RESULT:", data);
            console.log("PROFILE ERROR:", error);

            if (error) {
                console.error('[Toys World] Profile Load Error:', error);
                showMsg(document.getElementById('profile-msg'), 'Failed to load profile data securely.', 'error');
                return;
            }

            if (data && data.length > 0) {
                const profile = data[0];
                document.getElementById('profile-name').value = profile.full_name || '';
                document.getElementById('profile-phone').value = profile.phone || '';
            } else {
                // If profile truly genuinely doesn't exist, handle it quietly
                console.warn('[Toys World] Profile row not found. Re-syncing from auth metadata.');
                document.getElementById('profile-name').value = user.user_metadata?.full_name || '';
            }
        } catch (err) {
            console.error('[Toys World] Unexpected error loading profile:', err);
        }
    };

    loadProfile();

    // 4. Handle Profile Updates
    const profileForm = document.getElementById('profile-form');
    const profileMsg = document.getElementById('profile-msg');
    const profileBtn = document.getElementById('profile-submit');

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMsg(profileMsg);
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
                .eq('id', user.id);

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
        window.location.href = '/login.html';
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
