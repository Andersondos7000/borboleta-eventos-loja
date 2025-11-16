-- =========================================
-- MIGRATION: Função para Verificar/Atualizar Pedido com Lock ANTES de Criar Cobrança
-- Data: 09/11/2025
-- Descrição: Cria função que verifica se pedido já tem payment_id antes de criar cobrança
--            Isso garante que apenas uma requisição possa criar cobrança para o mesmo external_id
-- =========================================

-- Função para verificar e atualizar pedido com lock ANTES de criar cobrança
-- Esta função:
-- 1. Adquire lock baseado em external_id
-- 2. Verifica se pedido já tem payment_id
-- 3. Se tiver payment_id, retorna pedido existente
-- 4. Se não tiver, permite criar cobrança (retorna que pode prosseguir)
-- Tudo em uma única transação, mantendo o lock durante todo o processo
CREATE OR REPLACE FUNCTION check_order_before_charge(
  p_external_id TEXT
)
RETURNS TABLE (
  order_id UUID,
  order_external_id VARCHAR(100),
  has_payment_id BOOLEAN,
  can_create_charge BOOLEAN,
  order_data JSONB
) AS $$
DECLARE
  v_lock_id BIGINT;
  v_order_record RECORD;
BEGIN
  -- Gerar lock ID baseado no external_id
  v_lock_id := hashtext('order_charge_lock_' || p_external_id);
  
  -- Adquirir lock transacional (bloqueia até conseguir)
  -- O lock será mantido durante toda a transação
  PERFORM pg_advisory_xact_lock(v_lock_id);
  
  -- Verificar se pedido já existe por external_id
  SELECT id, external_id, payment_id, payment_status, status, total_amount, 
         customer_email, payment_data, created_at
  INTO v_order_record
  FROM public.orders
  WHERE external_id = p_external_id
  LIMIT 1;
  
  -- Se pedido não existe, não pode criar cobrança (deve ter sido reservado antes)
  IF v_order_record IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID as order_id,
      NULL::VARCHAR(100) as order_external_id,
      FALSE::BOOLEAN as has_payment_id,
      FALSE::BOOLEAN as can_create_charge,
      NULL::JSONB as order_data;
    RETURN; -- Sair da função
  END IF;
  
  -- Pedido existe, verificar se já tem payment_id
  IF v_order_record.payment_id IS NOT NULL THEN
    -- Pedido já tem payment_id, não pode criar nova cobrança
    RETURN QUERY SELECT 
      v_order_record.id::UUID as order_id,
      v_order_record.external_id::VARCHAR(100) as order_external_id,
      TRUE::BOOLEAN as has_payment_id,
      FALSE::BOOLEAN as can_create_charge,
      to_jsonb(v_order_record) as order_data;
    RETURN; -- Sair da função
  END IF;
  
  -- Pedido existe mas não tem payment_id, pode criar cobrança
  RETURN QUERY SELECT 
    v_order_record.id::UUID as order_id,
    v_order_record.external_id::VARCHAR(100) as order_external_id,
    FALSE::BOOLEAN as has_payment_id,
    TRUE::BOOLEAN as can_create_charge,
    to_jsonb(v_order_record) as order_data;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION check_order_before_charge IS 'Verifica se pedido já tem payment_id antes de criar cobrança. Garante que apenas uma requisição possa criar cobrança para o mesmo external_id. Retorna can_create_charge=TRUE se pode criar cobrança, has_payment_id=TRUE se pedido já tem payment_id.';














