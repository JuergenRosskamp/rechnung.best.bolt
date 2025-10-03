-- Check if user exists in auth.users but not in users table
-- and display status

DO $$
DECLARE
  auth_user_id uuid;
  profile_exists boolean;
  tenant_exists boolean;
BEGIN
  -- Get auth user ID
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'juergen.rosskamp@gmail.com';

  IF auth_user_id IS NULL THEN
    RAISE NOTICE '✅ No auth user found. You can register with this email.';
    RETURN;
  END IF;

  RAISE NOTICE '📧 Auth user found: %', auth_user_id;

  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = auth_user_id) INTO profile_exists;

  IF profile_exists THEN
    RAISE NOTICE '👤 User profile exists.';

    -- Check if tenant exists
    SELECT EXISTS(
      SELECT 1 FROM tenants
      WHERE id = (SELECT tenant_id FROM users WHERE id = auth_user_id)
    ) INTO tenant_exists;

    IF tenant_exists THEN
      RAISE NOTICE '✅ Complete user setup found. You should be able to login.';
    ELSE
      RAISE NOTICE '⚠️  Profile exists but tenant is missing!';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Auth user exists but profile is missing.';
    RAISE NOTICE '🗑️  Please delete this auth user to re-register:';
    RAISE NOTICE 'DELETE FROM auth.users WHERE id = ''%'';', auth_user_id;
  END IF;
END $$;
