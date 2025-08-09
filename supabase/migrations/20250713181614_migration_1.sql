-- Inserir produtos de exemplo (usando UUIDs gerados automaticamente)
-- Verifica se os produtos já existem antes de inserir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE name = 'Camiseta Básica') THEN
        INSERT INTO products (name, description, price, category, image_url, sizes, in_stock) VALUES
        ('Camiseta Básica', 'Camiseta 100% algodão, confortável para o dia a dia', 59.90, 'camiseta', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true),
        ('Camiseta Premium', 'Camiseta premium com estampa exclusiva', 79.90, 'camiseta', 'https://images.unsplash.com/photo-1583743814966-8936f37f8302?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true),
        ('Vestido Floral', 'Vestido floral elegante para ocasiões especiais', 129.90, 'vestido', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true),
        ('Vestido Casual', 'Vestido casual perfeito para o verão', 99.90, 'vestido', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true);
    END IF;
END $$;

-- Inserir eventos de exemplo (usando UUIDs gerados automaticamente)
-- Verifica se os eventos já existem antes de inserir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM events WHERE name = 'Show de Rock Nacional') THEN
        INSERT INTO events (name, description, date, location, price, available_tickets, image_url) VALUES
        ('Show de Rock Nacional', 'Noite incrível com as melhores bandas nacionais', '2025-08-20 20:00:00+00', 'Arena Central - São Paulo', 85.00, 500, 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400'),
        ('Festival de Música Eletrônica', 'Os melhores DJs internacionais em uma noite única', '2025-08-25 22:00:00+00', 'Club Prime - Rio de Janeiro', 120.00, 300, 'https://images.unsplash.com/photo-1571266028243-d220c9b42c9b?w=400'),
        ('Encontro de Pagode', 'Roda de pagode com os melhores grupos da cidade', '2025-08-30 19:00:00+00', 'Casa de Shows Tradição - Belo Horizonte', 45.00, 200, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400');
    END IF;
END $$;