-- Script para testar se a tabela orders existe e está funcionando
-- Execute este script no painel do Supabase para verificar se a tabela foi criada

-- Verificar se a tabela orders existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'orders';

-- Verificar a estrutura da tabela orders
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Testar inserção de um pedido de exemplo
INSERT INTO public.orders (
  amount,
  status,
  customer_data,
  billing_data,
  items
) VALUES (
  10000, -- R$ 100,00 em centavos
  'pending',
  '{"name": "João Silva", "email": "joao@example.com", "phone": "11999999999"}',
  '{"address": "Rua Exemplo, 123", "city": "São Paulo", "state": "SP", "zipCode": "01234-567"}',
  '[{"id": "1", "name": "Produto Teste", "price": 10000, "quantity": 1, "type": "product"}]'
);

-- Verificar se o pedido foi inserido
SELECT * FROM public.orders ORDER BY created_at DESC LIMIT 1;

-- Limpar o teste (opcional)
-- DELETE FROM public.orders WHERE customer_data->>'name' = 'João Silva';