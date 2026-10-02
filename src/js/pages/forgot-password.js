import { supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-form');
    const errorBox = document.getElementById('auth-error-box');
    const successBox = document.getElementById('auth-success-box');
    const submitBtn = document.getElementById('submit-btn');
    const loginLinkContainer = document.getElementById('login-link-container');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        errorBox.style.display = 'none';
        errorBox.textContent = '';

        const email = document.getElementById('email').value.trim();

        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`,
            });

            if (error) throw error;

            form.style.display = 'none';
            loginLinkContainer.style.display = 'none';
            successBox.style.display = 'block';

        } catch (error) {
            errorBox.style.display = 'block';
            errorBox.textContent = error.message;
            submitBtn.textContent = 'Send Reset Link';
            submitBtn.disabled = false;
        }
    });
});
