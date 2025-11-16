-- =====================================================
-- CONTROLE AUTOMÁTICO DE ESTOQUE
-- =====================================================
-- Data: 15 de Novembro de 2025
-- Descrição: Trigger para atualizar stock_quantity automaticamente
--           quando pedidos são pagos

-- =====================================================
-- 1. FUNÇÃO: Atualizar estoque baseado em order_items
-- =====================================================

CREATE OR REPLACE FUNCTION update_product_stock_on_order_paid()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    -- Só executa se o status mudou para 'paid'
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status 
       AND NEW.payment_status = 'paid' THEN
        
        RAISE LOG 'Atualizando estoque para pedido % (status: % -> %)', 
                  NEW.id, OLD.payment_status, NEW.payment_status;
        
        -- Iterar sobre todos os order_items do pedido que tem product_id
        FOR item IN 
            SELECT oi.product_id, oi.quantity, p.name, p.stock_quantity
            FROM order_items oi
            INNER JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = NEW.id 
            AND oi.product_id IS NOT NULL
        LOOP
            -- Buscar estoque atual do produto
            current_stock := item.stock_quantity;
            
            -- Calcular novo estoque (decrementar quantidade vendida)
            new_stock := GREATEST(0, current_stock - item.quantity);
            
            -- Atualizar stock_quantity do produto
            UPDATE products 
            SET 
                stock_quantity = new_stock,
                in_stock = (new_stock > 0),
                updated_at = NOW()
            WHERE id = item.product_id;
            
            RAISE LOG 'Estoque atualizado: Produto % (%): % -> % unidades', 
                      item.name, item.product_id, current_stock, new_stock;
        END LOOP;
        
        RAISE LOG 'Estoque atualizado com sucesso para pedido %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. TRIGGER: Executar atualização de estoque
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_stock_on_order_paid ON orders;

CREATE TRIGGER trigger_update_stock_on_order_paid
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock_on_order_paid();

-- =====================================================
-- 3. FUNÇÃO: Restaurar estoque quando pedido é cancelado
-- =====================================================

CREATE OR REPLACE FUNCTION restore_product_stock_on_order_cancelled()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    -- Só executa se o status mudou para 'cancelled' e antes estava 'paid'
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status 
       AND NEW.payment_status = 'cancelled' 
       AND OLD.payment_status = 'paid' THEN
        
        RAISE LOG 'Restaurando estoque para pedido cancelado % (status: % -> %)', 
                  NEW.id, OLD.payment_status, NEW.payment_status;
        
        -- Iterar sobre todos os order_items do pedido que tem product_id
        FOR item IN 
            SELECT oi.product_id, oi.quantity, p.name, p.stock_quantity
            FROM order_items oi
            INNER JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = NEW.id 
            AND oi.product_id IS NOT NULL
        LOOP
            -- Buscar estoque atual do produto
            current_stock := item.stock_quantity;
            
            -- Calcular novo estoque (incrementar quantidade cancelada)
            new_stock := current_stock + item.quantity;
            
            -- Atualizar stock_quantity do produto
            UPDATE products 
            SET 
                stock_quantity = new_stock,
                in_stock = TRUE,
                updated_at = NOW()
            WHERE id = item.product_id;
            
            RAISE LOG 'Estoque restaurado: Produto % (%): % -> % unidades', 
                      item.name, item.product_id, current_stock, new_stock;
        END LOOP;
        
        RAISE LOG 'Estoque restaurado com sucesso para pedido %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. TRIGGER: Executar restauração de estoque
-- =====================================================

DROP TRIGGER IF EXISTS trigger_restore_stock_on_order_cancelled ON orders;

CREATE TRIGGER trigger_restore_stock_on_order_cancelled
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION restore_product_stock_on_order_cancelled();

-- =====================================================
-- 5. FUNÇÃO: Validar estoque antes de criar pedido
-- =====================================================

CREATE OR REPLACE FUNCTION validate_stock_before_order(
    p_items JSONB
) RETURNS TABLE(
    product_id UUID,
    product_name TEXT,
    requested_quantity INTEGER,
    available_stock INTEGER,
    has_stock BOOLEAN
) AS $$
DECLARE
    item JSONB;
    product RECORD;
BEGIN
    -- Iterar sobre cada item do pedido
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Buscar informações do produto
        SELECT 
            p.id,
            p.name,
            p.stock_quantity,
            (item->>'quantity')::INTEGER as requested,
            (p.stock_quantity >= (item->>'quantity')::INTEGER) as has_enough
        INTO product
        FROM products p
        WHERE p.id = (item->>'product_id')::UUID;
        
        IF product.id IS NOT NULL THEN
            RETURN QUERY SELECT 
                product.id,
                product.name,
                product.requested,
                product.stock_quantity,
                product.has_enough;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. COMENTÁRIOS E ÍNDICES
-- =====================================================

COMMENT ON FUNCTION update_product_stock_on_order_paid() IS 
'Decrementa automaticamente o stock_quantity quando um pedido é pago';

COMMENT ON FUNCTION restore_product_stock_on_order_cancelled() IS 
'Restaura o stock_quantity quando um pedido pago é cancelado';

COMMENT ON FUNCTION validate_stock_before_order(JSONB) IS 
'Valida se há estoque suficiente para os produtos antes de criar um pedido';

-- Criar índice para melhorar performance nas queries de order_items
CREATE INDEX IF NOT EXISTS idx_order_items_product_id 
ON order_items(product_id) 
WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
ON orders(payment_status);

-- =====================================================
-- 7. LOG DE MIGRAÇÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Controle automático de estoque configurado com sucesso!';
    RAISE NOTICE '   - Trigger para decrementar estoque quando pedido é pago';
    RAISE NOTICE '   - Trigger para restaurar estoque quando pedido é cancelado';
    RAISE NOTICE '   - Função para validar estoque antes de criar pedidos';
    RAISE NOTICE '   - Índices criados para melhor performance';
END $$;

