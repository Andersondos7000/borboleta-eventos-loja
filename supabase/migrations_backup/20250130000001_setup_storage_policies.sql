-- Configurar políticas RLS para o bucket product-images
-- Esta migração permite que administradores façam upload de imagens de produtos

-- Criar bucket product-images se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que admins façam upload de imagens
CREATE POLICY "Admins can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'organizador')
  )
);

-- Política para permitir que admins atualizem imagens
CREATE POLICY "Admins can update product images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'organizador')
  )
);

-- Política para permitir que admins excluam imagens
CREATE POLICY "Admins can delete product images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'organizador')
  )
);

-- Política para permitir que todos vejam as imagens (leitura pública)
CREATE POLICY "Public can view product images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

-- Comentário explicativo
COMMENT ON POLICY "Admins can upload product images" ON storage.objects IS 'Permite que administradores e organizadores façam upload de imagens de produtos';
COMMENT ON POLICY "Public can view product images" ON storage.objects IS 'Permite visualização pública das imagens de produtos';