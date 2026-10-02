import { supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorBox = document.getElementById('auth-error-box');
    const submitBtn = document.getElementById('submit-btn');
    const signupLink = document.getElementById('signup-link');

    // Handle redirect param
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('redirect') || '/account.html';

    if (signupLink) {
        signupLink.href = `/signup.html?redirect=${encodeURIComponent(redirectPath)}`;
    }

    // Pre-check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            window.location.href = redirectPath;
        }
    });

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
