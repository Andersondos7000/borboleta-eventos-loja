-- =========================================
-- MIGRATION: Adicionar Constraint UNIQUE para payment_id
-- Data: 09/11/2025
-- Descrição: Adiciona constraint UNIQUE em payment_id na tabela orders
-- =========================================

-- 1. Verificar se há duplicatas por payment_id antes de aplicar constraint
DO $$
DECLARE
    duplicate_count INTEGER;
    r RECORD;
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
        RAISE WARNING 'Encontradas % duplicatas por payment_id. Resolva antes de aplicar constraint.', duplicate_count;
        -- Listar duplicatas
        RAISE NOTICE 'Duplicatas encontradas:';
        FOR r IN 
            SELECT payment_id, COUNT(*) as cnt, STRING_AGG(id::text, ', ') as ids
            FROM public.orders
            WHERE payment_id IS NOT NULL
            GROUP BY payment_id
            HAVING COUNT(*) > 1
        LOOP
            RAISE NOTICE 'Payment ID: %, Quantidade: %, IDs: %', r.payment_id, r.cnt, r.ids;
        END LOOP;
    ELSE
        RAISE NOTICE 'Nenhuma duplicata encontrada por payment_id. Aplicando constraint...';
    END IF;
END $$;

-- 2. Remover índice existente se houver (não único)
DROP INDEX IF EXISTS orders_payment_id_idx;

-- 3. Adicionar índice UNIQUE para payment_id
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_id_unique_idx 
ON public.orders (payment_id) 
WHERE payment_id IS NOT NULL;

-- 4. Comentário
COMMENT ON INDEX orders_payment_id_unique_idx IS 'Índice único para payment_id - previne pedidos duplicados por ID de pagamento do AbacatePay';

-- =========================================
-- FIM DA MIGRATION
-- =========================================
