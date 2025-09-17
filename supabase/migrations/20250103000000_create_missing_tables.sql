-- Criar tabelas que são referenciadas em outras migrações
-- tickets, customers e outras tabelas necessárias

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  cpf text,
  person_type text CHECK (person_type IN ('fisica', 'juridica')),
  company_name text,
  cnpj text,
  address text,
  address_number text,
  neighborhood text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'Brasil',
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Tabela de tickets/ingressos
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid, -- Referência para eventos (tabela pode não existir ainda)
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  ticket_type text NOT NULL,
  price decimal(10,2) NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  qr_code text,
  purchase_date timestamp with time zone DEFAULT NOW(),
  valid_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para customers
CREATE POLICY "Users can view own customer data" ON public.customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customer data" ON public.customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customer data" ON public.customers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customer data" ON public.customers
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para tickets serão criadas em migração posterior
-- quando a coluna customer_id estiver garantidamente presente

-- Índices para performance
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers(email);
-- Índice para tickets_customer_id será criado em migração posterior
CREATE INDEX IF NOT EXISTS tickets_event_id_idx ON public.tickets(event_id);

-- Nota: Triggers para updated_at serão criados em migração posterior
-- quando a função update_updated_at_column() estiver disponível

-- Comentários
COMMENT ON TABLE public.customers IS 'Dados dos clientes/compradores';
COMMENT ON TABLE public.tickets IS 'Ingressos/tickets dos eventos';