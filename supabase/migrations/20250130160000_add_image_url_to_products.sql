-- Adicionar coluna image_url à tabela products se ela não existir
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image_url text;

-- Comentário explicativo
COMMENT ON COLUMN public.products.image_url IS 'URL da imagem do produto';

-- Atualizar produtos existentes com URLs de exemplo se estiverem vazios
UPDATE public.products 
SET image_url = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'
WHERE image_url IS NULL OR image_url = '';