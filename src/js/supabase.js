/**
 * Supabase client — single shared instance for the public storefront.
 * Import `supabase` from this module in data.js only.
 * Never import this directly in HTML pages.
 *
 * Keys are read from environment variables:
 *   VITE_SUPABASE_URL      → your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY → the public anon/publishable key
 *
 * NEVER use the service-role key on the frontend.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
    console.error(
        '[Toys World] Supabase environment variables are missing.\n' +
        'Create a .env file from .env.example and fill in your project URL and anon key.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnon);
