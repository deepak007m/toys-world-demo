-- ============================================================
-- Toys World — Diagnostic Script
-- 009_diagnose.sql
--
-- This script does NOT modify data. It purely retrieves 
-- schema information, policies, grants, and trigger definitions
-- to diagnose why public.profiles rows are missing (yielding 406).
-- ============================================================

-- A. Does public.profiles exist? Columns & Types?
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles';

-- B. Primary key / Foreign key constraints
SELECT conname, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public' AND t.relname = 'profiles';

-- C. RLS state
SELECT relname, relrowsecurity, relforcerowsecurity 
FROM pg_class 
WHERE relname = 'profiles';

-- D. RLS policies
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- E. Grants
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'profiles';

-- F. Function Definition for Trigger
SELECT p.proname, p.prosecdef, pg_get_functiondef(p.oid) AS func_def
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user_signup' AND n.nspname = 'public';

-- G. Trigger attachment to auth.users
SELECT tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users' AND n.nspname = 'auth';

-- H. Is there a profile for the latest created user?
SELECT u.email, p.id IS NOT NULL as has_profile, p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;
