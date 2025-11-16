-- =========================================
-- MIGRATION: Função para Reservar Pedido com Lock
-- Data: 09/11/2025
-- Descrição: Cria função que reserva um pedido (cria com status "creating") antes de criar cobrança
--            Isso garante que apenas uma requisição possa criar cobrança para o mesmo external_id
-- =========================================

-- Função para reservar pedido (criar placeholder antes de criar cobrança)
-- Esta função:
-- 1. Adquire lock baseado em external_id
-- 2. Verifica se pedido já existe
-- 3. Se não existe, cria pedido com status "creating" (sem payment_id)
-- 4. Retorna o pedido (existente ou reservado)
-- Tudo em uma única transação, mantendo o lock durante todo o processo
CREATE OR REPLACE FUNCTION reserve_order_with_lock(
  p_external_id TEXT,
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_document TEXT,
  p_total_amount NUMERIC,
  p_order_type TEXT DEFAULT 'product',
  p_customer_data JSONB DEFAULT NULL,
  p_items JSONB DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  order_external_id TEXT,
  order_reserved BOOLEAN,
  order_exists BOOLEAN,
  order_data JSONB
) AS $$
DECLARE
  v_lock_id BIGINT;
  v_order_record RECORD;
  v_new_order_id UUID;
  v_customer_id UUID := p_customer_id;
  v_user_id UUID := p_user_id;
  v_existing_customer RECORD;
BEGIN
  -- Gerar lock ID baseado no external_id
  v_lock_id := hashtext('order_lock_' || p_external_id);
  
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
  
  -- Se pedido já existe, retornar pedido existente
  IF v_order_record IS NOT NULL THEN
    RETURN QUERY SELECT 
      v_order_record.id as order_id,
      v_order_record.external_id as order_external_id,
      FALSE as order_reserved,
      TRUE as order_exists,
      to_jsonb(v_order_record) as order_data;
    RETURN; -- Sair da função
  END IF;
  
  -- Pedido não existe, reservar pedido (criar placeholder)
  -- Buscar ou criar cliente
  IF v_customer_id IS NULL THEN
    SELECT id, user_id INTO v_existing_customer
    FROM public.customers
    WHERE email = p_customer_email OR document = p_customer_document
    LIMIT 1;
    
    IF v_existing_customer IS NOT NULL THEN
      v_customer_id := v_existing_customer.id;
      IF v_user_id IS NULL THEN
        v_user_id := v_existing_customer.user_id;
      END IF;
    ELSE
      -- Criar novo cliente
      INSERT INTO public.customers (full_name, email, phone, document, user_id)
      VALUES (p_customer_name, p_customer_email, p_customer_phone, p_customer_document, p_user_id)
      RETURNING id, user_id INTO v_customer_id, v_user_id;
    END IF;
  END IF;
  
  -- Criar pedido reservado (sem payment_id, status "creating")
  INSERT INTO public.orders (
    external_id,
    payment_id, -- NULL para pedidos reservados
    customer_id,
    user_id,
    customer_email,
    customer_name,
    customer_phone,
    customer_document,
    customer_data,
    total_amount,
    payment_status,
    status,
    payment_method,
    order_type,
    payment_data, -- NULL para pedidos reservados
    items
  )
  VALUES (
    p_external_id,
    NULL, -- payment_id será preenchido depois
    v_customer_id,
    v_user_id,
    p_customer_email,
    p_customer_name,
    p_customer_phone,
    p_customer_document,
    p_customer_data,
      p_total_amount,
      'pending', -- Status pending para pedidos reservados (será atualizado depois)
      'pending', -- Status pending (será atualizado depois)
      'pix',
    p_order_type,
    NULL, -- payment_data será preenchido depois
    p_items
  )
  RETURNING id INTO v_new_order_id;
  
  -- Buscar pedido criado
  SELECT id, external_id, payment_id, payment_status, status, total_amount, 
         customer_email, payment_data, created_at
  INTO v_order_record
  FROM public.orders
  WHERE id = v_new_order_id;
  
  -- Retornar pedido reservado
  RETURN QUERY SELECT 
    v_order_record.id as order_id,
    v_order_record.external_id as order_external_id,
    TRUE as order_reserved,
    FALSE as order_exists,
    to_jsonb(v_order_record) as order_data;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION reserve_order_with_lock IS 'Reserva um pedido (cria placeholder com status "creating") antes de criar cobrança. Garante que apenas uma requisição possa criar cobrança para o mesmo external_id. Retorna order_reserved=TRUE se pedido foi reservado, order_exists=TRUE se pedido já existia.';

