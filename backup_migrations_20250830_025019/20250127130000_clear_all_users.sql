-- Migration: Clear All Users
-- Date: 2025-01-27
-- Description: Remove all existing users to start fresh with new role-based system

BEGIN;

-- Clear all user-related data in correct order to respect foreign keys
DELETE FROM public.cart_items;
DELETE FROM public.tickets;
DELETE FROM public.profiles;

-- Clear all users from auth system
DELETE FROM auth.users;

-- Add comment for documentation
COMMENT ON SCHEMA public IS 'All user data cleared on 2025-01-27 for role-based system implementation';

-- Log the cleanup
INSERT INTO public.system_logs (created_at, level, message, metadata)
VALUES (
  NOW(),
  'INFO',
  'All user data including auth.users cleared for role-based system implementation',
  '{"migration": "20250127130000_clear_all_users", "tables_cleared": ["cart_items", "tickets", "profiles", "auth.users"]}'
) ON CONFLICT DO NOTHING;

COMMIT;