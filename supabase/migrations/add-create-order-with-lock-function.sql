-- =========================================
-- MIGRATION: Função para Criar Pedido com Lock Transacional
-- Data: 09/11/2025
-- Descrição: Cria função que adquire lock, verifica se pedido existe, e cria pedido se não existir
--            Tudo em uma única transação, garantindo que apenas uma requisição por external_id seja processada
-- =========================================

-- Função para criar pedido com lock transacional
-- Esta função:
-- 1. Adquire lock baseado em external_id
-- 2. Verifica se pedido já existe
-- 3. Se não existe, cria o pedido
-- 4. Retorna o pedido (existente ou criado)
-- Tudo em uma única transação, mantendo o lock durante todo o processo
CREATE OR REPLACE FUNCTION create_order_with_lock(
  p_external_id TEXT,
  p_payment_id TEXT,
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_document TEXT,
  p_total_amount NUMERIC,
  p_payment_status TEXT DEFAULT 'pending',
  p_status TEXT DEFAULT 'pending',
  p_payment_method TEXT DEFAULT 'pix',
  p_order_type TEXT DEFAULT 'product',
  p_payment_data JSONB DEFAULT NULL,
  p_customer_data JSONB DEFAULT NULL,
  p_items JSONB DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  order_external_id TEXT,
  order_payment_id TEXT,
  order_exists BOOLEAN,
  order_data JSONB
) AS $$
DECLARE
  v_lock_id BIGINT;
  v_order_record RECORD;
  v_new_order_id UUID;
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
  
  -- Se não encontrou por external_id, verificar por payment_id
  IF v_order_record IS NULL AND p_payment_id IS NOT NULL THEN
    SELECT id, external_id, payment_id, payment_status, status, total_amount, 
           customer_email, payment_data, created_at
    INTO v_order_record
    FROM public.orders
    WHERE payment_id = p_payment_id
    LIMIT 1;
  END IF;
  
  -- Se pedido já existe, retornar pedido existente
  IF v_order_record IS NOT NULL THEN
    RETURN QUERY SELECT 
      v_order_record.id as order_id,
      v_order_record.external_id as order_external_id,
      v_order_record.payment_id as order_payment_id,
      TRUE as order_exists,
      to_jsonb(v_order_record) as order_data;
    RETURN; -- Sair da função
  END IF;
  
  -- Pedido não existe, criar novo pedido
  -- Buscar ou criar cliente
  DECLARE
    v_customer_id UUID := p_customer_id;
    v_user_id UUID := p_user_id;
  BEGIN
    -- Se customer_id não foi fornecido, buscar ou criar cliente
    IF v_customer_id IS NULL THEN
      SELECT id INTO v_customer_id
      FROM public.customers
      WHERE email = p_customer_email OR document = p_customer_document
      LIMIT 1;
      
      -- Se não encontrou cliente, criar novo
      IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (full_name, email, phone, document, user_id)
        VALUES (p_customer_name, p_customer_email, p_customer_phone, p_customer_document, p_user_id)
        RETURNING id INTO v_customer_id;
      END IF;
    END IF;
    
    -- Criar novo pedido
    INSERT INTO public.orders (
      external_id,
      payment_id,
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
      payment_data,
      items
    )
    VALUES (
      p_external_id,
      p_payment_id,
      v_customer_id,
      v_user_id,
      p_customer_email,
      p_customer_name,
      p_customer_phone,
      p_customer_document,
      p_customer_data,
      p_total_amount,
      p_payment_status,
      p_status,
      p_payment_method,
      p_order_type,
      p_payment_data,
      p_items
    )
    RETURNING id INTO v_new_order_id;
    
    -- Buscar pedido criado
    SELECT id, external_id, payment_id, payment_status, status, total_amount, 
           customer_email, payment_data, created_at
    INTO v_order_record
    FROM public.orders
    WHERE id = v_new_order_id;
    
    -- Retornar pedido criado
    RETURN QUERY SELECT 
      v_order_record.id as order_id,
      v_order_record.external_id as order_external_id,
      v_order_record.payment_id as order_payment_id,
      FALSE as order_exists,
      to_jsonb(v_order_record) as order_data;
  END;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION create_order_with_lock IS 'Adquire lock transacional, verifica se pedido existe, e cria pedido se não existir. Tudo em uma única transação, garantindo exclusividade. Retorna order_exists=TRUE se pedido já existia, FALSE se foi criado.';

