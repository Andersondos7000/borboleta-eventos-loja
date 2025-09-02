-- Inserir produtos de exemplo se a tabela estiver vazia
INSERT INTO public.products (name, description, price, category, image_url, sizes, in_stock)
SELECT * FROM (
  VALUES 
    ('Camiseta Básica', 'Camiseta 100% algodão, confortável para o dia a dia', 59.90, 'camiseta', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true),
    ('Camiseta Premium', 'Camiseta premium com estampa exclusiva', 79.90, 'camiseta', 'https://images.unsplash.com/photo-1583743814966-8936f37f8302?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true),
    ('Vestido Floral', 'Vestido floral elegante para ocasiões especiais', 129.90, 'vestido', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true),
    ('Vestido Casual', 'Vestido casual perfeito para o verão', 99.90, 'vestido', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true),
    ('Calça Jeans', 'Calça jeans clássica de alta qualidade', 149.90, 'calca', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', ARRAY['36', '38', '40', '42', '44'], true),
    ('Blusa Social', 'Blusa social elegante para trabalho', 89.90, 'blusa', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true)
) AS new_products(name, description, price, category, image_url, sizes, in_stock)
WHERE NOT EXISTS (
  SELECT 1 FROM public.products WHERE name = new_products.name
);

-- Atualizar timestamp de atualização
UPDATE public.products SET updated_at = now() WHERE updated_at IS NULL;