-- ============================================================================
-- OWNER-ONLY SQL SCRIPT
-- ============================================================================
-- This script contains operations that require project owner/service_role privileges
-- Run this ONLY if the main SETUP_DATABASE.sql script fails with permission errors
-- ============================================================================

-- ============================================================================
-- OPTION 1: Create a safe view of auth.users (if needed for debugging)
-- ============================================================================
-- This view exposes only non-sensitive auth.users data
-- Uncomment if you need to query auth.users from your application

/*
CREATE OR REPLACE VIEW public.safe_auth_users AS
SELECT
  id,
  email,
  created_at,
  updated_at,
  last_sign_in_at
FROM auth.users;

GRANT SELECT ON public.safe_auth_users TO authenticated;

COMMENT ON VIEW public.safe_auth_users IS
'Safe view of auth.users exposing only non-sensitive fields. Use this instead of querying auth.users directly.';
*/

-- ============================================================================
-- OPTION 2: Trigger to auto-sync auth.users with public.users
-- ============================================================================
-- This trigger automatically creates a public.users row when auth.users row is created
-- This ensures referential integrity between auth.users and public.users

/*
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if user doesn't already exist
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'office')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

COMMENT ON FUNCTION public.handle_new_auth_user() IS
'Automatically creates a public.users profile when a new auth.users record is created';
*/

-- ============================================================================
-- OPTION 3: Manual grants (if SECURITY DEFINER functions fail)
-- ============================================================================
-- If the helper functions cannot be created with SECURITY DEFINER by non-owner,
-- run these grants as owner:

/*
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_is_admin() FROM anon, public;
*/

-- ============================================================================
-- OPTION 4: Storage bucket creation (if INSERT fails in main script)
-- ============================================================================
-- If the storage bucket creation fails due to permissions, use Supabase UI:
-- 1. Go to: Storage > Buckets
-- 2. Click: New bucket
-- 3. Name: receipts
-- 4. Public: OFF (private)
-- 5. File size limit: 10 MB (recommended)
-- 6. Allowed MIME types: image/*, application/pdf

-- Or run this as service_role:
/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify setup is correct:

-- Check if users table is populated
-- SELECT COUNT(*) as user_count FROM public.users;

-- Check if helper functions exist
-- SELECT proname, pronamespace::regnamespace
-- FROM pg_proc
-- WHERE proname IN ('get_user_tenant_id', 'user_is_admin');

-- Check RLS policies
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Check storage bucket
-- SELECT id, name, public FROM storage.buckets WHERE id = 'receipts';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. The main SETUP_DATABASE.sql should work for most users without this file
-- 2. Only use this file if you encounter permission errors
-- 3. All operations here require project owner or service_role privileges
-- 4. Always test with a non-admin user after running to verify RLS works
-- ============================================================================
