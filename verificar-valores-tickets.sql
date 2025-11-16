-- Script para verificar os valores atuais dos tickets no banco de dados

-- Verificar alguns tickets recentes e seus valores
SELECT 
  t.id,
  t.ticket_number,
  t.price as price_raw,
  t.quantity,
  t.unit_price as unit_price_raw,
  t.total_price as total_price_raw,
  t.status,
  c.full_name as cliente,
  c.email,
  o.id as order_id,
  -- Mostrar valores formatados de diferentes formas para identificar o problema
  ROUND(t.price / 100.0, 2) as price_se_centavos,
  t.price as price_se_reais,
  ROUND((t.price * t.quantity) / 100.0, 2) as total_se_centavos,
  (t.price * t.quantity) as total_se_reais,
  t.created_at
FROM tickets t
LEFT JOIN customers c ON t.customer_id = c.id
LEFT JOIN orders o ON t.order_id = o.id
ORDER BY t.created_at DESC
LIMIT 20;

-- Verificar estatísticas gerais dos valores
SELECT 
  COUNT(*) as total_tickets,
  MIN(price) as menor_price,
  MAX(price) as maior_price,
  AVG(price) as media_price,
  COUNT(CASE WHEN price < 1000 THEN 1 END) as prices_abaixo_1000,
  COUNT(CASE WHEN price >= 1000 THEN 1 END) as prices_acima_1000
FROM tickets
WHERE price > 0;

-- Verificar tickets do usuário mencionado (Anderson Araujo da Silva)
SELECT 
  t.id,
  t.ticket_number,
  t.price,
  t.quantity,
  ROUND(t.price / 100.0, 2) as price_dividido_100,
  (t.price * t.quantity) as total_multiplicado,
  ROUND((t.price * t.quantity) / 100.0, 2) as total_dividido_100,
  t.status,
  c.full_name,
  c.email,
  t.order_id,
  t.created_at
FROM tickets t
LEFT JOIN customers c ON t.customer_id = c.id
WHERE c.full_name LIKE '%Anderson%Araujo%'
   OR c.email LIKE '%fotosartdesign%'
ORDER BY t.created_at DESC;

