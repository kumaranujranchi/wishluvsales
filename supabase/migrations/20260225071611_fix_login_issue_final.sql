/*
  # Fix Login Issue - Remove Recursion from RLS Policies
  
  1. Problem
    - The `get_my_role()` function in RLS policies causes recursion during login
    - This prevents users from logging in successfully
  
  2. Solution
    - Use auth.jwt() metadata instead of querying profiles table
    - This breaks the recursion cycle
  
  3. Changes
    - Drop all existing policies on profiles table
    - Create new simplified policies that use auth.jwt() for role checking
    - Keep the base policy that allows users to view their own profile
*/

BEGIN;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Admins full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Privileged readers view all profiles" ON profiles;
DROP POLICY IF EXISTS "Standard users view active profiles" ON profiles;

-- Create new policies without recursion

-- 1. Base policy: Users can always view and update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO public
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Admin access: Check role from JWT metadata
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO public
  USING (
    COALESCE(
      auth.jwt()->>'role',
      (auth.jwt()->'user_metadata'->>'role')
    ) IN ('super_admin', 'admin')
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO public
  WITH CHECK (
    COALESCE(
      auth.jwt()->>'role',
      (auth.jwt()->'user_metadata'->>'role')
    ) IN ('super_admin', 'admin')
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO public
  USING (
    COALESCE(
      auth.jwt()->>'role',
      (auth.jwt()->'user_metadata'->>'role')
    ) IN ('super_admin', 'admin')
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO public
  USING (
    COALESCE(
      auth.jwt()->>'role',
      (auth.jwt()->'user_metadata'->>'role')
    ) IN ('super_admin', 'admin')
  );

-- 3. Director and Receptionist: Can view all profiles
CREATE POLICY "Director and Receptionist can view all profiles"
  ON profiles FOR SELECT
  TO public
  USING (
    COALESCE(
      auth.jwt()->>'role',
      (auth.jwt()->'user_metadata'->>'role')
    ) IN ('director', 'receptionist')
  );

-- 4. Other users: Can view active profiles (for directory)
CREATE POLICY "Authenticated users can view active profiles"
  ON profiles FOR SELECT
  TO public
  USING (
    auth.uid() IS NOT NULL 
    AND is_active = true
  );

COMMIT;