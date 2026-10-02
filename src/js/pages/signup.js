import { supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const errorBox = document.getElementById('auth-error-box');
    const successBox = document.getElementById('auth-success-box');
    const submitBtn = document.getElementById('submit-btn');
    const loginLinkContainer = document.getElementById('login-link-container');
    const loginLink = document.getElementById('login-link');

    // Handle redirect param
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('redirect') || '/account.html';

    if (loginLink) {
        loginLink.href = `/login.html?redirect=${encodeURIComponent(redirectPath)}`;
    }

    // Pre-check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            window.location.href = redirectPath;
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        errorBox.style.display = 'none';
        errorBox.textContent = '';

        const fullName = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;

        if (password !== confirmPassword) {
            errorBox.style.display = 'block';
            errorBox.textContent = 'Passwords do not match.';
            return;
        }

        if (password.length < 6) {
            errorBox.style.display = 'block';
            errorBox.textContent = 'Password must be at least 6 characters long.';
            return;
        }

        submitBtn.textContent = 'Creating account...';
        submitBtn.disabled = true;

        try {
            // Pass full_name as metadata so the DB trigger can extract it for public.profiles
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            console.log('DIAGNOSTIC_SIGNUP_DATA_USER:', JSON.stringify(data.user));
            console.log('DIAGNOSTIC_SIGNUP_SESSION:', JSON.stringify(data.session));
            console.log('DIAGNOSTIC_SIGNUP_ERROR:', JSON.stringify(error));

            // If email confirmation is enabled on this Supabase project, 
            // the user will receive session: null and user.identities
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                throw new Error("This email is already registered. Please sign in instead.");
            }

            if (data.session) {
                window.location.href = redirectPath;
            } else {
                // Show success state
                signupForm.style.display = 'none';
                loginLinkContainer.style.display = 'none';
                successBox.style.display = 'block';
            }

        } catch (error) {
            errorBox.style.display = 'block';
            errorBox.textContent = error.message;
            submitBtn.textContent = 'Sign Up';
            submitBtn.disabled = false;
        }
    });
});
