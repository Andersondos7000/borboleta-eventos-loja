-- Adicionar constraint único para nome do produto
-- Isso impedirá a criação de produtos com nomes duplicados

-- Primeiro, vamos verificar se há produtos duplicados existentes
DO $$
DECLARE
    dup_name RECORD;
    prod_rec RECORD;
    counter INTEGER;
    original_name TEXT;
BEGIN
    -- Para cada nome duplicado, numerar os produtos
    FOR dup_name IN 
        SELECT name, COUNT(*) as cnt 
        FROM public.products 
        GROUP BY name 
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        original_name := dup_name.name;
        -- Atualizar produtos duplicados um por um
        FOR prod_rec IN 
            SELECT id FROM public.products 
            WHERE name = original_name 
            ORDER BY created_at
        LOOP
            IF counter > 1 THEN
                UPDATE public.products 
                SET name = original_name || ' (' || counter || ')'
                WHERE id = prod_rec.id;
            END IF;
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- Agora adicionar a constraint de unicidade
ALTER TABLE public.products 
ADD CONSTRAINT products_name_unique UNIQUE (name);

-- Comentário sobre a constraint
COMMENT ON CONSTRAINT products_name_unique ON public.products IS 
'Constraint único para impedir duplicação de produtos com o mesmo nome';

-- Índice para performance em consultas por nome
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);