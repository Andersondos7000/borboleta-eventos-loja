-- Script SQL para verificar e corrigir order_items de roupas
-- Este script identifica pedidos que não têm order_items com product_id
-- e tenta recriá-los baseado nos dados do pedido

-- 1. Verificar pedidos do customer específico
WITH customer_orders AS (
  SELECT o.id as order_id, o.items, o.payment_data, o.customer_data, o.payment_status, o.status
  FROM orders o
  WHERE o.customer_id IN (
    SELECT id FROM customers WHERE external_id = 'cust_bnNnB52Z5FJxtjmDQLbe5tEZ'
  )
  OR o.customer_email IN (
    SELECT email FROM customers WHERE external_id = 'cust_bnNnB52Z5FJxtjmDQLbe5tEZ'
  )
),
orders_without_clothing_items AS (
  SELECT co.order_id, co.items, co.payment_data, co.customer_data
  FROM customer_orders co
  WHERE NOT EXISTS (
    SELECT 1 
    FROM order_items oi 
    WHERE oi.order_id = co.order_id 
    AND oi.product_id IS NOT NULL
  )
  AND co.payment_status = 'paid'
)
SELECT 
  order_id,
  CASE 
    WHEN items IS NOT NULL THEN 'items'
    WHEN payment_data IS NOT NULL THEN 'payment_data'
    WHEN customer_data IS NOT NULL THEN 'customer_data'
    ELSE 'none'
  END as data_source,
  items,
  payment_data,
  customer_data
FROM orders_without_clothing_items;

-- 2. Para criar order_items manualmente, você precisa:
--    a) Extrair os itens do campo items, payment_data ou customer_data
--    b) Mapear os nomes dos produtos para product_id na tabela products
--    c) Inserir os order_items

-- Exemplo de inserção manual (substitua os valores):
/*
INSERT INTO order_items (
  order_id,
  product_id,
  quantity,
  price,
  unit_price,
  total_price,
  size,
  ticket_id,
  name,
  created_at
)
SELECT 
  'ORDER_ID_AQUI'::uuid as order_id,
  p.id as product_id,
  1 as quantity,
  5000 as price, -- em centavos
  5000 as unit_price,
  5000 as total_price,
  NULL as size,
  NULL as ticket_id,
  'Nome do Produto' as name,
  NOW() as created_at
FROM products p
WHERE p.name = 'Nome do Produto'
LIMIT 1;
*/

-- 3. Verificar se os order_items foram criados corretamente
/*
SELECT 
  oi.id,
  oi.order_id,
  oi.product_id,
  oi.name,
  oi.quantity,
  oi.price,
  oi.size,
  p.name as product_name,
  p.category as product_category,
  o.payment_status,
  o.status
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN products p ON p.id = oi.product_id
WHERE o.customer_id IN (
  SELECT id FROM customers WHERE external_id = 'cust_bnNnB52Z5FJxtjmDQLbe5tEZ'
)
OR o.customer_email IN (
  SELECT email FROM customers WHERE external_id = 'cust_bnNnB52Z5FJxtjmDQLbe5tEZ'
)
ORDER BY o.created_at DESC;
*/



