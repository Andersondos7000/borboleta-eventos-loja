-- =========================================
-- MIGRATION: Adicionar Constraints UNIQUE para prevenir duplicatas
-- Data: 09/11/2025
-- Descrição: Adiciona constraints UNIQUE em external_id e payment_id na tabela orders
-- =========================================

-- 1. Remover índices existentes se houver (não únicos)
DROP INDEX IF EXISTS orders_external_id_idx;
DROP INDEX IF EXISTS orders_payment_id_idx;

-- 2. Adicionar índices UNIQUE para external_id e payment_id
-- Nota: NULL values são permitidos, então precisamos criar índices parciais
CREATE UNIQUE INDEX IF NOT EXISTS orders_external_id_unique_idx 
ON public.orders (external_id) 
WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_id_unique_idx 
ON public.orders (payment_id) 
WHERE payment_id IS NOT NULL;

-- 3. Adicionar índice composto para verificar duplicatas por email, valor e data
-- Isso previne pedidos duplicados do mesmo cliente no mesmo dia com o mesmo valor
CREATE UNIQUE INDEX IF NOT EXISTS orders_customer_email_total_date_unique_idx 
ON public.orders (customer_email, total_amount, DATE(created_at))
WHERE customer_email IS NOT NULL AND total_amount IS NOT NULL;

-- 4. Comentários
COMMENT ON INDEX orders_external_id_unique_idx IS 'Índice único para external_id - previne pedidos duplicados por ID externo';
COMMENT ON INDEX orders_payment_id_unique_idx IS 'Índice único para payment_id - previne pedidos duplicados por ID de pagamento';
COMMENT ON INDEX orders_customer_email_total_date_unique_idx IS 'Índice único composto - previne pedidos duplicados do mesmo cliente, valor e data';

-- =========================================
-- VERIFICAÇÃO: Verificar se há duplicatas existentes antes de aplicar constraints
-- =========================================

-- Verificar duplicatas por external_id
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT external_id, COUNT(*) as cnt
        FROM public.orders
        WHERE external_id IS NOT NULL
        GROUP BY external_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE WARNING 'Encontradas % duplicatas por external_id. Resolva antes de aplicar constraints.', duplicate_count;
    END IF;
END $$;

-- Verificar duplicatas por payment_id
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT payment_id, COUNT(*) as cnt
        FROM public.orders
        WHERE payment_id IS NOT NULL
        GROUP BY payment_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE WARNING 'Encontradas % duplicatas por payment_id. Resolva antes de aplicar constraints.', duplicate_count;
    END IF;
END $$;

-- =========================================
-- FIM DA MIGRATION
-- =========================================

