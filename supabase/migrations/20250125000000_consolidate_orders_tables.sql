-- Consolidação das tabelas de orders - Resolver conflitos de migração
-- Esta migração resolve os conflitos entre múltiplas criações da tabela orders

-- Remover tabelas existentes se houver conflitos
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

-- Criar tabela orders consolidada com a estrutura mais completa
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL, -- Valor total do pedido
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'expired', 'processing')),
  abacate_charge_id TEXT UNIQUE, -- ID do AbacatePay
  customer_data JSONB, -- Dados do cliente
  billing_data JSONB, -- Dados de cobrança
  items JSONB, -- Items do pedido em formato JSON
  pix_qr_code_url TEXT, -- URL do QR Code PIX
  pix_copy_paste TEXT, -- Código PIX copia e cola
  payment_id TEXT, -- ID do pagamento
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela order_items para itens individuais
CREATE TABLE public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID, -- Referência flexível para produtos
  ticket_id UUID, -- Referência para ingressos
  name TEXT NOT NULL, -- Nome do item
  price NUMERIC NOT NULL, -- Preço unitário
  quantity INTEGER NOT NULL DEFAULT 1, -- Quantidade
  size TEXT, -- Tamanho (para produtos físicos)
  total NUMERIC NOT NULL, -- Total do item (price * quantity)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para orders
CREATE POLICY "Usuários podem ver seus próprios pedidos" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios pedidos" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios pedidos" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Política permissiva para webhooks (AbacatePay)
CREATE POLICY "Permitir atualização via webhook" 
ON public.orders 
FOR UPDATE 
USING (true); -- Será restringida por autenticação de API

-- Políticas RLS para order_items
CREATE POLICY "Usuários podem ver itens de seus pedidos" 
ON public.order_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem criar itens para seus pedidos" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar itens de seus pedidos" 
ON public.order_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Criar índices para performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_abacate_charge_id ON public.orders(abacate_charge_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger para atualizar updated_at na tabela orders
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.orders IS 'Tabela de pedidos consolidada - integração com AbacatePay';
COMMENT ON TABLE public.order_items IS 'Itens individuais dos pedidos';
COMMENT ON COLUMN public.orders.amount IS 'Valor total em formato decimal';
COMMENT ON COLUMN public.orders.abacate_charge_id IS 'ID único do AbacatePay para rastreamento';
COMMENT ON COLUMN public.orders.items IS 'Backup dos itens em formato JSON para compatibilidade';