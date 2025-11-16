-- =========================================
-- MIGRATION: Função para Adquirir Lock e Verificar Pedido em Uma Transação
-- Data: 09/11/2025
-- Descrição: Cria função que adquire lock e verifica se pedido existe em uma única transação
--            Isso garante que apenas uma requisição por external_id seja processada por vez
-- =========================================

-- Função para verificar se pedido existe com lock transacional
-- Esta função adquire o lock, verifica se o pedido existe, e mantém o lock até o final da transação
CREATE OR REPLACE FUNCTION check_order_with_lock(
  p_external_id TEXT,
  p_payment_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_exists BOOLEAN,
  order_id UUID,
  order_payment_id TEXT,
  order_data JSONB
) AS $$
DECLARE
  v_lock_id BIGINT;
  v_order_record RECORD;
BEGIN
  -- Gerar lock ID baseado no external_id
  v_lock_id := hashtext('order_lock_' || p_external_id);
  
  -- Adquirir lock transacional (bloqueia até conseguir)
  -- O lock será liberado automaticamente no final da transação
  PERFORM pg_advisory_xact_lock(v_lock_id);
  
  -- Agora que temos o lock, verificar se pedido existe
  -- Verificar por external_id primeiro
  SELECT id, payment_id, payment_status, status, external_id, total_amount, 
         customer_email, payment_data, created_at
  INTO v_order_record
  FROM public.orders
  WHERE external_id = p_external_id
  LIMIT 1;
  
  -- Se não encontrou por external_id e payment_id foi fornecido, verificar por payment_id
  IF v_order_record IS NULL AND p_payment_id IS NOT NULL THEN
    SELECT id, payment_id, payment_status, status, external_id, total_amount, 
           customer_email, payment_data, created_at
    INTO v_order_record
    FROM public.orders
    WHERE payment_id = p_payment_id
    LIMIT 1;
  END IF;
  
  -- Retornar resultado
  IF v_order_record IS NOT NULL THEN
    RETURN QUERY SELECT 
      TRUE as order_exists,
      v_order_record.id as order_id,
      v_order_record.payment_id as order_payment_id,
      to_jsonb(v_order_record) as order_data;
  ELSE
    RETURN QUERY SELECT 
      FALSE as order_exists,
      NULL::UUID as order_id,
      NULL::TEXT as order_payment_id,
      NULL::JSONB as order_data;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION check_order_with_lock(TEXT, TEXT) IS 'Adquire lock transacional, verifica se pedido existe e mantém lock até final da transação. Retorna TRUE se pedido existe, FALSE caso contrário.';

