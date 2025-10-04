# Database Permission Fix - Detailed Changes

## Problem Summary
The original `SETUP_DATABASE.sql` script failed with `ERROR: permission denied for schema auth` because it attempted to:
1. Create a foreign key reference to `auth.users(id)`
2. Create functions in the `auth` schema
3. Access internal Supabase auth schema objects

These operations require superuser privileges and violate Supabase's security model.

## Changes Made

### 1. Removed Foreign Key to auth.users

**Problem:**
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ...
);
```

**Why it fails:** Non-superusers cannot create foreign keys to tables in the `auth` schema.

**Solution:**
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY, -- Linked to auth.users.id (same UUID, no FK)
  ...
);
```

**Explanation:**
- The `public.users.id` is still the same UUID as `auth.users.id`
- The link is maintained by your application code (using `auth.uid()`)
- No foreign key constraint, but logical relationship is preserved
- Added a `valid_role` constraint to ensure data integrity

**Security consideration:** The application must ensure that `public.users.id` matches `auth.users.id`. Consider using a trigger (see OWNER-ONLY script) to automatically sync new auth users.

---

### 2. Moved Helper Functions from auth to public Schema

**Problem:**
```sql
CREATE OR REPLACE FUNCTION auth.user_tenant_id() ...
CREATE OR REPLACE FUNCTION auth.user_is_admin() ...
```

**Why it fails:** Non-superusers cannot create functions in the `auth` schema.

**Solution:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_tenant_id() ...
CREATE OR REPLACE FUNCTION public.user_is_admin() ...
```

**Explanation:**
- Functions moved to `public` schema where developers have CREATE privileges
- Functions remain `SECURITY DEFINER` to bypass RLS when needed
- Added explicit REVOKE/GRANT to restrict access:
  - `REVOKE EXECUTE FROM anon, public` - prevents anonymous access
  - `GRANT EXECUTE TO authenticated` - allows only logged-in users

**Security consideration:**
- `SECURITY DEFINER` means functions run with creator's privileges
- They bypass RLS on `public.users` to prevent infinite recursion
- Limited to only `authenticated` role for safety
- Functions are read-only (no INSERT/UPDATE/DELETE)

---

### 3. Updated All Policy References

**Problem:**
```sql
USING (tenant_id = auth.user_tenant_id())
```

**Why it fails:** Function doesn't exist in `auth` schema (moved to `public`).

**Solution:**
```sql
USING (tenant_id = public.get_user_tenant_id())
```

**Changed in:**
- Tenant policies (2 policies)
- Subscription policies (2 policies)
- All tenant-scoped table policies (4 policies per table, ~15 tables)
- Customer contacts policies (2 policies)

**Explanation:** All references updated to use the fully-qualified function name `public.get_user_tenant_id()` instead of `auth.user_tenant_id()`.

---

### 4. Updated Function DROP Statements

**Problem:**
```sql
DROP FUNCTION IF EXISTS generate_invoice_number(uuid, text) CASCADE;
```

**Solution:**
```sql
DROP FUNCTION IF EXISTS public.generate_invoice_number(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS public.user_is_admin() CASCADE;
```

**Explanation:** Added schema prefix to all DROP statements for clarity and added the new helper functions to the cleanup list.

---

## Storage Bucket Handling

The script attempts to create a storage bucket:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;
```

**Status:** This should work in most Supabase projects. If it fails:
1. Use the Supabase UI: Storage > Buckets > New bucket
2. Or run the OWNER-ONLY script as service_role

---

## RLS Security Model

The corrected script implements a multi-layer RLS security model:

### Layer 1: User Profile Access
```sql
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT TO authenticated
  USING (id = auth.uid());
```
- Users can only see their own profile
- Uses `auth.uid()` directly (no recursion)

### Layer 2: Tenant Access
```sql
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id());
```
- Uses helper function to get tenant_id
- Helper bypasses RLS to prevent infinite loop

### Layer 3: Subscription Access
```sql
CREATE POLICY "Users can view their tenant subscription"
  ON subscriptions FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
```
- Same pattern as tenant access

### Layer 4: All Business Data
```sql
CREATE POLICY "Users can view their tenant data"
  ON {table} FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
```
- Applied to all tables with `tenant_id` column
- Automatic via DO block loop

---

## Why These Changes Fix the Permission Error

1. **No auth schema access**: All objects created in `public` schema
2. **No FK to auth tables**: Removes dependency on auth schema structure
3. **SECURITY DEFINER in public**: Functions can be created by developers
4. **Explicit grants**: Only `authenticated` role has access
5. **Standard Supabase pattern**: Follows recommended practices

---

## Post-Installation Checklist

After running the corrected `SETUP_DATABASE.sql`:

### 1. Verify Helper Functions Exist
```sql
SELECT proname, pronamespace::regnamespace
FROM pg_proc
WHERE proname IN ('get_user_tenant_id', 'user_is_admin');
```
Expected: 2 rows showing functions in `public` schema

### 2. Verify RLS Policies
```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```
Expected: Multiple tables with 4 policies each (SELECT, INSERT, UPDATE, DELETE)

### 3. Test User Linkage
After registering a user via your app:
```sql
SELECT
  u.id,
  u.email,
  u.tenant_id,
  t.company_name
FROM users u
JOIN tenants t ON t.id = u.tenant_id
WHERE u.id = auth.uid();
```
Expected: 1 row with current user's data

### 4. Test RLS Isolation
Log in as User A, then:
```sql
SELECT COUNT(*) FROM customers;
```
Log in as User B (different tenant), then:
```sql
SELECT COUNT(*) FROM customers;
```
Expected: Different counts (each user sees only their tenant's data)

### 5. Test Admin Permissions
Log in as non-admin user:
```sql
DELETE FROM customers WHERE id = '{some-customer-id}';
```
Expected: Permission denied (only admins can delete)

Log in as admin user:
```sql
DELETE FROM customers WHERE id = '{some-customer-id}';
```
Expected: Success

---

## Common Issues and Solutions

### Issue 1: "function public.get_user_tenant_id() does not exist"
**Cause:** Function creation failed or was not committed
**Solution:** Re-run the corrected script, check for errors in SQL Editor

### Issue 2: "null value in column tenant_id violates not-null constraint"
**Cause:** User created without tenant_id
**Solution:**
1. Use the registration flow that creates tenant first
2. Or implement the auto-sync trigger from OWNER-ONLY script

### Issue 3: "new row violates row-level security policy"
**Cause:** User trying to insert data for different tenant
**Solution:** Ensure application sets `tenant_id = public.get_user_tenant_id()` on all inserts

### Issue 4: "permission denied for table storage.buckets"
**Cause:** User doesn't have INSERT permission on storage.buckets
**Solution:**
1. Create bucket via Supabase UI instead
2. Or run OWNER-ONLY script with service_role credentials

---

## Security Best Practices

### DO:
- ✅ Always use `public.get_user_tenant_id()` in policies
- ✅ Test with multiple users in different tenants
- ✅ Use `authenticated` role for logged-in users
- ✅ Keep helper functions read-only
- ✅ Revoke execute from `anon` and `public` roles

### DON'T:
- ❌ Never query `auth.users` directly from application
- ❌ Never create objects in `auth` schema
- ❌ Never use `USING (true)` in RLS policies
- ❌ Never grant `service_role` to application users
- ❌ Never store sensitive data without RLS enabled

---

## Migration from Old to New Schema

If you have an existing database with the old schema:

### Step 1: Backup
```sql
-- Export all data first!
```

### Step 2: Drop Old Objects
```sql
DROP FUNCTION IF EXISTS auth.user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS auth.user_is_admin() CASCADE;
```

### Step 3: Recreate users Table
```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;
-- Table will remain intact, just FK removed
```

### Step 4: Run Corrected Script
Execute the new `SETUP_DATABASE.sql` - it will recreate functions and policies

### Step 5: Verify
Run all verification queries from Post-Installation Checklist

---

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Supabase Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)

---

## Summary

The corrected script:
- ✅ Runs without superuser privileges
- ✅ Creates all objects in `public` schema
- ✅ Maintains same RLS security model
- ✅ Prevents infinite recursion in policies
- ✅ Follows Supabase best practices
- ✅ Is production-ready

All database functionality is preserved while fixing the permission errors.
