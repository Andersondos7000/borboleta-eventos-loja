-- =========================================
-- SCRIPT: Verificação de Duplicatas de Pedidos
-- Pedido: pedido_mhr3w49ng2c4cu
-- Data: 09/11/2025
-- =========================================

-- 1. Verificar se há múltiplos pedidos com o mesmo external_id
SELECT 
    external_id,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids_encontrados,
    STRING_AGG(payment_id, ', ') as payment_ids
FROM orders
WHERE external_id = 'pedido_mhr3w49ng2c4cu'
GROUP BY external_id
HAVING COUNT(*) > 1;

-- 2. Verificar se há múltiplos pedidos com o mesmo payment_id
SELECT 
    payment_id,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids_encontrados,
    STRING_AGG(external_id, ', ') as external_ids
FROM orders
WHERE payment_id = 'pix_char_USajgQA5ujLrFZYXmfHLxgW4'
GROUP BY payment_id
HAVING COUNT(*) > 1;

-- 3. Verificar se há múltiplos pedidos com o mesmo UUID
SELECT 
    id,
    external_id,
    payment_id,
    customer_email,
    total_amount,
    status,
    created_at,
    updated_at
FROM orders
WHERE id = '65728bf7-cf74-4605-927c-0cf06405bc7b';

-- 4. Verificar todos os pedidos relacionados (por qualquer campo)
SELECT 
    id,
    external_id,
    payment_id,
    customer_email,
    customer_name,
    total_amount,
    status,
    payment_status,
    created_at,
    updated_at
FROM orders
WHERE 
    external_id = 'pedido_mhr3w49ng2c4cu'
    OR payment_id = 'pix_char_USajgQA5ujLrFZYXmfHLxgW4'
    OR id = '65728bf7-cf74-4605-927c-0cf06405bc7b'
ORDER BY created_at DESC;

-- 5. Verificar constraints únicas existentes na tabela orders
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
    AND contype IN ('u', 'p') -- 'u' = UNIQUE, 'p' = PRIMARY KEY
ORDER BY conname;

-- 6. Verificar índices únicos na tabela orders
SELECT
    indexname AS index_name,
    indexdef AS index_definition
FROM pg_indexes
WHERE tablename = 'orders'
    AND indexdef LIKE '%UNIQUE%'
ORDER BY indexname;

-- 7. Verificar se há pedidos duplicados por email, total e data (critério do PRD)
SELECT 
    customer_email,
    total_amount,
    DATE(created_at) as data_pedido,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids_encontrados,
    STRING_AGG(external_id, ', ') as external_ids
FROM orders
WHERE customer_email = 'fotosartdesign@gmail.com'
    AND total_amount = 900.00
    AND DATE(created_at) = '2025-11-08'
GROUP BY customer_email, total_amount, DATE(created_at)
HAVING COUNT(*) > 1;

-- 8. Verificar itens do pedido (order_items)
SELECT 
    oi.id as item_id,
    oi.order_id,
    oi.quantity,
    oi.unit_price,
    oi.total_price,
    o.id as order_id_from_orders,
    o.external_id,
    o.payment_id
FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
WHERE o.external_id = 'pedido_mhr3w49ng2c4cu'
    OR o.payment_id = 'pix_char_USajgQA5ujLrFZYXmfHLxgW4'
    OR o.id = '65728bf7-cf74-4605-927c-0cf06405bc7b'
ORDER BY oi.created_at DESC;

-- 9. Verificar logs de webhook relacionados (se existir tabela de logs)
-- SELECT * FROM webhook_logs 
-- WHERE payload::text LIKE '%pix_char_USajgQA5ujLrFZYXmfHLxgW4%'
--    OR payload::text LIKE '%pedido_mhr3w49ng2c4cu%'
-- ORDER BY created_at DESC;

-- =========================================
-- RESULTADOS ESPERADOS:
-- =========================================
-- Se houver duplicatas:
--   - Query 1 deve retornar quantidade > 1
--   - Query 2 deve retornar quantidade > 1
--   - Query 4 deve retornar múltiplas linhas
--   - Query 7 deve retornar quantidade > 1
--
-- Se não houver constraints únicas:
--   - Query 5 não deve mostrar constraint UNIQUE para external_id ou payment_id
--   - Query 6 não deve mostrar índice UNIQUE para external_id ou payment_id
-- =========================================

