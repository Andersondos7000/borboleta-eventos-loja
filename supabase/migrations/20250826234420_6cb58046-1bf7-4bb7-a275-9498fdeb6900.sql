-- Habilitar RLS em todas as tabelas que precisam
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Políticas para categories (acesso público para leitura, admin para escrita)
CREATE POLICY "Anyone can view categories" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage categories" 
ON public.categories 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Políticas para product_sizes (acesso público para leitura, admin para escrita)
CREATE POLICY "Anyone can view product sizes" 
ON public.product_sizes 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage product sizes" 
ON public.product_sizes 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Políticas para order_items (usuários podem ver seus próprios itens)
CREATE POLICY "Users can view their own order items" 
ON public.order_items 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.orders WHERE id = order_id));

CREATE POLICY "Users can manage their own order items" 
ON public.order_items 
FOR ALL 
USING (auth.uid() IN (SELECT user_id FROM public.orders WHERE id = order_id));