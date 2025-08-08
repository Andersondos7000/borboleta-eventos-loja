-- Criar tabela orders para armazenar pedidos
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Valor em centavos
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
  abacate_charge_id TEXT UNIQUE,
  customer_data JSONB,
  billing_data JSONB,
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam seus próprios pedidos
CREATE POLICY "Usuários podem ver seus próprios pedidos" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para permitir inserção de pedidos (temporariamente permissiva para testes)
CREATE POLICY "Permitir inserção de pedidos" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir atualização de pedidos via webhook
CREATE POLICY "Permitir atualização de pedidos" 
ON public.orders 
FOR UPDATE 
USING (true);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_abacate_charge_id ON public.orders(abacate_charge_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();