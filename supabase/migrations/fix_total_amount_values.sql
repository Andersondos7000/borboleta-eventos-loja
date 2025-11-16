-- ✅ CORREÇÃO: Corrigir valores de total_amount que foram salvos divididos por 100
-- Os valores devem ser armazenados em centavos (inteiros) e não em reais (decimais)
-- 
-- Exemplo:
-- ERRADO: total_amount = 9.00 (R$ 0,09)
-- CORRETO: total_amount = 900 (R$ 9,00)
--
-- Este script multiplica por 100 todos os valores que parecem estar em reais
-- (valores menores que 1000 centavos = R$ 10,00)

-- Criar tabela de backup antes de fazer alterações
CREATE TABLE IF NOT EXISTS orders_backup_before_fix AS 
SELECT * FROM orders;

-- Atualizar valores que parecem estar em reais (menores que 1000 centavos / R$ 10,00)
-- Assumindo que nenhum pedido real custaria menos de R$ 10,00
UPDATE orders
SET total_amount = total_amount * 100
WHERE total_amount > 0 
  AND total_amount < 1000
  AND payment_status IN ('paid', 'pending');

-- Log das alterações
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM orders
  WHERE total_amount > 0 
    AND total_amount < 1000
    AND payment_status IN ('paid', 'pending');
  
  RAISE NOTICE 'Total de pedidos corrigidos: %', updated_count;
END $$;

-- Comentário sobre a migração
COMMENT ON TABLE orders_backup_before_fix IS 
'Backup dos pedidos antes da correção dos valores de total_amount (multiplicação por 100)';






