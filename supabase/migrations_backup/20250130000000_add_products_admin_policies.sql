-- Adicionar políticas RLS para permitir que admins gerenciem produtos
-- Esta migração corrige o problema onde apenas SELECT era permitido na tabela products

-- Política para permitir que admins vejam todos os produtos (não apenas os em estoque)
CREATE POLICY "Admins can view all products" 
ON products 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'organizador')
  )
);

-- Política para permitir que admins insiram novos produtos
CREATE POLICY "Admins can insert products" 
ON products 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'organizador')
  )
);

-- Política para permitir que admins atualizem produtos
CREATE POLICY "Admins can update products" 
ON products 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'organizador')
  )
);

-- Política para permitir que admins excluam produtos
CREATE POLICY "Admins can delete products" 
ON products 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'organizador')
  )
);

-- Comentário explicativo
COMMENT ON TABLE products IS 'Tabela de produtos com RLS habilitado. Usuários comuns podem ver apenas produtos em estoque, mas admins e organizadores têm acesso completo para gerenciamento.';