-- ============================================================
-- Toys World — Profile Insert Fix
-- Migration: 008_profiles_insert_fix.sql
--
-- REASON FOR MIGRATION:
--   Users who signed up *before* the trigger in 007 was applied
--   don't have a profile row. When they hit "Save Changes" on
--   the account page, it attempts an UPSERT.
--   Because we didn't grant INSERT permissions, they are permanently
--   blocked from creating their missing profile row.
--
-- FIX:
--   1. Grant INSERT on public.profiles to authenticated users.
--   2. Add an RLS policy allowing customers to INSERT their own profile.
-- ============================================================

-- 1. Grant INSERT table privileges
GRANT INSERT ON public.profiles TO authenticated;

-- 2. Allow users to insert EXACTLY their own row (so they can't create rows for others)
DROP POLICY IF EXISTS "Customers can insert own profile" ON public.profiles;
CREATE POLICY "Customers can insert own profile" 
    ON public.profiles 
    FOR INSERT 
    TO authenticated 
    WITH CHECK ((id = auth.uid()));
