-- ============================================================
-- Toys World — Final Customer Auth Fix
-- Migration: 009_profiles_final_fix.sql
--
-- EXACT DIAGNOSIS:
-- 1. The 406 is a strict PostgREST error thrown when a client provides
--    the `Accept: application/vnd.pgrst.object+json` header (which both 
--    .single() and .maybeSingle() send) but no row exists.
-- 2. The row did not exist for CURRENT users because they signed up 
--    *before* the trigger in 007 was applied. 
-- 3. We do NOT want the frontend to execute INSERTs. We want strict
--    trigger-based profile provisioning.
--
-- CORRECTIVE ACTION:
-- A. Sweep `auth.users` and automatically insert missing profiles for 
--    any user who signed up before the trigger was created.
-- B. Resolidify the trigger and ensure the search_path is safe.
-- C. Re-enforce strictly SELECT and UPDATE on RLS, wiping out the 
--    need for any frontend INSERT privileges (from 008). 
-- ============================================================

-- ── 1. Create Missing Profiles for Existing Users ─────────────
-- This guarantees every user currently in the system gets a profile,
-- completely eradicating the chance of a 0-row response (406).
INSERT INTO public.profiles (id, full_name, created_at, updated_at)
SELECT 
    id, 
    raw_user_meta_data->>'full_name',
    created_at,
    NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- ── 2. Reinforce the Trigger Structure ────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public', 'pg_catalog' -- Explicit safe search_path
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name' 
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_signup();

-- ── 3. Reset Table Privileges ─────────────────────────────────
-- Revoke INSERT granted in 008, as frontend INSERT is forbidden.
REVOKE INSERT ON public.profiles FROM authenticated;
-- Ensure SELECT and UPDATE are explicitly granted
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- ── 4. Re-enforce RLS Policies ────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all old policies to prevent redundancy
DROP POLICY IF EXISTS "Customers can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Customers can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Customers can insert own profile" ON public.profiles;

-- Create minimal, exact policies
CREATE POLICY "Customers can view own profile" 
    ON public.profiles 
    FOR SELECT 
    TO authenticated 
    USING (id = auth.uid());

CREATE POLICY "Customers can update own profile" 
    ON public.profiles 
    FOR UPDATE 
    TO authenticated 
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
