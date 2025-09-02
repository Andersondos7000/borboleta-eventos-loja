-- Inserir categorias básicas
INSERT INTO public.categories (id, name, description) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'camiseta', 'Camisetas em diversos tamanhos e estilos'),
('550e8400-e29b-41d4-a716-446655440002', 'vestido', 'Vestidos elegantes para diversas ocasiões')
ON CONFLICT (name) DO NOTHING;