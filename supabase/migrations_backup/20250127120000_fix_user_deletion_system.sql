-- Migration: Fix User Deletion System
-- Date: 2025-01-27
-- Description: Consolidates fixes for user deletion functionality

-- Ensure role column exists in profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'organizer'));

-- Create or replace the delete_user_cascade function
CREATE OR REPLACE FUNCTION delete_user_cascade(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete from related tables in correct order to respect foreign keys
  DELETE FROM public.cart_items WHERE user_id = $1;
  DELETE FROM public.tickets WHERE user_id = $1;
  DELETE FROM public.profiles WHERE id = $1;
  
  -- Note: auth.users deletion should be handled by Supabase Auth API
END;
$$;

-- Create admin policies for user deletion
DO $$
BEGIN
  -- Drop existing admin policies if they exist
  DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can delete any cart items" ON public.cart_items;
  DROP POLICY IF EXISTS "Admins can delete any tickets" ON public.tickets;
  
  -- Create new admin policies
  CREATE POLICY "Admins can delete any profile" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'admin'
  );
  
  CREATE POLICY "Admins can delete any cart items" ON public.cart_items
  FOR DELETE
  TO authenticated
  USING (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'admin'
  );
  
  CREATE POLICY "Admins can delete any tickets" ON public.tickets
  FOR DELETE
  TO authenticated
  USING (
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'admin'
  );
END
$$;

-- Update handle_new_user function to use the role column correctly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'given_name',
    new.raw_user_meta_data ->> 'family_name', 
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'role', 'user')
  );
  RETURN new;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION delete_user_cascade(UUID) IS 'Cascades user deletion across related tables. Should be called before deleting from auth.users.';
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates a profile when a new user is created in auth.users.';