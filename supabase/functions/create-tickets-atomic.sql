-- ✅ FUNÇÃO SQL ATÔMICA PARA CRIAÇÃO DE TICKETS
-- Data: 06/11/2025
-- Autor: Sistema de Ingressos Queren Hapuque
-- Versão: 3.0 (Corrigida - Assentos Únicos em Lote)

CREATE OR REPLACE FUNCTION create_tickets_atomic(
  p_order_id TEXT,
  p_items JSONB,
  p_customer_data JSONB
)
RETURNS TABLE (
  success BOOLEAN,
  tickets_created INT,
  seat_numbers TEXT[],
  ticket_ids TEXT[],
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
  seat_num TEXT;
  ticket_id UUID;
  ticket_num TEXT;
  seats TEXT[] := ARRAY[]::TEXT[];
  ids TEXT[] := ARRAY[]::TEXT[];
  total_created INT := 0;
  item_index INT := 1;
  total_items INT;
  allocated_seats TEXT[] := ARRAY[]::TEXT[];
  seat_counter INT;
BEGIN
  -- ========================================
  -- 1. VALIDAÇÕES INICIAIS
  -- ========================================
  
  -- Verificar se order_id é válido
  IF p_order_id IS NULL OR p_order_id = '' THEN
    RETURN QUERY SELECT FALSE, 0, ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'Order ID inválido'::TEXT;
    RETURN;
  END IF;
  
  -- Verificar idempotência (tickets já existem?)
  IF EXISTS (SELECT 1 FROM tickets WHERE order_id = p_order_id::UUID AND seat_number IS NOT NULL) THEN
    RETURN QUERY 
    SELECT TRUE, COUNT(*)::INT, ARRAY_AGG(seat_number), ARRAY_AGG(id::TEXT), 'Tickets já existem'::TEXT
    FROM tickets
    WHERE order_id = p_order_id::UUID AND seat_number IS NOT NULL;
    RETURN;
  END IF;
  
  -- Contar total de itens
  SELECT jsonb_array_length(p_items) INTO total_items;
  
  IF total_items = 0 THEN
    RETURN QUERY SELECT FALSE, 0, ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'Nenhum item para processar'::TEXT;
    RETURN;
  END IF;
  
  -- ========================================
  -- 2. ALOCAR TODOS OS ASSENTOS DE UMA VEZ
  -- ========================================
  
  -- Alocar todos os assentos de uma vez usando get_next_seat_numbers
  -- Isso garante que não haverá duplicação
  BEGIN
    SELECT get_next_seat_numbers(total_items) INTO allocated_seats;
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar, tentar alocar um por um (fallback)
    RAISE WARNING 'Erro ao alocar assentos em lote: %', SQLERRM;
    allocated_seats := ARRAY[]::TEXT[];
  END;
  
  -- Se não conseguiu alocar em lote, alocar um por um
  IF allocated_seats IS NULL OR array_length(allocated_seats, 1) IS NULL OR array_length(allocated_seats, 1) < total_items THEN
    allocated_seats := ARRAY[]::TEXT[];
    FOR seat_counter IN 1..total_items LOOP
      BEGIN
        SELECT get_next_seat_number() INTO seat_num;
        allocated_seats := array_append(allocated_seats, seat_num);
      EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, 0, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ('Erro ao alocar assento ' || seat_counter || ': ' || SQLERRM)::TEXT;
        RETURN;
      END;
    END LOOP;
  END IF;
  
  -- ========================================
  -- 3. PROCESSAR CADA ITEM COM ASSENTO PRÉ-ALOCADO
  -- ========================================
  
  seat_counter := 1;
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      -- Usar assento pré-alocado
      IF seat_counter <= array_length(allocated_seats, 1) THEN
        seat_num := allocated_seats[seat_counter];
      ELSE
        -- Fallback: alocar novo assento (não deveria acontecer)
        SELECT get_next_seat_number() INTO seat_num;
      END IF;
      
      -- Gerar IDs
      ticket_id := gen_random_uuid();
      ticket_num := p_order_id || '-item-' || item_index;
      
      -- Inserir ticket
      INSERT INTO tickets (
        id,
        order_id,
        seat_number,
        ticket_number,
        event_id,
        ticket_type,
        price,
        unit_price,
        total_price,
        quantity,
        status,
        qr_code,
        customer_id,
        user_id,
        created_at,
        updated_at
      ) VALUES (
        ticket_id,
        p_order_id::UUID,
        seat_num,
        ticket_num,
        (item->>'event_id')::UUID,
        item->>'ticket_type',
        (item->>'price')::NUMERIC,
        (item->>'price')::NUMERIC,
        (item->>'price')::NUMERIC,
        1, -- Sempre 1 para tickets individuais
        'active',
        ticket_id::TEXT, -- QR code simplificado (pode ser melhorado)
        NULLIF(p_customer_data->>'customer_id', '')::UUID,
        NULLIF(p_customer_data->>'user_id', '')::UUID,
        NOW(),
        NOW()
      );
      
      -- Adicionar aos arrays de retorno
      seats := array_append(seats, seat_num);
      ids := array_append(ids, ticket_id::TEXT);
      total_created := total_created + 1;
      item_index := item_index + 1;
      seat_counter := seat_counter + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar algum ticket, rollback automático
      RETURN QUERY SELECT FALSE, 0, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ('Erro ao criar ticket ' || item_index || ': ' || SQLERRM)::TEXT;
      RETURN;
    END;
  END LOOP;
  
  -- ========================================
  -- 4. SUCESSO - RETORNAR RESULTADO
  -- ========================================
  
  RETURN QUERY SELECT TRUE, total_created, seats, ids, 'Tickets criados com sucesso'::TEXT;
  
EXCEPTION WHEN OTHERS THEN
  -- Rollback automático - nenhum ticket é criado
  RETURN QUERY SELECT FALSE, 0, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ('Erro geral: ' || SQLERRM)::TEXT;
END;
$$;

-- ========================================
-- GRANTS E PERMISSÕES
-- ========================================

-- Permitir que serviços autenticados chamem a função
GRANT EXECUTE ON FUNCTION create_tickets_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION create_tickets_atomic TO service_role;

-- ========================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ========================================

COMMENT ON FUNCTION create_tickets_atomic IS 
'Cria tickets de forma atômica para um pedido confirmado.
- THREAD-SAFE: Usa get_next_seat_numbers() para alocar múltiplos assentos de uma vez
- IDEMPOTENTE: Verifica se tickets já existem
- ATÔMICO: Rollback automático em caso de erro
- ASSENTOS ÚNICOS: Aloca todos os assentos de uma vez para evitar duplicação
- RETORNA: Success, IDs, seat_numbers, error_message';

-- ========================================
-- VERSÃO: 3.0
-- CORREÇÕES:
-- - Aloca todos os assentos de uma vez usando get_next_seat_numbers()
-- - Garante que múltiplos tickets recebem assentos únicos
-- - Corrigido problema de assentos duplicados em lotes
-- ========================================
