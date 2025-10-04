# Quick Fix Guide - Database Permission Error

## The Problem
```
ERROR: permission denied for schema auth
```

## The Solution (3 Steps)

### Step 1: Use the Corrected SQL File
The `SETUP_DATABASE.sql` file has been fixed to avoid `auth` schema access.

### Step 2: Run in Supabase SQL Editor
1. Go to your Supabase project: https://0ec90b57d6e95fcbda19832f.supabase.co
2. Click **SQL Editor** in left menu
3. Copy the entire content of `SETUP_DATABASE.sql`
4. Paste and click **Run**

### Step 3: Load Test Data
1. In the same SQL Editor
2. Copy the entire content of `SETUP_TESTDATA.sql`
3. Paste and click **Run**

---

## What Was Fixed?

### 1. Foreign Key Removed
**Before:**
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ...
);
```

**After:**
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY, -- Linked to auth.users.id (same UUID, no FK)
  ...
);
```

### 2. Functions Moved to public Schema
**Before:**
```sql
CREATE FUNCTION auth.user_tenant_id() ...
```

**After:**
```sql
CREATE FUNCTION public.get_user_tenant_id() ...
```

### 3. All Policy References Updated
**Before:**
```sql
USING (tenant_id = auth.user_tenant_id())
```

**After:**
```sql
USING (tenant_id = public.get_user_tenant_id())
```

---

## Verification (After Running Scripts)

### Check 1: Functions Exist
```sql
SELECT proname FROM pg_proc
WHERE proname IN ('get_user_tenant_id', 'user_is_admin');
```
Expected: 2 rows

### Check 2: Policies Exist
```sql
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
```
Expected: > 50 policies

### Check 3: Test Login
Use the app login page with:
- Email: `juergen.rosskamp@gmail.com`
- Password: `Test1234!`

Expected: Successful login, no RLS errors

---

## If It Still Fails

1. Check the error message in SQL Editor
2. If it says "permission denied for table storage.buckets":
   - Go to Storage > Buckets in Supabase UI
   - Create a bucket named "receipts" (private)
3. If it says "function does not exist":
   - Re-run the script
   - Check for typos in function names

---

## Need More Details?

See `DATABASE_PERMISSION_FIX.md` for:
- Complete explanation of all changes
- Security model documentation
- Troubleshooting guide
- Migration instructions

---

## Owner-Only Operations

If you need advanced features (auto-sync, triggers, etc.):
- See `SETUP_DATABASE_OWNER_ONLY.sql`
- Requires project owner or service_role access
- **Not needed for basic functionality**
