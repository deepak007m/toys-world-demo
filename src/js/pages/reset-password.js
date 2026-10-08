import { supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-form');
    const errorBox = document.getElementById('auth-error-box');
    const successBox = document.getElementById('auth-success-box');
    const submitBtn = document.getElementById('submit-btn');

    if (!form) return;

    // Supabase Auth handles the hash fragment from the email link which contains the access_token.
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
            // User session is restored via recovery token
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
        }

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;

        if (password !== confirmPassword) {
            if (errorBox) {
                errorBox.style.display = 'block';
                errorBox.textContent = 'Passwords do not match.';
            }
            return;
        }

        if (password.length < 6) {
            if (errorBox) {
                errorBox.style.display = 'block';
                errorBox.textContent = 'Password must be at least 6 characters.';
            }
            return;
        }

        if (submitBtn) {
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            form.style.display = 'none';
            if (successBox) {
                successBox.style.display = 'block';
            }

            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1500);

        } catch (error) {
            if (errorBox) {
                errorBox.style.display = 'block';
                errorBox.textContent = error.message;
            }
            if (submitBtn) {
                submitBtn.textContent = 'Save Password';
                submitBtn.disabled = false;
            }
        }
    });
});

