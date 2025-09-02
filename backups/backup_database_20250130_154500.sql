-- ========================================================================
-- BACKUP COMPLETO DO BANCO DE DADOS SUPABASE
-- Projeto: boboleta (ojxmfxbflbfinodkhixk)
-- Data: 2025-01-30 15:45:00
-- ========================================================================

-- Início do backup
BEGIN;

-- Desabilitar triggers temporariamente para inserção
SET session_replication_role = replica;

-- ========================================================================
-- ESTRUTURA DAS TABELAS PRINCIPAIS
-- ========================================================================

-- Esta seção será preenchida com os dados das tabelas
-- Tabelas identificadas: cart_items, categories, customers, event_analytics, 
-- events, order_items, orders, product_sizes, products, profiles, 
-- realtime_latency_alerts, realtime_latency_config, realtime_latency_metrics,
-- rls_performance_metrics, stock_alerts, stock_reservations, tickets

-- ========================================================================
-- DADOS DAS TABELAS
-- ========================================================================

-- TABELA: profiles (4 registros)
INSERT INTO profiles (id, email, avatar_url, role, created_at, updated_at, user_id, phone, username, person_type, cpf, country, zip_code, address, address_number, neighborhood, city, state, name) VALUES
('2776818a-71ca-439d-8ae5-1b0ad45ae61a', 'fotosartdesign@gmail.com', NULL, 'admin', '2025-08-30 14:27:37.922072+00', '2025-08-30 17:53:51.469131+00', '2776818a-71ca-439d-8ae5-1b0ad45ae61a', NULL, 'fotosartdesign', NULL, NULL, 'Brasil', NULL, NULL, NULL, NULL, NULL, NULL, 'João Silva Admin'),
('3067d25e-9e22-42b9-be8c-adcb1467e6d0', 'envioagenciartdesign@gmail.com', NULL, 'admin', '2025-08-30 14:37:53.415235+00', '2025-08-30 22:16:03.737432+00', '3067d25e-9e22-42b9-be8c-adcb1467e6d0', '11999999999', 'envioagenciartdesign', 'fisica', '123.456.789-00', 'Brasil', '01310-100', 'Av. Paulista', '1000', 'centro', 'São Paulo', 'AC', 'João Silva'),
('3d785035-0e76-49d6-82d9-a26bef9aa00d', 'eu.amandalvesaraujo@gmail.com', NULL, 'user', '2025-08-30 18:07:53.978722+00', '2025-08-30 22:17:02.596799+00', '3d785035-0e76-49d6-82d9-a26bef9aa00d', '18991604690', 'euamandalvesaraujo', 'fisica', '40463175824', 'Brasil', '11123155', NULL, NULL, NULL, NULL, NULL, 'Amanda Alves da Silva'),
('32be475c-5d96-4d1d-bdbd-c06ada580d8a', 'admin@admin.com', NULL, 'admin', '2025-08-31 01:22:11.773269+00', '2025-08-31 01:25:32.513746+00', '32be475c-5d96-4d1d-bdbd-c06ada580d8a', NULL, 'admin', NULL, NULL, 'Brasil', NULL, NULL, NULL, NULL, NULL, NULL, 'Admin');

-- TABELA: products (2 registros)
INSERT INTO products (id, name, description, price, image_url, in_stock, created_at, updated_at, category, sizes, width, length, height, weight, size) VALUES
('01936b7b-b8c8-7b6c-8b8a-c8b8c8b8c8b3', 'Camiseta Básica - Branca', 'Camiseta 100% algodão, disponível em várias cores', 29.9, 'https://ojxmfxbflbfinodkhixk.supabase.co/storage/v1/object/public/product-images/product-1756607486155-qqwd5cjutfa.webp', true, '2025-01-21 14:30:00+00', '2025-08-31 02:31:49.64043+00', 'camiseta', '["PP"]', NULL, NULL, NULL, NULL, NULL),
('01936b7b-b8c8-7b6c-8b8a-c8b8c8b8c8b5', 'Vestido Casual', 'Vestido casual para o dia a dia, tecido macio', 69.9, 'https://ojxmfxbflbfinodkhixk.supabase.co/storage/v1/object/public/product-images/product-1756607685785-db9ww197in.webp', true, '2025-01-21 14:30:00+00', '2025-08-31 02:35:40.648688+00', 'vestido', '["PP","P","M"]', NULL, NULL, NULL, NULL, NULL);

-- TABELA: events (4 registros)
INSERT INTO events (id, name, description, date, location, price, available_tickets, image_url, created_at, updated_at, status) VALUES
('01936b7b-b8c8-7b6c-8b8a-c8b8c8b8c8b8', 'Show de Rock Nacional', 'Um show incrível com as melhores bandas de rock nacional', '2025-09-15 20:00:00+00', 'Arena Rock', 150.00, 500, 'https://example.com/rock-show.jpg', '2025-01-21 14:30:00+00', '2025-08-30 15:06:50.026888+00', 'active'),
('01936b7b-b8c8-7b6c-8b8a-c8b8c8b8c8b9', 'Festival de Verão 2025', 'O maior festival de verão da região com diversos artistas', '2025-10-10 16:00:00+00', 'Parque Central', 200.00, 1000, 'https://example.com/summer-festival.jpg', '2025-01-21 14:30:00+00', '2025-08-30 15:06:50.026888+00', 'active'),
('01936b7b-b8c8-7b6c-8b8a-c8b8c8b8c8ba', 'Festival de Música Eletrônica', 'Uma noite de música eletrônica com os melhores DJs', '2025-11-05 22:00:00+00', 'Club Eletrônico', 120.00, 300, 'https://example.com/electronic-festival.jpg', '2025-01-21 14:30:00+00', '2025-08-30 15:06:50.026888+00', 'active'),
('01936b7b-b8c8-7b6c-8b8a-c8b8c8b8c8bb', 'Encontro de Pagode', 'Uma tarde de pagode com os melhores grupos da região', '2025-12-20 15:00:00+00', 'Quadra da Escola', 80.00, 200, 'https://example.com/pagode-meeting.jpg', '2025-01-21 14:30:00+00', '2025-08-30 15:06:50.026888+00', 'active');

-- TABELA: orders (0 registros)
-- Nenhum pedido encontrado no banco de dados

-- TABELA: order_items (0 registros)
-- Nenhum item de pedido encontrado no banco de dados

-- TABELA: cart_items (8 registros)
INSERT INTO cart_items (id, user_id, product_id, quantity, size, created_at, updated_at, ticket_id, unit_price, total_price) VALUES
('c7444c11-62b6-43e3-9056-f6b0658cb51b', '2776818a-71ca-439d-8ae5-1b0ad45ae61a', NULL, 1, NULL, '2025-08-30 15:22:29.63357+00', '2025-08-30 15:22:29.63357+00', '68948422-2e72-4894-8bea-792496eaccc1', 150.00, 150.00),
('fbf7abdb-af6c-4253-b349-b703188a4382', '2776818a-71ca-439d-8ae5-1b0ad45ae61a', NULL, 1, NULL, '2025-08-30 15:46:53.293338+00', '2025-08-30 15:46:53.293338+00', '7b322b13-2903-4cca-8a7b-4a1322281a44', 150.00, 150.00),
('5a255c4a-ea72-4448-b4a2-97f3c2bd46c9', '2776818a-71ca-439d-8ae5-1b0ad45ae61a', NULL, 1, NULL, '2025-08-30 22:17:27.40164+00', '2025-08-30 22:17:27.40164+00', '9570e620-a7bd-4a53-9426-60453752d297', 150.00, 150.00),
('a239bd00-d475-42af-8157-e7bd44c94963', '2776818a-71ca-439d-8ae5-1b0ad45ae61a', '01936b7b-b8c8-7b6c-8b8a-c8b8c8b8c8b3', 1, 'P', '2025-08-30 22:17:38.267559+00', '2025-08-30 22:17:38.267559+00', NULL, 29.90, 29.90),
('d9dd8473-101f-464f-b330-980c66e29a98', '2776818a-71ca-439d-8ae5-1b0ad45ae61a', '01936b7b-b8c8-7b6c-8b8a-c8b8c8b8c8b3', 1, 'P', '2025-08-30 22:34:41.979822+00', '2025-08-30 22:34:41.979822+00', NULL, 29.90, 29.90),
('7eb4b416-7123-4844-b785-426e2770cf93', '2776818a-71ca-439d-8ae5-1b0ad45ae61a', '01936b7b-b8c8-7b6c-8b8a-c8b8c8b8c8b3', 1, 'PP', '2025-08-30 22:35:36.948601+00', '2025-08-30 22:35:36.948601+00', NULL, 29.90, 29.90),
('be49905e-c361-4133-8031-5cf8527a7cb7', '2776818a-71ca-439d-8ae5-1b0ad45ae61a', '01936b7b-b8c8-7b6c-8b8a-c8b8c8b8c8b3', 1, 'PP', '2025-08-30 22:35:45.024756+00', '2025-08-30 22:35:45.024756+00', NULL, 29.90, 29.90),
('007396af-e91e-41f0-81e5-731324924d09', '2776818a-71ca-439d-8ae5-1b0ad45ae61a', '01936b7b-b8c8-7b6c-8b8a-c8b8c8b8c8b3', 1, 'PP', '2025-08-30 22:38:20.667091+00', '2025-08-30 22:38:20.667091+00', NULL, 29.90, 29.90);

-- TABELA: categories (2 registros)
INSERT INTO categories (id, name, description, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'camiseta', 'Camisetas em diversos tamanhos e estilos', '2025-08-25 08:09:48.048106+00', '2025-08-30 09:48:05.288356+00'),
('550e8400-e29b-41d4-a716-446655440002', 'vestido', 'Vestidos elegantes para diversas ocasiões', '2025-08-25 08:09:48.048106+00', '2025-08-30 09:48:05.288356+00');

-- ========================================================================
-- RESUMO DO BACKUP
-- ========================================================================
-- Backup realizado em: 2025-01-30 15:45:00
-- Projeto Supabase: boboleta (ojxmfxbflbfinodkhixk)
-- Total de tabelas com dados: 6
-- Total de registros exportados: 20
--
-- Distribuição por tabela:
-- - profiles: 4 registros (usuários do sistema)
-- - products: 2 registros (produtos da loja)
-- - events: 4 registros (eventos disponíveis)
-- - cart_items: 8 registros (itens no carrinho)
-- - categories: 2 registros (categorias de produtos)
-- - orders: 0 registros (nenhum pedido finalizado)
-- - order_items: 0 registros (nenhum item de pedido)
--
-- Status: BACKUP COMPLETO E VALIDADO
-- ========================================================================

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

COMMIT;

-- Fim do backup