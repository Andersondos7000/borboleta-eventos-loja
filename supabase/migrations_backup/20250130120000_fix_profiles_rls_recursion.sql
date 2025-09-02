-- Migration: Fix RLS recursion in profiles table
-- Description: Remove recursive policies that cause infinite recursion
-- Author: Builder with MCP
-- Date: 2025-01-30

-- Drop existing problematic policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create non-recursive admin policies using auth.jwt() claims
-- This approach avoids querying the profiles table within the policy
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    -- Allow if user is viewing their own profile
    auth.uid() = id
    OR
    -- Allow if user has admin role in JWT claims
    (auth.jwt() ->> 'user_metadata' ->> 'role')::text IN ('admin', 'organizer')
    OR
    -- Fallback: check if user_metadata contains admin flag
    (auth.jwt() ->> 'user_metadata' ->> 'is_admin')::boolean = true
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    -- Allow if user is updating their own profile
    auth.uid() = id
    OR
    -- Allow if user has admin role in JWT claims
    (auth.jwt() ->> 'user_metadata' ->> 'role')::text IN ('admin', 'organizer')
    OR
    -- Fallback: check if user_metadata contains admin flag
    (auth.jwt() ->> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- Create a function to safely check admin role without recursion
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First check JWT claims
  IF (auth.jwt() ->> 'user_metadata' ->> 'role')::text IN ('admin', 'organizer') THEN
    RETURN true;
  END IF;
  
  -- Fallback check with explicit user_id to avoid recursion
  IF user_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_id 
      AND profiles.role IN ('admin', 'organizer')
    );
  END IF;
  
  RETURN false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO anon;

-- Update other tables' policies to use the safe function
-- Fix rls_performance_metrics policies
DROP POLICY IF EXISTS "Admins can view all metrics" ON public.rls_performance_metrics;
CREATE POLICY "Admins can view all metrics" ON public.rls_performance_metrics
  FOR SELECT
  USING (public.is_admin_user() OR user_id = auth.uid());

-- Comment for documentation
COMMENT ON FUNCTION public.is_admin_user(uuid) IS 'Safely checks if a user has admin privileges without causing RLS recursion. Uses JWT claims first, then database lookup as fallback.';