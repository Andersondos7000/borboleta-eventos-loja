-- =========================================
-- FUNÇÃO: get_next_seat_number()
-- Descrição: Aloca próximo número de assento sequencial (0001-1300)
-- Data: 05/11/2025
-- =========================================

-- 1. Criar sequence para números sequenciais
CREATE SEQUENCE IF NOT EXISTS ticket_seat_number_seq
    START 1
    INCREMENT 1
    MINVALUE 1
    MAXVALUE 1300
    NO CYCLE;

COMMENT ON SEQUENCE ticket_seat_number_seq IS 'Sequence para numeração sequencial de assentos (0001-1300) - Queren Hapuque VIII';

-- 2. Função para obter próximo número de assento
CREATE OR REPLACE FUNCTION get_next_seat_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_num INTEGER;
BEGIN
    -- Obter próximo número da sequence (atomic operation - thread-safe)
    SELECT nextval('ticket_seat_number_seq') INTO next_num;
    
    -- Verificar se excedeu o limite de 1300
    IF next_num > 1300 THEN
        -- Reverter a sequence para não consumir números além do limite
        PERFORM setval('ticket_seat_number_seq', 1300, true);
        
        RAISE EXCEPTION 'Ingressos esgotados - limite de 1300 atingido' 
            USING 
                ERRCODE = 'P0001',
                HINT = 'sold_out',
                DETAIL = 'Todos os 1300 ingressos do evento foram vendidos';
    END IF;
    
    -- Retornar número formatado com 4 dígitos (0001, 0002, etc.)
    RETURN LPAD(next_num::TEXT, 4, '0');
END;
$$;

COMMENT ON FUNCTION get_next_seat_number() IS 'Retorna próximo número de assento sequencial formatado (0001-1300). Thread-safe. Lança exceção se atingir o limite.';

-- 3. Função para alocar múltiplos assentos consecutivos (para lotes)
CREATE OR REPLACE FUNCTION get_next_seat_numbers(quantity INTEGER)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    seat_numbers TEXT[] := '{}';
    current_value INTEGER;
    i INTEGER;
BEGIN
    -- Validar quantidade
    IF quantity <= 0 THEN
        RAISE EXCEPTION 'Quantidade deve ser maior que zero';
    END IF;
    
    -- Verificar disponibilidade antes de alocar
    SELECT last_value INTO current_value FROM ticket_seat_number_seq;
    
    IF (current_value + quantity) > 1300 THEN
        RAISE EXCEPTION 'Não há ingressos suficientes disponíveis (solicitado: %, disponível: %)', 
            quantity, 
            (1300 - current_value)
            USING 
                ERRCODE = 'P0001',
                HINT = 'insufficient_seats',
                DETAIL = format('Apenas %s ingressos disponíveis', (1300 - current_value));
    END IF;
    
    -- Alocar números sequenciais
    FOR i IN 1..quantity LOOP
        seat_numbers := array_append(seat_numbers, get_next_seat_number());
    END LOOP;
    
    RETURN seat_numbers;
END;
$$;

COMMENT ON FUNCTION get_next_seat_numbers(INTEGER) IS 'Aloca múltiplos números de assento consecutivos. Thread-safe. Lança exceção se não houver assentos suficientes.';

-- 4. Função para verificar disponibilidade (sem consumir números)
CREATE OR REPLACE FUNCTION check_seats_availability()
RETURNS TABLE (
    total_capacity INTEGER,
    tickets_sold INTEGER,
    tickets_available INTEGER,
    is_sold_out BOOLEAN,
    next_seat_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_value INTEGER;
    v_sold INTEGER;
    v_available INTEGER;
    v_sold_out BOOLEAN;
    v_next_seat TEXT;
BEGIN
    -- Obter valor atual da sequence (sem incrementar)
    SELECT last_value INTO v_current_value FROM ticket_seat_number_seq;
    
    -- Calcular disponibilidade
    v_sold := v_current_value;
    v_available := 1300 - v_current_value;
    v_sold_out := v_current_value >= 1300;
    
    -- Próximo número (se disponível)
    IF v_sold_out THEN
        v_next_seat := NULL;
    ELSE
        v_next_seat := LPAD((v_current_value + 1)::TEXT, 4, '0');
    END IF;
    
    RETURN QUERY SELECT
        1300::INTEGER AS total_capacity,
        v_sold AS tickets_sold,
        v_available AS tickets_available,
        v_sold_out AS is_sold_out,
        v_next_seat AS next_seat_number;
END;
$$;

COMMENT ON FUNCTION check_seats_availability() IS 'Retorna informações sobre disponibilidade de ingressos sem consumir números da sequence';

-- 5. Função para calcular receita bruta (soma de todos os tickets pagos)
CREATE OR REPLACE FUNCTION calculate_gross_revenue()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    gross_revenue NUMERIC;
BEGIN
    SELECT COALESCE(SUM(price), 0)
    INTO gross_revenue
    FROM tickets
    WHERE status IN ('active', 'confirmed', 'paid', 'issued')
    AND price IS NOT NULL;
    
    RETURN gross_revenue;
END;
$$;

COMMENT ON FUNCTION calculate_gross_revenue() IS 'Calcula receita bruta total de todos os ingressos confirmados/pagos';

-- 6. Grants de permissão
GRANT USAGE ON SEQUENCE ticket_seat_number_seq TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_next_seat_number() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_next_seat_numbers(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_seats_availability() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_gross_revenue() TO authenticated, anon;

-- =========================================
-- FIM DA CRIAÇÃO DAS FUNÇÕES
-- =========================================

