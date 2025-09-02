-- Adicionar constraint único para product_id + size na tabela product_stock
-- Isso permite o uso de upsert (ON CONFLICT) na funcionalidade de atualização de estoque

-- Primeiro, remover possíveis duplicatas existentes
DELETE FROM product_stock a USING (
  SELECT MIN(ctid) as ctid, product_id, size
  FROM product_stock 
  GROUP BY product_id, size HAVING COUNT(*) > 1
) b
WHERE a.product_id = b.product_id 
  AND a.size = b.size 
  AND a.ctid <> b.ctid;

-- Adicionar constraint único
ALTER TABLE product_stock 
ADD CONSTRAINT product_stock_product_size_unique 
UNIQUE (product_id, size);

-- Comentário para documentação
COMMENT ON CONSTRAINT product_stock_product_size_unique ON product_stock IS 
'Constraint único para permitir upsert baseado em product_id + size';