-- Script para verificar e criar tabelas faltantes no Supabase

-- 1. Verificar quais tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'events', 'tickets', 'cart_items', 'profiles', 'orders');

-- 2. Criar tabela profiles se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela products se não existir
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    sizes TEXT[] DEFAULT '{}',
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar tabela events se não existir
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    available_tickets INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Criar tabela tickets se não existir
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Criar tabela cart_items se não existir
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    size TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas básicas
-- Profiles: usuários podem ver e editar apenas seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Products: todos podem ver produtos disponíveis
CREATE POLICY "Everyone can view available products" ON public.products
    FOR SELECT USING (in_stock = true);

-- Events: todos podem ver eventos
CREATE POLICY "Everyone can view events" ON public.events
    FOR SELECT USING (true);

-- Tickets: usuários podem ver e gerenciar seus próprios tickets
CREATE POLICY "Users can view own tickets" ON public.tickets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets" ON public.tickets
    FOR UPDATE USING (auth.uid() = user_id);

-- Cart items: usuários podem ver e gerenciar seus próprios itens do carrinho
CREATE POLICY "Users can view own cart items" ON public.cart_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items" ON public.cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items" ON public.cart_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items" ON public.cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Criar triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Inserir dados de exemplo
INSERT INTO public.products (name, description, price, category, image_url, sizes, in_stock) VALUES
('Camiseta Básica', 'Camiseta 100% algodão, confortável para o dia a dia', 59.90, 'camiseta', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true),
('Camiseta Premium', 'Camiseta premium com estampa exclusiva', 79.90, 'camiseta', 'https://images.unsplash.com/photo-1583743814966-8936f37f8302?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true),
('Vestido Floral', 'Vestido floral elegante para ocasiões especiais', 129.90, 'vestido', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true),
('Vestido Casual', 'Vestido casual perfeito para o verão', 99.90, 'vestido', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', ARRAY['PP', 'P', 'M', 'G', 'GG'], true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events (name, description, date, location, price, available_tickets, image_url) VALUES
('Show de Rock Nacional', 'Noite incrível com as melhores bandas nacionais', '2025-08-15 20:00:00+00', 'Arena Central - São Paulo', 85.00, 500, 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400'),
('Festival de Música Eletrônica', 'Os melhores DJs internacionais em uma noite única', '2025-08-20 22:00:00+00', 'Club Prime - Rio de Janeiro', 120.00, 300, 'https://images.unsplash.com/photo-1571266028243-d220c9b42c9b?w=400'),
('Encontro de Pagode', 'Roda de pagode com os melhores grupos da cidade', '2025-08-25 19:00:00+00', 'Casa de Shows Tradição - Belo Horizonte', 45.00, 200, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400')
ON CONFLICT (id) DO NOTHING;