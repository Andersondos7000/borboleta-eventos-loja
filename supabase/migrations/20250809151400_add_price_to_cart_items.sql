-- Adicionar campo price à tabela cart_items

ALTER TABLE public.cart_items 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- Comentário: Esta migração adiciona o campo price à tabela cart_items
-- que é esperado pelo código do frontend, especificamente no CartContext.tsx