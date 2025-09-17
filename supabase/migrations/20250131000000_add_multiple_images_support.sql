-- Migração para suporte a múltiplas imagens de produtos
-- Criada em: 2025-01-31

-- Criar tabela para múltiplas imagens de produtos
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Product images are viewable by everyone" ON public.product_images;
DROP POLICY IF EXISTS "Product images can be managed by authenticated users" ON public.product_images;

-- Política para leitura pública de imagens de produtos
CREATE POLICY "Product images are viewable by everyone" ON public.product_images
  FOR SELECT USING (true);

-- Política para inserção/atualização apenas por usuários autenticados
CREATE POLICY "Product images can be managed by authenticated users" ON public.product_images
  FOR ALL USING (auth.role() = 'authenticated');

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON public.product_images(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON public.product_images(product_id, is_primary) WHERE is_primary = true;

-- Constraint para garantir apenas uma imagem primária por produto
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_unique_primary 
  ON public.product_images(product_id) 
  WHERE is_primary = true;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_product_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_update_product_images_updated_at ON public.product_images;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_product_images_updated_at
  BEFORE UPDATE ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION update_product_images_updated_at();

-- Migrar imagens existentes da tabela products para product_images
INSERT INTO public.product_images (product_id, image_url, is_primary, display_order)
SELECT 
  id as product_id,
  image_url,
  true as is_primary,
  0 as display_order
FROM public.products 
WHERE image_url IS NOT NULL 
  AND image_url != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.product_images 
    WHERE product_id = products.id
  );

-- Comentários
COMMENT ON TABLE public.product_images IS 'Tabela para múltiplas imagens de produtos';
COMMENT ON COLUMN public.product_images.product_id IS 'ID do produto relacionado';
COMMENT ON COLUMN public.product_images.image_url IS 'URL da imagem';
COMMENT ON COLUMN public.product_images.alt_text IS 'Texto alternativo para acessibilidade';
COMMENT ON COLUMN public.product_images.display_order IS 'Ordem de exibição das imagens';
COMMENT ON COLUMN public.product_images.is_primary IS 'Indica se é a imagem principal do produto';