-- =========================================
-- MIGRATION: Adicionar Função para Advisory Lock
-- Data: 09/11/2025
-- Descrição: Cria função para adquirir lock transacional baseado em external_id
--            Isso previne race conditions em requisições simultâneas
-- =========================================

-- Função para adquirir lock baseado em external_id
-- Usa pg_advisory_xact_lock que libera automaticamente no final da transação
CREATE OR REPLACE FUNCTION acquire_order_lock(external_id_value TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  lock_id BIGINT;
BEGIN
  -- Gerar lock ID baseado no external_id usando hash
  -- Usar um prefixo único para evitar conflitos com outros locks
  lock_id := hashtext('order_lock_' || external_id_value);
  
  -- Adquirir lock transacional (libera automaticamente no final da transação)
  -- Esta função bloqueia até conseguir adquirir o lock
  PERFORM pg_advisory_xact_lock(lock_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para tentar adquirir lock sem bloquear (non-blocking)
-- Retorna true se conseguiu adquirir, false se não conseguiu
CREATE OR REPLACE FUNCTION try_acquire_order_lock(external_id_value TEXT, timeout_ms INTEGER DEFAULT 5000)
RETURNS BOOLEAN AS $$
DECLARE
  lock_id BIGINT;
  start_time TIMESTAMP;
  acquired BOOLEAN := FALSE;
BEGIN
  lock_id := hashtext('order_lock_' || external_id_value);
  start_time := clock_timestamp();
  
  -- Tentar adquirir lock com timeout
  WHILE (clock_timestamp() - start_time) < (timeout_ms || INTERVAL '1 millisecond') LOOP
    -- Tentar adquirir lock sem bloquear
    IF pg_try_advisory_xact_lock(lock_id) THEN
      acquired := TRUE;
      EXIT;
    END IF;
    
    -- Aguardar 10ms antes de tentar novamente
    PERFORM pg_sleep(0.01);
  END LOOP;
  
  RETURN acquired;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON FUNCTION acquire_order_lock(TEXT) IS 'Adquire lock transacional baseado em external_id. Libera automaticamente no final da transação.';
COMMENT ON FUNCTION try_acquire_order_lock(TEXT, INTEGER) IS 'Tenta adquirir lock transacional com timeout. Retorna true se conseguiu, false se não conseguiu dentro do timeout.';

