-- Corrigir política RLS da tabela product_images
-- O problema é que auth.role() está depreciado e causando violações de RLS

-- Remover política antiga que usa auth.role() depreciado
DROP POLICY IF EXISTS "Product images can be managed by authenticated users" ON public.product_images;

-- Criar nova política usando auth.uid() IS NOT NULL (método recomendado)
CREATE POLICY "Product images can be managed by authenticated users" ON public.product_images
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Verificar se a política foi criada corretamente
COMMENT ON POLICY "Product images can be managed by authenticated users" ON public.product_images IS 
'Permite que usuários autenticados gerenciem imagens de produtos. Corrigido para usar auth.uid() ao invés de auth.role() depreciado.';