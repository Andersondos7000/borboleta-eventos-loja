-- Fix foreign key constraints in customers table to allow user deletion
-- Date: 01/02/2025
-- Issue: Users cannot be deleted due to RESTRICT constraints on created_by and updated_by fields

-- Drop existing constraints (comentado - colunas created_by/updated_by não existem)
-- ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_created_by_fkey;
-- ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_updated_by_fkey;

-- Add new constraints with ON DELETE SET NULL (comentado - colunas não existem)
-- ALTER TABLE customers 
-- ADD CONSTRAINT customers_created_by_fkey 
-- FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ALTER TABLE customers 
-- ADD CONSTRAINT customers_updated_by_fkey 
-- FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Nota: A tabela customers não possui as colunas created_by e updated_by
-- Esta migração será aplicada quando essas colunas forem adicionadas

-- Update any existing NULL values to maintain data integrity
-- (Optional: Set a default system user ID if needed)
-- UPDATE customers SET created_by = 'system-user-uuid' WHERE created_by IS NULL;
-- UPDATE customers SET updated_by = 'system-user-uuid' WHERE updated_by IS NULL;

-- Add comment for documentation (comentado - constraints não existem)
-- COMMENT ON CONSTRAINT customers_created_by_fkey ON customers IS 'Foreign key to auth.users with ON DELETE SET NULL to allow user deletion';
-- COMMENT ON CONSTRAINT customers_updated_by_fkey ON customers IS 'Foreign key to auth.users with ON DELETE SET NULL to allow user deletion';