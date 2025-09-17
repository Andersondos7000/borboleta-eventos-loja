-- Fix foreign key constraints in realtime_latency_alerts table to allow user deletion
-- Date: 01/02/2025
-- Issue: Users cannot be deleted due to RESTRICT constraint on acknowledged_by field

-- Drop existing constraint if it exists (comentado - tabela não existe)
-- ALTER TABLE realtime_latency_alerts DROP CONSTRAINT IF EXISTS realtime_latency_alerts_acknowledged_by_fkey;

-- Add new constraint with ON DELETE SET NULL (comentado - tabela não existe)
-- ALTER TABLE realtime_latency_alerts 
-- ADD CONSTRAINT realtime_latency_alerts_acknowledged_by_fkey 
-- FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment for documentation (comentado - tabela não existe)
-- COMMENT ON CONSTRAINT realtime_latency_alerts_acknowledged_by_fkey ON realtime_latency_alerts IS 'Foreign key to auth.users with ON DELETE SET NULL to allow user deletion';

-- Nota: A tabela realtime_latency_alerts não existe
-- Esta migração será aplicada quando a tabela for criada

-- Note: The realtime_latency_config table already has ON DELETE CASCADE which is correct
-- as user configurations should be deleted when the user is deleted