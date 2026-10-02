-- ============================================================
-- Toys World — Customer Authentication & Profiles
-- Migration: 007_customer_auth.sql
--
-- REASON FOR MIGRATION:
--   Implements the foundation for public customer accounts natively
--   tied to Supabase Auth (auth.users).
--
-- CHANGES:
--   1. Create `public.profiles` table linked strictly to auth.uid().
--   2. Implement a dedicated trigger on auth.users to auto-create 
--      the corresponding public.profile row safely upon signup.
--   3. Apply RLS ensuring customers can only SELECT/UPDATE their own profile.
--   4. Apply explicit underlying table GRANT privileges.
-- ============================================================

-- ── 1. Create Profiles Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name    TEXT,
    phone        TEXT,
    avatar_url   TEXT,
    
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at tracking (reusing existing update_updated_at function)
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ── 2. Automatic Profile Creation on Signup ───────────────────
-- This function executes automatically inside the database whenever
-- a row is inserted into the `auth.users` schema by Supabase Auth.
-- It securely scaffolds the public.profiles record using SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        -- Attempt to pull name from raw_user_meta_data if provided during signUp()
        NEW.raw_user_meta_data->>'full_name' 
    );
    RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_signup();


-- ── 3. Table Privileges (GRANTS) ──────────────────────────────
-- Authenticated users need to interact with the profiles table.
-- Anon users technically do not need access to profiles right now.
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- (If a customer specifically needs to delete their account from the frontend
-- later, DELETE would be granted, but for Phase 4, UPDATE/SELECT is enough.)


-- ── 4. Row Level Security (RLS) ──────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- A user can read exactly their own profile. Let's explicitly check auth.uid().
DROP POLICY IF EXISTS "Customers can view own profile" ON public.profiles;
CREATE POLICY "Customers can view own profile" 
    ON public.profiles 
    FOR SELECT 
    TO authenticated 
    USING ((id = auth.uid()));

-- A user can update exactly their own profile.
DROP POLICY IF EXISTS "Customers can update own profile" ON public.profiles;
CREATE POLICY "Customers can update own profile" 
    ON public.profiles 
    FOR UPDATE 
    TO authenticated 
    USING ((id = auth.uid()))
    WITH CHECK ((id = auth.uid()));

-- No INSERT policy is created for customers because row creation 
-- is handled securely inside the database by `handle_new_user_signup` trigger.
-- No DELETE policy is created for customers (Phase 4 scope restriction).

-- Admin users (whitelist) are NOT granted explicit arbitrary access to customer
-- profiles in this migration to enforce strict privacy, but they could be manually
-- added later if the Store Owner needs to overwrite customer names.
