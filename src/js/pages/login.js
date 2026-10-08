import { supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorBox = document.getElementById('auth-error-box');
    const submitBtn = document.getElementById('submit-btn');
    const signupLink = document.getElementById('signup-link');
    const googleBtn = document.getElementById('google-btn');

    // Handle redirect param
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('redirect') || '/account.html';

    if (signupLink) {
        signupLink.href = `/signup.html?redirect=${encodeURIComponent(redirectPath)}`;
    }

    // Pre-check if already logged in
    supabase.auth.getSession().then((res) => {
        if (res?.data?.session) {
            window.location.href = redirectPath;
        }
    }).catch(() => { });

    // ── Google OAuth ──────────────────────────────────────────────
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            googleBtn.disabled = true;
            googleBtn.textContent = 'Redirecting to Google...';

            if (errorBox) {
                errorBox.style.display = 'none';
                errorBox.textContent = '';
            }

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/account.html',
                },
            });

            if (error) {
                if (errorBox) {
                    errorBox.style.display = 'block';
                    errorBox.textContent = error.message;
                }
                googleBtn.disabled = false;
                googleBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Continue with Google`;
            }
            // On success: Supabase redirects the browser to Google — no further action needed.
        });
    }

    // ── Email/Password Login ──────────────────────────────────────
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        errorBox.style.display = 'none';
        errorBox.textContent = '';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            console.log('DIAGNOSTIC_LOGIN_DATA_USER:', JSON.stringify(data.user));
            console.log('DIAGNOSTIC_LOGIN_SESSION:', JSON.stringify(data.session));
            console.log('DIAGNOSTIC_LOGIN_ERROR:', JSON.stringify(error));

            // Success - let auth listener header update, and redirect
            window.location.href = redirectPath;

        } catch (error) {
            errorBox.style.display = 'block';
            errorBox.textContent = error.message;
            submitBtn.textContent = 'Sign In';
            submitBtn.disabled = false;
        }
    });
});

