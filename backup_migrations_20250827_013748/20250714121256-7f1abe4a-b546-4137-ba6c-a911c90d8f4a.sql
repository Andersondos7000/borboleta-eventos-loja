-- Habilitar RLS na tabela products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir que todos vejam os produtos disponíveis
CREATE POLICY "Todos podem ver produtos disponíveis" 
ON products 
FOR SELECT 
USING (in_stock = true);