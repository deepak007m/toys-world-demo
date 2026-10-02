-- ============================================================
-- Toys World — Diagnostic SQL for Products
-- Run this in Supabase SQL Editor to verify database state.
-- It performs read-only checks.
-- ============================================================

-- 1. Check table privileges for anon and authenticated on products
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' AND table_name = 'products';

-- 2. Check if RLS is enabled on the products table (relrowsecurity = true)
SELECT 
    relname as table_name, 
    relrowsecurity as rls_enabled 
FROM pg_class 
WHERE relname = 'products';

-- 3. List all current RLS policies on the products table
SELECT 
    pol.polname as policy_name, 
    pol.polcmd as command,
    CASE 
        WHEN pol.polpermissive THEN 'PERMISSIVE' 
        ELSE 'RESTRICTIVE' 
    END as type,
    pol.polqual as using_expression,
    pol.polwithcheck as with_check_expression
FROM pg_policy pol
JOIN pg_class t ON pol.polrelid = t.oid
WHERE t.relname = 'products';

-- 4. Check definition and search_path of is_admin() function
SELECT 
    p.proname as function_name,
    p.prosecdef as is_security_definer,
    p.proconfig as config_settings,
    pg_get_functiondef(p.oid) as function_body
FROM pg_proc p
WHERE p.proname = 'is_admin';

-- 5. List entries in admin_users to confirm the whitelisted UID
SELECT * FROM public.admin_users;

-- 6. Check privileges on admin_users table
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' AND table_name = 'admin_users';

-- 7. Test if the current logged-in user satisfies is_admin()
-- (Run this while logged into the app, or simulate auth context)
SELECT public.is_admin();
