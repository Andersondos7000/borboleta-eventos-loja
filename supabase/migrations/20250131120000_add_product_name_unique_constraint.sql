-- Adicionar constraint único para nome do produto
-- Isso impedirá a criação de produtos com nomes duplicados

-- Primeiro, vamos verificar se há produtos duplicados existentes
DO $$
BEGIN
    -- Se houver produtos duplicados, vamos numerá-los
    UPDATE public.products 
    SET name = name || ' (' || row_number() OVER (PARTITION BY name ORDER BY created_at) || ')'
    WHERE id IN (
        SELECT id FROM (
            SELECT id, name, 
                   row_number() OVER (PARTITION BY name ORDER BY created_at) as rn
            FROM public.products
        ) t WHERE rn > 1
    );
END $$;

-- Agora adicionar a constraint de unicidade
ALTER TABLE public.products 
ADD CONSTRAINT products_name_unique UNIQUE (name);

-- Comentário sobre a constraint
COMMENT ON CONSTRAINT products_name_unique ON public.products IS 
'Constraint único para impedir duplicação de produtos com o mesmo nome';

-- Índice para performance em consultas por nome
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);