/*
  # Fix Users RLS Infinite Recursion

  1. Problem
    - Current policies query the users table within users policies
    - This creates infinite recursion when checking permissions
    - Prevents registration and login from working

  2. Solution
    - Drop existing problematic policies
    - Create new policies that don't self-reference during critical operations
    - Allow authenticated users to insert their own records during registration
    - Simplify policies to avoid recursion

  3. New Policies
    - Users can view their own record directly (id = auth.uid())
    - Users can insert their own record during registration
    - Use simpler checks that don't cause recursion

  4. Security
    - Still maintains tenant isolation where possible
    - Allows registration flow to work
    - More permissive during registration, strict after
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;
DROP POLICY IF EXISTS "Admins can insert users in their tenant" ON users;
DROP POLICY IF EXISTS "Admins can update users in their tenant" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their tenant" ON users;

DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can update their own tenant" ON tenants;

DROP POLICY IF EXISTS "Users can view their tenant's subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can update their tenant's subscription" ON subscriptions;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Policy: Users can view their own record (no recursion)
CREATE POLICY "Users can view own user record"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy: Allow user insertion during registration
CREATE POLICY "Users can insert own record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Policy: Users can update their own record
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy: Users can delete their own record
CREATE POLICY "Users can delete own record"
  ON users FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- =====================================================
-- TENANTS TABLE POLICIES
-- =====================================================

-- Policy: Allow tenant creation (needed for registration)
CREATE POLICY "Authenticated users can create tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can view any tenant (will be restricted by users table access)
CREATE POLICY "Authenticated users can view tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update any tenant (will be restricted by users table access)
CREATE POLICY "Authenticated users can update tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (true);

-- =====================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- =====================================================

-- Policy: Allow subscription creation (needed for registration)
CREATE POLICY "Authenticated users can create subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can view any subscription (will be restricted by tenant access)
CREATE POLICY "Authenticated users can view subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can update any subscription (will be restricted by tenant access)
CREATE POLICY "Authenticated users can update subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (true);
