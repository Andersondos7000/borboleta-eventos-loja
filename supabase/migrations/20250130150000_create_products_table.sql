-- Criar tabela products se ela não existir
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  category text,
  image_url text,
  sizes text[] DEFAULT '{}',
  in_stock boolean DEFAULT true,
  width decimal(8,2),
  length decimal(8,2),
  height decimal(8,2),
  weight decimal(8,2),
  size text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública de produtos ativos
CREATE POLICY "Products are viewable by everyone" ON public.products
  FOR SELECT USING (in_stock = true);

-- Política para inserção/atualização apenas por usuários autenticados
CREATE POLICY "Products can be managed by authenticated users" ON public.products
  FOR ALL USING (auth.role() = 'authenticated');

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at);

-- Comentários
COMMENT ON TABLE public.products IS 'Tabela de produtos do e-commerce';
COMMENT ON COLUMN public.products.image_url IS 'URL da imagem do produto';
COMMENT ON COLUMN public.products.sizes IS 'Array de tamanhos disponíveis';
COMMENT ON COLUMN public.products.in_stock IS 'Indica se o produto está em estoque';