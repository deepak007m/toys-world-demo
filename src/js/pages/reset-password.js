import { supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-form');
    const errorBox = document.getElementById('auth-error-box');
    const successBox = document.getElementById('auth-success-box');
    const submitBtn = document.getElementById('submit-btn');

    // Supabase Auth naturally handles the hash fragment from the email link
    // which contains the access_token. We just listen for it.

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event == "PASSWORD_RECOVERY") {
            // The user is ready to reset password.
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        errorBox.style.display = 'none';
        errorBox.textContent = '';

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;

        if (password !== confirmPassword) {
            errorBox.style.display = 'block';
            errorBox.textContent = 'Passwords do not match.';
            return;
        }

        if (password.length < 6) {
            errorBox.style.display = 'block';
            errorBox.textContent = 'Password must be at least 6 characters.';
            return;
        }

        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            form.style.display = 'none';
            successBox.style.display = 'block';

        } catch (error) {
            errorBox.style.display = 'block';
            errorBox.textContent = error.message;
            submitBtn.textContent = 'Save Password';
            submitBtn.disabled = false;
        }
    });
});
